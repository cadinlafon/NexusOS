// The time engine: the one place that works out which class is happening.
//
//   date and time → the person's classes → today's schedule entries → the class in session
//
// Pure functions over SchoolData, with no React and no clock of their own, so
// the student desktop, NEXUS Classroom and (later) a server all get the same
// answer for the same inputs.

import { type AppId } from '../types/nexus'
import {
  type ClassWebsite,
  type SchoolClass,
  type SchoolData,
  type SchoolSubject,
  type ScheduleEntry,
  type Teacher,
} from './types'

export const WEEKDAYS = [
  { id: 1, short: 'Mon', name: 'Monday' },
  { id: 2, short: 'Tue', name: 'Tuesday' },
  { id: 3, short: 'Wed', name: 'Wednesday' },
  { id: 4, short: 'Thu', name: 'Thursday' },
  { id: 5, short: 'Fri', name: 'Friday' },
]

/** One meeting of a class, with everything about it resolved. */
export interface ClassSession {
  entry: ScheduleEntry
  class: SchoolClass
  subject: SchoolSubject
  teacher: Teacher | undefined
  room: string
  /** Minutes after midnight. */
  start: number
  end: number
}

const minutesOf = (date: Date) => date.getHours() * 60 + date.getMinutes()

export const classesForStudent = (school: SchoolData, studentId: string) =>
  school.classes.filter((cls) => cls.studentIds.includes(studentId))

export const classesForTeacher = (school: SchoolData, teacherId: string) =>
  school.classes.filter((cls) => cls.teacherId === teacherId)

function toSession(school: SchoolData, entry: ScheduleEntry): ClassSession | null {
  const cls = school.classes.find((c) => c.id === entry.classId)
  const subject = cls && school.subjects.find((s) => s.id === cls.subjectId)
  if (!cls || !subject) return null
  return {
    entry,
    class: cls,
    subject,
    teacher: school.teachers.find((t) => t.id === cls.teacherId),
    room: entry.room || cls.room,
    start: entry.start,
    end: entry.end,
  }
}

/** The given classes' sessions on the day of `date`, earliest first. */
export function sessionsOn(school: SchoolData, classes: SchoolClass[], date: Date): ClassSession[] {
  const ids = new Set(classes.map((cls) => cls.id))
  return school.schedule
    .filter((entry) => entry.day === date.getDay() && ids.has(entry.classId))
    .map((entry) => toSession(school, entry))
    .filter((session): session is ClassSession => session !== null)
    .sort((a, b) => a.start - b.start)
}

export const sessionAt = (sessions: ClassSession[], dateTime: Date) => {
  const now = minutesOf(dateTime)
  return sessions.find((session) => now >= session.start && now < session.end) ?? null
}

export const sessionsAfter = (sessions: ClassSession[], dateTime: Date) => {
  const now = minutesOf(dateTime)
  return sessions.filter((session) => session.start > now)
}

/** A student's timetable for the day of `date`, from the classes they are enrolled in. */
export const studentSchedule = (school: SchoolData, studentId: string, date: Date) =>
  sessionsOn(school, classesForStudent(school, studentId), date)

export const teacherSchedule = (school: SchoolData, teacherId: string, date: Date) =>
  sessionsOn(school, classesForTeacher(school, teacherId), date)

/** The class a student should be in at `dateTime`, or null for no current class. */
export const getCurrentClass = (school: SchoolData, studentId: string, dateTime: Date) =>
  sessionAt(studentSchedule(school, studentId, dateTime), dateTime)

/** The student's next class later the same day, or null. */
export const getNextClass = (school: SchoolData, studentId: string, dateTime: Date) =>
  sessionsAfter(studentSchedule(school, studentId, dateTime), dateTime)[0] ?? null

/** The applications a class recommends: its own list, or its subject's. */
export function classApps(school: SchoolData, cls: SchoolClass): AppId[] {
  return cls.appIds ?? school.subjects.find((s) => s.id === cls.subjectId)?.appIds ?? []
}

/** A class's websites: its subject's, then its own, without repeats. */
export function classWebsites(school: SchoolData, cls: SchoolClass): ClassWebsite[] {
  const subject = school.subjects.find((s) => s.id === cls.subjectId)
  const seen = new Set<string>()
  return [...(subject?.websites ?? []), ...cls.websites].filter((site) => !seen.has(site.url) && seen.add(site.url))
}

export function formatTime(minutes: number) {
  const hour = Math.floor(minutes / 60)
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
}

export const formatSpan = (start: number, end: number) => `${formatTime(start)} – ${formatTime(end)}`

/** "Mon–Fri · 9:00 AM – 9:55 AM", one line per distinct time. */
export function describeSchedule(school: SchoolData, classId: string): string[] {
  const byTime = new Map<string, number[]>()
  for (const entry of school.schedule.filter((e) => e.classId === classId)) {
    const key = formatSpan(entry.start, entry.end)
    byTime.set(key, [...(byTime.get(key) ?? []), entry.day])
  }
  return [...byTime].map(([time, days]) => {
    const sorted = [...new Set(days)].sort()
    const consecutive = sorted.every((day, i) => i === 0 || day === sorted[i - 1] + 1)
    const short = (day: number) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]
    const label =
      consecutive && sorted.length > 2
        ? `${short(sorted[0])}–${short(sorted[sorted.length - 1])}`
        : sorted.map(short).join(', ')
    return `${label} · ${time}`
  })
}

/** The school period a class usually meets in, if its entries agree on one. */
export function classPeriod(school: SchoolData, classId: string): number | null {
  const periods = new Set(school.schedule.filter((e) => e.classId === classId).map((e) => e.period))
  const [only] = [...periods]
  return periods.size === 1 && only !== undefined ? only : null
}
