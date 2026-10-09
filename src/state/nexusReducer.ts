import { defaultInstalledApps } from '../data/apps'
import {
  createAnnouncements,
  createAssignments,
  createConversations,
  createDocuments,
  createNotifications,
  defaultSimulatedTime,
  students,
  testSession,
} from '../data/mockData'
import { createSchoolSeed } from '../school/seed'
import { loadJSON, saveJSON } from '../services/storage'
import {
  ALL_APP_IDS,
  type AccessRequest,
  type Announcement,
  type AppId,
  type Assignment,
  type AssignmentStatus,
  type Conversation,
  type DocumentDraft,
  type NewNotification,
  type NexusNotification,
  type PermissionState,
  type SettingsSectionId,
  type SystemStatus,
  type View,
} from '../types/nexus'

/** Everything about the student's session that can change. */
export interface NexusState {
  studentId: string
  view: View
  activeAssignmentId: string | null
  activeConversationId: string | null
  assignments: Assignment[]
  documents: Record<string, DocumentDraft>
  conversations: Conversation[]
  announcements: Announcement[]
  notifications: NexusNotification[]
  /** Developer Preview overrides on top of the base policy, keyed `kind:id`. */
  permissionOverrides: Record<string, PermissionState>
  /** Decisions the teacher has made for the class, through NEXUS Classroom. These win. */
  classroomOverrides: Record<string, PermissionState>
  accessRequests: AccessRequest[]
  /** The target the restriction dialog is currently explaining, if any. */
  restriction: { key: string; label: string } | null
  testMode: boolean
  /** "HH:MM" when the clock is simulated; null follows the real time. */
  timeOverride: string | null
  /** A subject id or "none" to force the current class; null follows the schedule. */
  classOverride: string | null
  /** Apps installed on this device (prototype state only). */
  installedApps: AppId[]
  /** Simulated hardware status for the top bar. */
  system: SystemStatus
  /** Which Settings category is showing. */
  settingsSection: SettingsSectionId
  /** The app whose details the App Library is showing, if any. */
  catalogFocus: AppId | null
  /** Apps the student pinned; shown first in the dock. */
  favorites: AppId[]
  /** Most recently opened apps, newest first. */
  recents: AppId[]
  /** An app that could not be started, with the reason, for the launch dialog. */
  launchNotice: { appId: AppId; message: string } | null
  /** Counter for locally generated ids. */
  seq: number
}

export type NexusAction =
  | { type: 'navigate'; view: View }
  | { type: 'setAssignmentStatus'; id: string; status: AssignmentStatus; time: string }
  | { type: 'addAssignment'; assignment: Omit<Assignment, 'id'>; subjectName: string; time: string }
  /** Work set for the student's classes in NEXUS Classroom. Already-known ids are skipped. */
  | { type: 'syncSchoolAssignments'; assignments: Assignment[]; subjectNames: Record<string, string>; notify: boolean; time: string }
  | { type: 'updateDocument'; key: string; draft: DocumentDraft }
  | { type: 'openConversation'; id: string }
  | { type: 'sendMessage'; conversationId: string; text: string; time: string }
  | { type: 'receiveMessage'; from: { name: string; initials: string; subjectId: string }; text: string; time: string }
  | { type: 'notify'; notification: NewNotification; time: string }
  | { type: 'markRead'; id: string }
  | { type: 'markAllRead' }
  | { type: 'setPermission'; key: string; state: PermissionState | null }
  | { type: 'requestAccess'; key: string; label: string; time: string }
  | { type: 'resolveAccessRequest'; key: string; label: string; approved: boolean; time: string }
  | { type: 'applyClassroom'; testMode: boolean; permissions: Record<string, PermissionState>; time: string }
  | { type: 'showRestriction'; key: string; label: string }
  | { type: 'dismissRestriction' }
  | { type: 'setTestMode'; on: boolean; time: string }
  | { type: 'setTimeOverride'; value: string | null }
  | { type: 'setClassOverride'; value: string | null }
  | { type: 'setStudent'; id: string }
  | { type: 'setInstalled'; id: AppId; installed: boolean }
  | { type: 'setSystem'; patch: Partial<SystemStatus> }
  | { type: 'setSettingsSection'; section: SettingsSectionId }
  | { type: 'setCatalogFocus'; id: AppId | null }
  | { type: 'toggleFavorite'; id: AppId }
  | { type: 'recordLaunch'; id: AppId }
  | { type: 'setLaunchNotice'; notice: NexusState['launchNotice'] }
  | { type: 'reset' }

/* ---------- Persistence ---------- */

const STORAGE_KEY = 'nexus.session'

/** The slice of state that survives a refresh. Everything else restarts from the seed data. */
interface PersistedState {
  studentId: string
  installedApps: AppId[]
  favorites: AppId[]
  recents: AppId[]
  permissionOverrides: Record<string, PermissionState>
  readNotificationIds: string[]
  testMode: boolean
  timeOverride: string | null
  classOverride: string | null
  system: SystemStatus
}

export function persistState(state: NexusState) {
  const persisted: PersistedState = {
    studentId: state.studentId,
    installedApps: state.installedApps,
    favorites: state.favorites,
    recents: state.recents,
    permissionOverrides: state.permissionOverrides,
    readNotificationIds: state.notifications.filter((n) => n.read).map((n) => n.id),
    testMode: state.testMode,
    timeOverride: state.timeOverride,
    classOverride: state.classOverride,
    system: state.system,
  }
  saveJSON(STORAGE_KEY, persisted)
}

export const SESSION_STORAGE_KEY = STORAGE_KEY

const RECENT_LIMIT = 8

// Saved lists can name apps that have since left the registry; drop those.
// NEXUS AI was registered as "ai" before 0.9; carry saved references over.
const known = (ids: AppId[] | undefined) =>
  ids
    ?.map((id) => ((id as string) === 'ai' ? 'nexus-ai' : id))
    .filter((id) => (ALL_APP_IDS as readonly string[]).includes(id))

const knownKeys = <T,>(overrides: Record<string, T> | undefined) =>
  overrides &&
  Object.fromEntries(Object.entries(overrides).map(([key, value]) => [key === 'app:ai' ? 'app:nexus-ai' : key, value]))

export const createInitialState = (): NexusState => {
  const saved: Partial<PersistedState> = loadJSON<PersistedState>(STORAGE_KEY) ?? {}
  const readIds = saved.readNotificationIds

  return {
    studentId: saved.studentId ?? students[0].id,
    view: { kind: 'page', id: 'dashboard' },
    activeAssignmentId: 'a1',
    activeConversationId: null,
    assignments: createAssignments(),
    documents: createDocuments(),
    conversations: createConversations(),
    announcements: createAnnouncements(),
    notifications: createNotifications().map((n) => (readIds ? { ...n, read: readIds.includes(n.id) } : n)),
    permissionOverrides: knownKeys(saved.permissionOverrides) ?? {},
    classroomOverrides: {},
    accessRequests: [],
    restriction: null,
    testMode: saved.testMode ?? false,
    timeOverride: saved.timeOverride === undefined ? defaultSimulatedTime : saved.timeOverride,
    classOverride: saved.classOverride ?? null,
    installedApps: known(saved.installedApps) ?? defaultInstalledApps(),
    system: saved.system ?? { battery: 78, wifi: 'connected' },
    settingsSection: 'appearance',
    catalogFocus: null,
    favorites: known(saved.favorites) ?? ['browser', 'docs', 'files'],
    recents: known(saved.recents) ?? [],
    launchNotice: null,
    seq: 1,
  }
}

/** Adds a notification to the top of the history. */
const withNotification = (state: NexusState, notification: NewNotification, time: string): NexusState => ({
  ...state,
  notifications: [{ ...notification, id: `local-${state.seq}`, time, read: false }, ...state.notifications],
  seq: state.seq + 1,
})

const seedSubjects = createSchoolSeed().subjects
const subjectName = (id: string) => seedSubjects.find((s) => s.id === id)?.name ?? 'your class'

export function nexusReducer(state: NexusState, action: NexusAction): NexusState {
  switch (action.type) {
    case 'navigate':
      return {
        ...state,
        view: action.view,
        activeAssignmentId: action.view.kind === 'assignment' ? action.view.id : state.activeAssignmentId,
      }

    case 'setAssignmentStatus': {
      const assignment = state.assignments.find((a) => a.id === action.id)
      if (!assignment || assignment.status === action.status) return state
      const next: NexusState = {
        ...state,
        assignments: state.assignments.map((a) => (a.id === action.id ? { ...a, status: action.status } : a)),
      }
      if (action.status !== 'submitted') return next
      return withNotification(
        next,
        {
          type: 'assignment_submitted',
          title: 'Assignment submitted',
          body: `“${assignment.title}” was handed in.`,
          target: { kind: 'assignment', id: assignment.id },
        },
        action.time,
      )
    }

    case 'addAssignment': {
      const id = `local-a${state.seq}`
      return withNotification(
        { ...state, assignments: [...state.assignments, { ...action.assignment, id }] },
        {
          type: 'new_assignment',
          title: 'New assignment',
          body: `“${action.assignment.title}” has been assigned to you in ${action.subjectName}.`,
          target: { kind: 'assignment', id },
        },
        action.time,
      )
    }

    case 'syncSchoolAssignments': {
      const fresh = action.assignments.filter((a) => !state.assignments.some((known) => known.id === a.id))
      if (fresh.length === 0) return state
      let next: NexusState = { ...state, assignments: [...state.assignments, ...fresh] }
      if (action.notify) {
        for (const assignment of fresh) {
          next = withNotification(
            next,
            {
              type: 'new_assignment',
              title: 'New assignment',
              body: `“${assignment.title}” has been assigned to you in ${action.subjectNames[assignment.subjectId] ?? 'your class'}.`,
              target: { kind: 'assignment', id: assignment.id },
            },
            action.time,
          )
        }
      }
      return next
    }

    case 'updateDocument':
      return { ...state, documents: { ...state.documents, [action.key]: action.draft } }

    case 'openConversation':
      return {
        ...state,
        activeConversationId: action.id,
        conversations: state.conversations.map((c) => (c.id === action.id ? { ...c, unread: 0 } : c)),
      }

    case 'sendMessage':
      return {
        ...state,
        seq: state.seq + 1,
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  { id: `local-m${state.seq}`, from: 'student', text: action.text, time: action.time },
                ],
              }
            : c,
        ),
      }

    case 'receiveMessage': {
      // Messages thread by teacher; a teacher who hasn't written before gets a new conversation.
      const existing = state.conversations.find((c) => c.teacher === action.from.name)
      const conversation: Conversation = existing ?? {
        id: `local-c${state.seq}`,
        teacher: action.from.name,
        initials: action.from.initials,
        subjectId: action.from.subjectId,
        unread: 0,
        messages: [],
      }
      // Already looking at this conversation: it arrives read.
      const watching =
        state.view.kind === 'page' &&
        state.view.id === 'messages' &&
        state.activeConversationId === conversation.id
      const updated: Conversation = {
        ...conversation,
        unread: watching ? 0 : conversation.unread + 1,
        messages: [
          ...conversation.messages,
          { id: `local-m${state.seq}`, from: 'teacher', text: action.text, time: action.time },
        ],
      }
      const next: NexusState = {
        ...state,
        seq: state.seq + 1,
        conversations: existing
          ? state.conversations.map((c) => (c.id === updated.id ? updated : c))
          : [updated, ...state.conversations],
      }
      return withNotification(
        next,
        {
          type: 'teacher_message',
          title: `Message from ${conversation.teacher}`,
          body: action.text,
          target: { kind: 'conversation', id: conversation.id },
        },
        action.time,
      )
    }

    case 'notify':
      return withNotification(state, action.notification, action.time)

    case 'markRead':
      return {
        ...state,
        notifications: state.notifications.map((n) => (n.id === action.id ? { ...n, read: true } : n)),
      }

    case 'markAllRead':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) }

    case 'setPermission': {
      const overrides = { ...state.permissionOverrides }
      if (action.state === null) delete overrides[action.key]
      else overrides[action.key] = action.state
      return { ...state, permissionOverrides: overrides }
    }

    case 'requestAccess':
      if (state.accessRequests.some((request) => request.key === action.key)) return state
      return {
        ...state,
        accessRequests: [...state.accessRequests, { key: action.key, label: action.label, time: action.time }],
      }

    case 'resolveAccessRequest':
      return withNotification(
        { ...state, accessRequests: state.accessRequests.filter((request) => request.key !== action.key) },
        {
          type: 'system',
          title: action.approved ? 'Access approved' : 'Access not approved',
          body: action.approved
            ? `Your teacher approved ${action.label}.`
            : `Your teacher didn’t approve ${action.label} this time.`,
        },
        action.time,
      )

    case 'applyClassroom': {
      const next: NexusState = { ...state, classroomOverrides: action.permissions }
      // Starting or ending a test goes through the usual path, notification included.
      return nexusReducer(next, { type: 'setTestMode', on: action.testMode, time: action.time })
    }

    case 'showRestriction':
      return { ...state, restriction: { key: action.key, label: action.label } }

    case 'dismissRestriction':
      return { ...state, restriction: null }

    case 'setTestMode': {
      if (state.testMode === action.on) return state
      const test = `${subjectName(testSession.subjectId)}: ${testSession.title}`
      return withNotification(
        { ...state, testMode: action.on },
        {
          type: 'system',
          title: action.on ? 'Test Mode started' : 'Test Mode ended',
          body: action.on
            ? `${test}. Some apps are paused until the test ends.`
            : 'Your apps are available again.',
        },
        action.time,
      )
    }

    case 'setTimeOverride':
      return { ...state, timeOverride: action.value }

    case 'setClassOverride':
      return { ...state, classOverride: action.value }

    case 'setStudent':
      return { ...state, studentId: action.id }

    case 'setInstalled': {
      const others = state.installedApps.filter((id) => id !== action.id)
      return { ...state, installedApps: action.installed ? [...others, action.id] : others }
    }

    case 'setSystem':
      return { ...state, system: { ...state.system, ...action.patch } }

    case 'setSettingsSection':
      return { ...state, settingsSection: action.section }

    case 'setCatalogFocus':
      return { ...state, catalogFocus: action.id }

    case 'toggleFavorite':
      return {
        ...state,
        favorites: state.favorites.includes(action.id)
          ? state.favorites.filter((id) => id !== action.id)
          : [...state.favorites, action.id],
      }

    case 'recordLaunch':
      return {
        ...state,
        recents: [action.id, ...state.recents.filter((id) => id !== action.id)].slice(0, RECENT_LIMIT),
      }

    case 'setLaunchNotice':
      return { ...state, launchNotice: action.notice }

    case 'reset':
      return createInitialState()
  }
}
