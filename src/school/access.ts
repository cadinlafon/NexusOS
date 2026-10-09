// Who may change what in the school model, and what a class's policy stops.
// Kept apart from the UI so an administrator role and the future policy
// engine can replace these rules without touching any screen.

import { getApp } from '../data/apps'
import { type AppId } from '../types/nexus'
import { type ClassPolicy, type SchoolClass, type SchoolData, type SchoolSubject } from './types'

/** Teachers manage the classes they teach. */
export const canManageClass = (teacherId: string, cls: SchoolClass) => cls.teacherId === teacherId

/** Teachers manage subjects they created or teach a class in. School-wide subjects they don't teach are read-only. */
export const canManageSubject = (teacherId: string, subject: SchoolSubject, school: SchoolData) =>
  subject.ownerId === teacherId ||
  school.classes.some((cls) => cls.subjectId === subject.id && cls.teacherId === teacherId)

/** The policy of the class in session, as the permission check needs it. */
export interface ClassRule {
  className: string
  policy: ClassPolicy
  /** The class's own applications. */
  appIds: AppId[]
}

// Never blocked by a class: the student must always be able to reach these.
const ALWAYS_AVAILABLE: AppId[] = ['settings', 'catalog']

/** Whether the class in session blocks this permission key (`app:…`). */
export function blockedByClass(key: string, rule: ClassRule): boolean {
  if (!key.startsWith('app:')) return false
  const id = key.slice(4) as AppId
  if (ALWAYS_AVAILABLE.includes(id)) return false
  const app = getApp(id)
  if (!app) return false

  const { policy } = rule
  if (policy.ai === 'blocked' && id === 'nexus-ai') return true
  if (policy.browser === 'blocked' && id === 'browser') return true
  if (policy.internet === 'blocked' && (id === 'browser' || app.type === 'web')) return true
  if (policy.applications === 'blocked' && !rule.appIds.includes(id)) return true
  return false
}
