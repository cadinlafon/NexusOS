// What travels between a student desktop and the teacher view, through the
// classroom relay. Shared by both sides so they cannot drift apart.

import { type AccessRequest, type AppId, type AssignmentStatus, type PermissionState } from '../types/nexus'

/** Where the development relay listens: inside the NEXUS dev server itself. */
export const RELAY_URL = '/__classroom'

/** What the teacher has set for the whole class. */
export interface ClassState {
  testMode: boolean
  /** Permission decisions by key (`app:…`, `site:…`), on top of school policy. */
  permissions: Record<string, PermissionState>
}

/** A student desktop's report of what is happening on it. */
export interface StudentPresence {
  id: string
  name: string
  initials: string
  /** The page showing in the workspace, e.g. "Dashboard". */
  viewing: string
  currentClass: string | null
  /** The id of the class in session, from the school model. */
  currentClassId: string | null
  openApps: AppId[]
  activeApp: AppId | null
  /** The active NEXUS Browser tab, when the browser is open on a page. */
  browser: { title: string; url: string } | null
  testMode: boolean
  accessRequests: AccessRequest[]
  assignments: { id: string; title: string; status: AssignmentStatus }[]
  updatedAt: string
}

/** A snapshot of a student's NEXUS desktop, for screen viewing. */
export interface ScreenSnapshot {
  /** The student it came from. */
  id: string
  /** A self-contained copy of the desktop page. */
  html: string
  width: number
  height: number
}

export type RosterEntry = StudentPresence & { online: boolean }

/** One-off instructions from the teacher to student desktops. */
export type ClassCommand =
  | { type: 'openUrl'; url: string }
  | { type: 'message'; from: { name: string; initials: string; subjectId: string }; text: string }
  | { type: 'accessDecision'; key: string; label: string; approved: boolean }
