// The school model: who teaches what, to whom, and when.
//
//   School → Subject → Class → Students
//                        └─→ Schedule
//
// A subject is the academic subject (Mathematics). A class is one group of
// students taught that subject by one teacher at set times (Math — Period 3).
// Students get their timetable from the classes they are enrolled in; nobody
// builds a schedule per student.
//
// Both NEXUS Classroom (which edits this) and the student desktop (which
// reads it) use these types.

import { type AppId } from '../types/nexus'

export type SubjectIconId =
  | 'flask'
  | 'calculator'
  | 'code'
  | 'book'
  | 'landmark'
  | 'globe'
  | 'palette'
  | 'music'
  | 'leaf'
  | 'dumbbell'

/** `school` defers to school policy; the others are the teacher's own choice for the class. */
export type PolicyChoice = 'school' | 'allowed' | 'blocked'

/** What a class allows while it is in session. Kept small on purpose. */
export interface ClassPolicy {
  /** NEXUS Browser. */
  browser: PolicyChoice
  /** `blocked` means only the class's own applications may be opened. */
  applications: PolicyChoice
  /** NEXUS AI. */
  ai: PolicyChoice
  /** The browser and every web application. */
  internet: PolicyChoice
}

export interface ClassWebsite {
  name: string
  url: string
  description: string
}

export interface Teacher {
  id: string
  name: string
  initials: string
}

export interface SchoolSubject {
  id: string
  name: string
  description: string
  icon: SubjectIconId
  color: string
  /** Applications recommended for any class in this subject. Ids from the app registry. */
  appIds: AppId[]
  websites: ClassWebsite[]
  /** The policy new classes in this subject start with. */
  defaultPolicy: ClassPolicy
  /** The teacher who created it, or null for a subject the school provides. */
  ownerId: string | null
}

export interface SchoolClass {
  id: string
  subjectId: string
  name: string
  description: string
  teacherId: string
  grade: string
  room: string
  /** Enrolment: ids from the school's student directory. */
  studentIds: string[]
  /** The class's own application list, or null to use the subject's. */
  appIds: AppId[] | null
  /** Websites for this class, in addition to the subject's. */
  websites: ClassWebsite[]
  policy: ClassPolicy
  /** Optional overrides of the subject's look. */
  color?: string
  icon?: SubjectIconId
}

/** One timetabled meeting of a class. Times are minutes after midnight. */
export interface ScheduleEntry {
  id: string
  classId: string
  /** 0 (Sunday) to 6 (Saturday), as Date.getDay(). */
  day: number
  start: number
  end: number
  /** Only when it differs from the class's usual room. */
  room?: string
  /** The school period this fills, when it lines up with one. */
  period?: number
}

/** The school's bell times. Entries may follow these or use their own times. */
export interface Period {
  number: number
  start: number
  end: number
}

/** Work set for a class. Each enrolled student gets it; progress is tracked per student. */
export interface SchoolAssignment {
  id: string
  classId: string
  title: string
  description: string
  instructions: string[]
  assignedDate: string
  dueDate: string
  recommendedApp: AppId
}

export interface SchoolData {
  /** Goes up with every change, so the newest copy can be told apart. */
  revision: number
  teachers: Teacher[]
  periods: Period[]
  subjects: SchoolSubject[]
  classes: SchoolClass[]
  schedule: ScheduleEntry[]
  assignments: SchoolAssignment[]
}
