// Shared domain types for NEXUS. Everything the desktop knows about the
// student's day is described here, once.

export const ALL_APP_IDS = [
  'browser',
  'docs',
  'files',
  'notes',
  'calendar',
  'calculator',
  'terminal',
  'nexus-ai',
  'settings',
  'catalog',
  'vscode',
  'git',
  'python',
  'node',
  'android-studio',
  'canva',
  'desmos',
  'geogebra',
  'github',
  'school-portal',
  'discord',
  'steam',
] as const

export type AppId = (typeof ALL_APP_IDS)[number]

/**
 * What an application may ask the system for. Declared per app in the
 * registry; school policy decides which of them are actually granted.
 */
export type AppCapability =
  | 'internet'
  | 'files.read'
  | 'files.write'
  | 'camera'
  | 'microphone'
  | 'notifications'
  | 'clipboard'
  | 'system.launch'
  | 'developer.tools'

export type PageId =
  | 'dashboard'
  | 'announcements'
  | 'assignments'
  | 'messages'
  | 'files'
  | 'calendar'

/** What the centre workspace is showing. */
export type View =
  | { kind: 'page'; id: PageId }
  | { kind: 'subject'; id: string }
  | { kind: 'assignment'; id: string }

export interface Student {
  id: string
  name: string
  firstName: string
  initials: string
  role: string
  grade: string
  studentNumber: string
}

export interface Subject {
  id: string
  name: string
  teacher: string
  /** Accent colour used for the subject's indicator. */
  color: string
}

export interface ClassPeriod {
  id: string
  /** The class from the school model that this period belongs to. */
  classId: string
  className: string
  subjectId: string
  /** Minutes after midnight. */
  start: number
  end: number
  room: string
}

export type AssignmentStatus = 'not_started' | 'in_progress' | 'submitted'

export interface Assignment {
  id: string
  title: string
  subjectId: string
  description: string
  instructions: string[]
  /** ISO timestamps. */
  assignedDate: string
  dueDate: string
  status: AssignmentStatus
  recommendedApp: AppId
  allowedApps: AppId[]
  allowedWebsites: string[]
}

export interface Announcement {
  id: string
  title: string
  body: string
  from: string
  date: string
}

export interface ChatMessage {
  id: string
  from: 'teacher' | 'student'
  text: string
  time: string
}

export interface Conversation {
  id: string
  teacher: string
  initials: string
  subjectId: string
  unread: number
  messages: ChatMessage[]
}

export type NotificationType =
  | 'new_assignment'
  | 'due_soon'
  | 'teacher_message'
  | 'announcement'
  | 'class_starting'
  | 'assignment_submitted'
  | 'system'

/** Where opening a notification takes the student. */
export type NotificationTarget =
  | { kind: 'assignment'; id: string }
  | { kind: 'conversation'; id: string }
  | { kind: 'page'; id: PageId }

export interface NexusNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  time: string
  read: boolean
  target?: NotificationTarget
}

export type NewNotification = Omit<NexusNotification, 'id' | 'time' | 'read'>

export interface SchoolEvent {
  id: string
  title: string
  detail: string
  date: string
}

export interface Site {
  id: string
  label: string
  /** Hostname this site covers, including its subdomains. */
  host: string
}

export type PermissionState = 'allowed' | 'restricted' | 'blocked' | 'teacher_required'

export interface ResolvedPermission {
  state: PermissionState
  /** Why: the standing school policy, a running test, or the policy of the class in session. */
  reason: 'policy' | 'test_mode' | 'class_policy'
}

export interface AccessRequest {
  key: string
  label: string
  time: string
}

export interface TestSession {
  title: string
  subjectId: string
  allowedApps: AppId[]
  allowedSites: string[]
  restrictedPages: PageId[]
}

/** Simulated hardware status shown in the top bar. */
export interface SystemStatus {
  /** 0–100 */
  battery: number
  wifi: 'connected' | 'weak' | 'offline'
}

export type SettingsSectionId =
  | 'account'
  | 'appearance'
  | 'notifications'
  | 'applications'
  | 'ai'
  | 'network'
  | 'privacy'
  | 'accessibility'
  | 'devices'
  | 'policies'
  | 'about'
  | 'developer'

export interface DocumentDraft {
  title: string
  body: string
}

/** One thing on the calendar, built from the schedule, assignments or events. */
export interface CalendarItem {
  id: string
  kind: 'class' | 'assignment' | 'event'
  title: string
  detail: string
  color: string
  assignmentId?: string
}

export interface ActiveClass {
  period: ClassPeriod
  subject: Subject
}

/**
 * The NEXUS Context: a plain snapshot of what the student is doing right now.
 * Anything that needs to reason about the moment (NEXUS AI, eventually) reads
 * this instead of reaching into individual features.
 */
export interface NexusContextSnapshot {
  student: Student
  time: Date
  simulatedTime: boolean
  currentClass: ActiveClass | null
  nextClass: ActiveClass | null
  activeSubject: Subject | null
  currentAssignment: Assignment | null
  recommendedApps: AppId[]
  allowedApps: AppId[]
  testMode: TestSession | null
  unreadNotifications: NexusNotification[]
  dueSoon: Assignment[]
}
