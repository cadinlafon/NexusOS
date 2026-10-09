import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { postToRelay } from '../classroom/relayClient'
import { type RosterEntry } from '../classroom/types'
import { useNow } from '../hooks/useNow'
import { createSchoolSeed } from '../school/seed'
import { classesForTeacher } from '../school/timeEngine'
import { type SchoolClass, type SchoolData, type Teacher } from '../school/types'
import { loadJSON, saveJSON } from '../services/storage'
import { useSettings } from '../state/SettingsContext'
import { useClassroom } from './useClassroom'

export type TeacherPage =
  | 'dashboard'
  | 'classes'
  | 'subjects'
  | 'students'
  | 'schedule'
  | 'assignments'
  | 'messages'
  | 'ai'
  | 'applications'
  | 'settings'

export type TeacherView =
  | { page: TeacherPage }
  | { page: 'class'; classId: string }
  | { page: 'subject'; subjectId: string }

/** This teacher view's own preferences. Not part of the school model. */
interface TeacherPrefs {
  /** The example teacher whose classes this account manages, until there is a real school database. */
  teacherId: string
  /** "HH:MM" while the clock is simulated; null follows the real time. */
  timeOverride: string | null
}

const PREFS_KEY = 'nexus.teacher'
const defaultPrefs: TeacherPrefs = { teacherId: 'lindqvist', timeOverride: '09:20' }

interface TeacherValue extends TeacherPrefs {
  teacher: Teacher
  /** The theme showing. Shared with the rest of NEXUS. */
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
  setPrefs: (patch: Partial<TeacherPrefs>) => void

  /** The school model. Every change goes through `update`, which saves and shares it. */
  school: SchoolData
  update: (change: (school: SchoolData) => SchoolData) => void
  resetSchool: () => void
  myClasses: SchoolClass[]

  now: Date
  view: TeacherView
  go: (view: TeacherView) => void

  classroom: ReturnType<typeof useClassroom>
  /** The live report from a student's desktop, if it is connected. */
  online: (studentId: string) => RosterEntry | undefined

  /** A short confirmation shown at the top of the screen. */
  confirm: (message: string) => void
  confirmation: string
}

const TeacherContext = createContext<TeacherValue | null>(null)

export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`

export function TeacherProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<TeacherPrefs>(() => ({ ...defaultPrefs, ...loadJSON<TeacherPrefs>(PREFS_KEY) }))
  const setPrefs = useCallback((patch: Partial<TeacherPrefs>) => setPrefsState((current) => ({ ...current, ...patch })), [])
  useEffect(() => saveJSON(PREFS_KEY, prefs), [prefs])
  const { resolvedTheme, update: updateSettings } = useSettings()

  const [school, setSchool] = useState(createSchoolSeed)
  const latest = useRef(school)
  latest.current = school

  const classroom = useClassroom(prefs.teacherId, (fromRelay) => {
    // The relay keeps the school model. If it has none yet, give it ours.
    if (fromRelay) setSchool(fromRelay)
    else postToRelay('school', latest.current)
  })

  const update = useCallback((change: (school: SchoolData) => SchoolData) => {
    const next = { ...change(latest.current), revision: latest.current.revision + 1 }
    latest.current = next
    setSchool(next)
    postToRelay('school', next)
  }, [])

  const realNow = useNow()
  const now = useMemo(() => {
    if (!prefs.timeOverride) return realNow
    const [hours, minutes] = prefs.timeOverride.split(':').map(Number)
    const simulated = new Date(realNow)
    simulated.setHours(hours, minutes, 0, 0)
    return simulated
  }, [realNow, prefs.timeOverride])

  const [view, go] = useState<TeacherView>({ page: 'dashboard' })

  const [confirmation, setConfirmation] = useState('')
  useEffect(() => {
    if (!confirmation) return
    const id = window.setTimeout(() => setConfirmation(''), 4000)
    return () => window.clearTimeout(id)
  }, [confirmation])

  const teacher = school.teachers.find((t) => t.id === prefs.teacherId) ?? school.teachers[0]

  const value: TeacherValue = {
    ...prefs,
    teacher,
    theme: resolvedTheme,
    setTheme: (theme) => updateSettings({ theme }),
    setPrefs,
    school,
    update,
    resetSchool: () => update(() => ({ ...createSchoolSeed(), revision: latest.current.revision })),
    myClasses: classesForTeacher(school, teacher.id),
    now,
    view,
    go,
    classroom,
    online: (studentId) => classroom.roster.find((entry) => entry.online && entry.id === studentId),
    confirm: setConfirmation,
    confirmation,
  }

  return <TeacherContext.Provider value={value}>{children}</TeacherContext.Provider>
}

export function useTeacher() {
  const value = useContext(TeacherContext)
  if (!value) throw new Error('useTeacher must be used inside a TeacherProvider')
  return value
}
