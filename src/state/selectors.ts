// Pure helpers that derive answers from NEXUS state. No React in here, so the
// same logic can back the UI, the NEXUS Context and, later, a real service.

import { testSession } from '../data/mockData'
import { policyFor } from '../policy/schoolPolicy'
import { blockedByClass, type ClassRule } from '../school/access'
import {
  type ActiveClass,
  type AppId,
  type Assignment,
  type AssignmentStatus,
  type CalendarItem,
  type ClassPeriod,
  type PermissionState,
  type ResolvedPermission,
  type SchoolEvent,
  type Subject,
} from '../types/nexus'

/* ---------- Time ---------- */

export const minutesOf = (date: Date) => date.getHours() * 60 + date.getMinutes()

export function formatMinutes(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  const suffix = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${suffix}`
}

export const formatPeriod = (period: ClassPeriod) =>
  `${formatMinutes(period.start)} – ${formatMinutes(period.end)}`

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime()

const dayDifference = (from: Date, to: Date) =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000)

export function relativeTime(iso: string, now = new Date()) {
  const then = new Date(iso)
  const minutes = Math.round((now.getTime() - then.getTime()) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const days = dayDifference(then, now)
  if (days === 0) return `${Math.floor(minutes / 60)}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return then.toLocaleDateString('en-US', { weekday: 'long' })
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* ---------- Schedule ---------- */

export const periodStatus = (period: ClassPeriod, current: ClassPeriod | null, nowMinutes: number) =>
  current?.id === period.id
    ? 'current'
    : (current ? period.start < current.start : period.end <= nowMinutes)
      ? 'done'
      : 'upcoming'

export const findPeriodAt = (periods: ClassPeriod[], minutes: number) =>
  periods.find((period) => minutes >= period.start && minutes < period.end) ?? null

export const toActiveClass = (period: ClassPeriod | null, subjects: Subject[]): ActiveClass | null => {
  const subject = period && subjects.find((s) => s.id === period.subjectId)
  return period && subject ? { period, subject } : null
}

/* ---------- Assignments ---------- */

export const statusLabels: Record<AssignmentStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted: 'Submitted',
}

export function dueLabel(dueDate: string, now: Date) {
  const due = new Date(dueDate)
  const days = dayDifference(now, due)
  if (days < 0) return 'Overdue'
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days < 7) return `Due ${due.toLocaleDateString('en-US', { weekday: 'long' })}`
  return `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

const isOpen = (assignment: Assignment) => assignment.status !== 'submitted'

const byDueDate = (a: Assignment, b: Assignment) => a.dueDate.localeCompare(b.dueDate)

export const openAssignments = (assignments: Assignment[]) => assignments.filter(isOpen).sort(byDueDate)

/** Unsubmitted work due within the next two days (or already late). */
export const dueSoon = (assignments: Assignment[], now: Date) =>
  openAssignments(assignments).filter((a) => dayDifference(now, new Date(a.dueDate)) <= 2)

export const dueThisWeek = (assignments: Assignment[], now: Date) =>
  openAssignments(assignments).filter((a) => dayDifference(now, new Date(a.dueDate)) <= 7)

/**
 * The assignment the student is most likely working on: the one they have
 * open, otherwise one for the class in session, otherwise whatever is due next.
 */
export function pickCurrentAssignment(
  assignments: Assignment[],
  activeId: string | null,
  subjectId: string | undefined,
) {
  const open = openAssignments(assignments)
  return (
    open.find((a) => a.id === activeId && a.status === 'in_progress') ??
    open.find((a) => a.subjectId === subjectId) ??
    open.find((a) => a.id === activeId) ??
    open[0] ??
    null
  )
}

/* ---------- Calendar ---------- */

interface CalendarSources {
  /** The student's classes on a given day, from the time engine. */
  periodsFor: (day: Date) => ClassPeriod[]
  subjects: Subject[]
  assignments: Assignment[]
  events: SchoolEvent[]
}

/** Everything on one day, built from the schedule, assignments and events. */
export function calendarItemsForDay(day: Date, sources: CalendarSources): CalendarItem[] {
  const subject = (id: string) => sources.subjects.find((s) => s.id === id)

  const classes = sources.periodsFor(day).map<CalendarItem>((period) => ({
    id: `class-${period.id}`,
    kind: 'class',
    title: subject(period.subjectId)?.name ?? 'Class',
    detail: `${formatMinutes(period.start)} · ${period.room}`,
    color: subject(period.subjectId)?.color ?? 'var(--accent)',
  }))

  return [...classes, ...calendarMarkersForDay(day, sources)]
}

/** Just the day's deadlines and events (classes happen every day). */
export function calendarMarkersForDay(day: Date, sources: CalendarSources): CalendarItem[] {
  const subject = (id: string) => sources.subjects.find((s) => s.id === id)

  const due = sources.assignments
    .filter((assignment) => isSameDay(new Date(assignment.dueDate), day))
    .map<CalendarItem>((assignment) => ({
      id: `assignment-${assignment.id}`,
      kind: 'assignment',
      title: assignment.title,
      detail: `Due · ${subject(assignment.subjectId)?.name ?? ''} · ${statusLabels[assignment.status]}`,
      color: subject(assignment.subjectId)?.color ?? 'var(--accent)',
      assignmentId: assignment.id,
    }))

  const events = sources.events
    .filter((event) => isSameDay(new Date(event.date), day))
    .map<CalendarItem>((event) => ({
      id: `event-${event.id}`,
      kind: 'event',
      title: event.title,
      detail: event.detail,
      color: 'var(--accent)',
    }))

  return [...due, ...events]
}

/* ---------- Permissions ---------- */

export const permissionKey = (kind: 'app' | 'site' | 'page' | 'system', id: string) => `${kind}:${id}`

export const permissionLabels: Record<PermissionState, string> = {
  allowed: 'Allowed',
  restricted: 'Restricted',
  blocked: 'Blocked',
  teacher_required: 'Teacher required',
}

/**
 * The one place permissions are decided. A running test overrides everything,
 * then the policy of the class in session;
 * otherwise a Developer Preview override wins over the school's policy
 * (policy/schoolPolicy.ts).
 */
export function resolvePermission(
  key: string,
  overrides: Record<string, PermissionState>,
  testMode: boolean,
  classRule?: ClassRule | null,
): ResolvedPermission {
  if (testMode) {
    const [kind, id] = key.split(':')
    const blocked: ResolvedPermission = { state: 'blocked', reason: 'test_mode' }
    if (kind === 'app') {
      return testSession.allowedApps.includes(id as AppId) ? { state: 'allowed', reason: 'test_mode' } : blocked
    }
    if (kind === 'site') {
      return testSession.allowedSites.includes(id) ? { state: 'allowed', reason: 'test_mode' } : blocked
    }
    if (kind === 'page' && (testSession.restrictedPages as string[]).includes(id)) return blocked
  }
  // The class in session can switch things off for its duration.
  if (classRule && blockedByClass(key, classRule)) return { state: 'blocked', reason: 'class_policy' }
  return { state: overrides[key] ?? policyFor(key), reason: 'policy' }
}

/* ---------- Application status ---------- */

/** What the App Library shows for an app: its install state combined with school policy. */
export type AppStatus = 'installed' | 'available' | 'disabled' | 'blocked' | 'requires_approval'

export const appStatusLabels: Record<AppStatus, string> = {
  installed: 'Installed',
  available: 'Available',
  disabled: 'Disabled',
  blocked: 'Blocked',
  requires_approval: 'Requires school approval',
}

export function appStatus(installed: boolean, permission: ResolvedPermission): AppStatus {
  switch (permission.state) {
    case 'blocked':
      // A test or a class pauses apps; only school policy bans them.
      return permission.reason === 'policy' ? 'blocked' : 'disabled'
    case 'teacher_required':
      return 'requires_approval'
    case 'restricted':
      return 'disabled'
    case 'allowed':
      return installed ? 'installed' : 'available'
  }
}
