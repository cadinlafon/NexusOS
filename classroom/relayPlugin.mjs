// The NEXUS Classroom relay: a development-only stand-in for the future NEXUS
// Classroom service. It runs inside the NEXUS dev server (/__classroom) and
// passes messages between the teacher view and student desktops.
//
// It does not check who is calling: it has no idea which Firebase account, or
// which role, a request comes from. That is acceptable only because it is a
// development stand-in on one computer. The real service must verify the
// caller's Firebase ID token and role on the server.
//
//   student desktop --presence-->  relay  --roster-->   teacher view
//   student desktop <--state/command--  relay  <--state/command-- teacher view
//   student desktop --screen-->    relay  --screen-->   the teacher watching it
//
// It also keeps the school model (subjects, classes, enrolment, schedule) that
// teachers edit, saves it to classroom/.data/school.json so it survives a
// restart, and gives it to every desktop that connects.
//
// Nothing is authenticated. It only accepts
// requests from pages served on this computer. It is not a real backend.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCHOOL_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '.data/school.json')

const loadSchool = () => {
  try {
    if (!existsSync(SCHOOL_FILE)) return null
    // NEXUS AI was registered as "ai" before 0.9. The policy field named
    // "ai" is a key (followed by a colon) and is left alone.
    return JSON.parse(readFileSync(SCHOOL_FILE, 'utf8').replace(/"ai"(?!\s*:)/g, '"nexus-ai"'))
  } catch {
    return null
  }
}

const saveSchool = (school) => {
  try {
    mkdirSync(dirname(SCHOOL_FILE), { recursive: true })
    writeFileSync(SCHOOL_FILE, JSON.stringify(school, null, 2))
  } catch (error) {
    console.warn('[classroom relay] could not save the school model:', error.message)
  }
}

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk) => (raw += chunk))
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'))
      } catch {
        resolve({})
      }
    })
  })

export function classroomRelay() {
  /** Open event streams: response -> { role, id } */
  const streams = new Map()
  /** The latest report from each student, by student id. */
  const presence = new Map()
  /** What the teacher has set for the whole class. New students receive it on connecting. */
  let classState = { testMode: false, permissions: {} }
  /** The school model. Null until a teacher view provides one. */
  let school = loadSchool()
  /** Screen viewing: teacher id -> the student id that teacher is watching. */
  const watching = new Map()

  const send = (res, event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

  const each = (role, action) => {
    for (const [res, info] of streams) if (info.role === role) action(res, info)
  }

  const roster = () => {
    const online = new Set([...streams.values()].filter((s) => s.role === 'student').map((s) => s.id))
    return [...presence.values()].map((p) => ({ ...p, online: online.has(p.id) }))
  }
  const broadcastRoster = () => each('teacher', (res) => send(res, 'roster', roster()))

  const isWatched = (studentId) => [...watching.values()].includes(studentId)
  // Students are always told whether their screen is being viewed.
  const tellWatched = (studentId) =>
    each('student', (res, info) => {
      if (info.id === studentId) send(res, 'watch', { watching: isWatched(studentId) })
    })

  const handler = async (req, res) => {
    const origin = req.headers.origin
    if (origin && !LOCAL_ORIGIN.test(origin)) {
      res.statusCode = 403
      return res.end()
    }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      return res.end()
    }

    const url = new URL(req.url, 'http://localhost')

    if (req.method === 'GET' && url.pathname === '/events') {
      const role = url.searchParams.get('role') === 'teacher' ? 'teacher' : 'student'
      const id = url.searchParams.get('id') ?? ''
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })
      streams.set(res, { role, id })
      send(res, 'state', classState)
      // Sent even when null, so a teacher view knows to supply the starting school.
      send(res, 'school', school)
      if (role === 'teacher') send(res, 'roster', roster())
      else {
        send(res, 'watch', { watching: isWatched(id) })
        each('teacher', (teacher) => send(teacher, 'roster', roster()))
      }

      // Keeps proxies and browsers from closing an idle stream.
      const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 20000)
      req.on('close', () => {
        clearInterval(heartbeat)
        streams.delete(res)
        if (role === 'student') broadcastRoster()
        // A teacher who leaves stops watching.
        else if (![...streams.values()].some((s) => s.role === 'teacher' && s.id === id)) {
          const studentId = watching.get(id)
          watching.delete(id)
          if (studentId) tellWatched(studentId)
        }
      })
      return
    }

    if (req.method === 'POST') {
      const body = await readBody(req)
      if (url.pathname === '/presence' && typeof body.id === 'string') {
        presence.set(body.id, body)
        broadcastRoster()
      } else if (url.pathname === '/school' && Array.isArray(body.classes)) {
        school = body
        saveSchool(school)
        for (const [stream] of streams) send(stream, 'school', school)
      } else if (url.pathname === '/state') {
        classState = { testMode: !!body.testMode, permissions: body.permissions ?? {} }
        for (const [stream] of streams) send(stream, 'state', classState)
      } else if (url.pathname === '/watch' && typeof body.teacherId === 'string') {
        // studentId null stops watching.
        const previous = watching.get(body.teacherId)
        if (body.studentId) watching.set(body.teacherId, body.studentId)
        else watching.delete(body.teacherId)
        if (previous) tellWatched(previous)
        if (body.studentId) tellWatched(body.studentId)
      } else if (url.pathname === '/screen' && typeof body.id === 'string') {
        // Only forwarded to teachers who are watching this student right now.
        each('teacher', (teacher, info) => {
          if (watching.get(info.id) === body.id) send(teacher, 'screen', body)
        })
      } else if (url.pathname === '/command') {
        // target: "all", one student id, or a list of student ids
        const targets = Array.isArray(body.target) ? body.target : [body.target]
        each('student', (student, info) => {
          if (targets.includes('all') || targets.includes(info.id)) send(student, 'command', body.command)
        })
      } else {
        res.statusCode = 404
        return res.end()
      }
      res.statusCode = 204
      return res.end()
    }

    res.statusCode = 404
    res.end()
  }

  return {
    name: 'nexus-classroom-relay',
    configureServer(server) {
      server.middlewares.use('/__classroom', handler)
    },
  }
}
