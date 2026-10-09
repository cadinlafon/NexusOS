import { useProfile } from '../auth/AuthProvider'
import { initialsOf } from '../auth/types'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { browser, useBrowser } from '../browser/BrowserManager'
import { createSchoolPolicy } from '../browser/policy'
import { type ClassCommand, type ClassState } from '../classroom/types'
import { useStudentLink } from '../classroom/useStudentLink'
import { getApp } from '../data/apps'
import {
  assignmentTemplates,
  schoolEvents,
  students,
  teacherMessageTemplates,
  testSession,
} from '../data/mockData'
import { useNow } from '../hooks/useNow'
import { type ClassRule } from '../school/access'
import { createSchoolSeed } from '../school/seed'
import { loadSchool, migrateSchool, saveSchool } from '../school/store'
import {
  classApps,
  classesForStudent,
  classWebsites,
  studentSchedule,
  type ClassSession,
} from '../school/timeEngine'
import { type ClassWebsite, type SchoolData } from '../school/types'
import { viewTitle } from '../navigation'
import { planLaunch } from '../services/launchService'
import { launchNativeApp } from '../services/nativeRuntime'
import { removeStored } from '../services/storage'
import {
  ALL_APP_IDS,
  type ActiveClass,
  type AppId,
  type Assignment,
  type AssignmentStatus,
  type ClassPeriod,
  type DocumentDraft,
  type NewNotification,
  type NexusContextSnapshot,
  type NexusNotification,
  type PermissionState,
  type ResolvedPermission,
  type SettingsSectionId,
  type SystemStatus,
  type SchoolEvent,
  type Student,
  type Subject,
  type View,
} from '../types/nexus'
import { useWindowManager } from '../windows/WindowManagerContext'
import {
  createInitialState,
  nexusReducer,
  persistState,
  SESSION_STORAGE_KEY,
  type NexusState,
} from './nexusReducer'
import {
  dueSoon,
  findPeriodAt,
  minutesOf,
  permissionKey,
  pickCurrentAssignment,
  resolvePermission,
  toActiveClass,
} from './selectors'

const stamp = () => new Date().toISOString()

interface NexusValue extends NexusState {
  /* Reference data */
  student: Student
  subjects: Subject[]
  schedule: ClassPeriod[]
  events: SchoolEvent[]

  /** The school model: subjects, classes, enrolment and the timetable. */
  school: SchoolData
  /** This student's classes on any day, from the time engine. */
  periodsFor: (day: Date) => ClassPeriod[]
  /** The class in session with its teacher and room, or null. */
  currentSession: ClassSession | null
  /** Websites the class in session recommends. */
  classSites: ClassWebsite[]

  /* Derived from state + time */
  now: Date
  currentClass: ActiveClass | null
  upcomingClasses: ActiveClass[]
  recommendedApps: AppId[]
  currentAssignment: Assignment | null
  unreadNotifications: NexusNotification[]
  unreadMessages: number
  /** Apps with a window open, from the window manager. */
  openApps: AppId[]
  /** True while a teacher view is linked to this desktop through NEXUS Classroom. */
  classroomConnected: boolean
  /** True while a teacher has this desktop's screen open. */
  screenWatched: boolean
  /** The NEXUS Context snapshot (see types/nexus.ts). */
  context: NexusContextSnapshot

  getSubject: (id: string) => Subject | undefined
  getAssignment: (id: string) => Assignment | undefined
  getPermission: (key: string) => ResolvedPermission

  /* Actions */
  navigate: (view: View) => void
  openAssignment: (id: string) => void
  setAssignmentStatus: (id: string, status: AssignmentStatus) => void
  /** Starts the assignment if needed and opens its recommended app. */
  workOnAssignment: (id: string) => void
  /** The student's own documents, by key. */
  documents: Record<string, DocumentDraft>
  updateDocument: (key: string, draft: DocumentDraft) => void
  /**
   * The App Manager's single entry point. Opens the app if it is installed
   * and allowed; otherwise shows the restriction or its App Catalog page.
   */
  launchApp: (id: AppId) => void
  isInstalled: (id: AppId) => boolean
  toggleFavorite: (id: AppId) => void
  dismissLaunchNotice: () => void
  installApp: (id: AppId) => void
  uninstallApp: (id: AppId) => void
  /** Opens Settings, optionally at a category. */
  openSettings: (section?: SettingsSectionId) => void
  setSettingsSection: (section: SettingsSectionId) => void
  /** Opens the App Catalog, optionally at one app's details. */
  openCatalog: (id?: AppId) => void
  setCatalogFocus: (id: AppId | null) => void
  showRestriction: (key: string, label: string) => void
  dismissRestriction: () => void
  requestAccess: (key: string, label: string) => void
  openConversation: (id: string) => void
  sendMessage: (conversationId: string, text: string) => void
  notify: (notification: NewNotification) => void
  openNotification: (notification: NexusNotification) => void
  markAllRead: () => void

  /* Developer Preview */
  dev: {
    setStudent: (id: string) => void
    setTimeOverride: (value: string | null) => void
    setClassOverride: (value: string | null) => void
    setTestMode: (on: boolean) => void
    setPermission: (key: string, state: PermissionState | null) => void
    setSystem: (patch: Partial<SystemStatus>) => void
    assignNewWork: () => void
    deliverTeacherMessage: () => void
    reset: () => void
  }
}

const NexusContext = createContext<NexusValue | null>(null)

export function NexusProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(nexusReducer, undefined, createInitialState)
  const windowManager = useWindowManager()
  const realNow = useNow()

  /* ---------- Time and the class in session ---------- */

  const now = useMemo(() => {
    if (!state.timeOverride) return realNow
    const [hours, minutes] = state.timeOverride.split(':').map(Number)
    const simulated = new Date(realNow)
    simulated.setHours(hours, minutes, 0, 0)
    return simulated
  }, [realNow, state.timeOverride])

  const nowMinutes = minutesOf(now)

  // The school model drives everything below. This desktop keeps the last copy
  // NEXUS Classroom sent, so the timetable works with no teacher view running.
  const [school, setSchool] = useState(loadSchool)

  const toPeriod = (session: ClassSession): ClassPeriod => ({
    id: session.entry.id,
    classId: session.class.id,
    className: session.class.name,
    subjectId: session.subject.id,
    start: session.start,
    end: session.end,
    room: session.room,
  })

  // Today's timetable comes from the classes the student is enrolled in.
  const sessions = useMemo(() => studentSchedule(school, state.studentId, now), [school, state.studentId, now])
  const schedule = sessions.map(toPeriod)
  const periodsFor = (day: Date) => studentSchedule(school, state.studentId, day).map(toPeriod)

  // The subjects in the sidebar are the subjects of those classes.
  const subjects = useMemo(() => {
    const seen = new Map<string, Subject>()
    for (const cls of classesForStudent(school, state.studentId)) {
      const subject = school.subjects.find((s) => s.id === cls.subjectId)
      if (!subject || seen.has(subject.id)) continue
      seen.set(subject.id, {
        id: subject.id,
        name: subject.name,
        color: cls.color ?? subject.color,
        teacher: school.teachers.find((t) => t.id === cls.teacherId)?.name ?? '',
      })
    }
    return [...seen.values()]
  }, [school, state.studentId])

  const currentPeriod =
    state.classOverride === null
      ? findPeriodAt(schedule, nowMinutes)
      : (schedule.find((period) => period.subjectId === state.classOverride) ?? null)

  const currentSession = sessions.find((session) => session.entry.id === currentPeriod?.id) ?? null
  const currentClass = toActiveClass(currentPeriod, subjects)
  const upcomingClasses = schedule
    .filter((period) => period.start > (currentPeriod ? currentPeriod.start : nowMinutes))
    .map((period) => toActiveClass(period, subjects))
    .filter((active): active is ActiveClass => active !== null)

  /* ---------- Lookups ---------- */

  // The account gives the name. The example school record behind it gives the
  // timetable and enrolment, until NEXUS has a real school database.
  const profile = useProfile()
  const student = useMemo(() => {
    const record = students.find((s) => s.id === state.studentId) ?? students[0]
    return {
      ...record,
      name: profile.displayName,
      firstName: profile.displayName.split(' ')[0],
      initials: initialsOf(profile.displayName),
    }
  }, [state.studentId, profile.displayName])
  // Falls back to the school's subjects for work or messages from a subject the student isn't enrolled in.
  const getSubject = (id: string): Subject | undefined => {
    const own = subjects.find((s) => s.id === id)
    if (own) return own
    const other = school.subjects.find((s) => s.id === id)
    return other && { id: other.id, name: other.name, color: other.color, teacher: '' }
  }
  const getAssignment = (id: string) => state.assignments.find((a) => a.id === id)
  // The teacher's decisions for the class sit on top of everything else.
  const permissionOverrides = useMemo(
    () => ({ ...state.permissionOverrides, ...state.classroomOverrides }),
    [state.permissionOverrides, state.classroomOverrides],
  )
  // The class in session can restrict things for as long as it lasts.
  const classRule = useMemo<ClassRule | null>(
    () =>
      currentSession && {
        className: currentSession.class.name,
        policy: currentSession.class.policy,
        appIds: classApps(school, currentSession.class),
      },
    [school, currentSession],
  )
  const getPermission = (key: string) => resolvePermission(key, permissionOverrides, state.testMode, classRule)

  const isInstalled = (id: AppId) => state.installedApps.includes(id)

  // Recommendations are the class's applications, chosen in NEXUS Classroom from
  // the app registry. Only installed apps are offered.
  const recommendedApps = currentSession ? classApps(school, currentSession.class).filter(isInstalled) : []
  const classSites = currentSession ? classWebsites(school, currentSession.class) : []
  const currentAssignment = pickCurrentAssignment(
    state.assignments,
    state.activeAssignmentId,
    currentClass?.subject.id,
  )
  const unreadNotifications = state.notifications.filter((n) => !n.read)
  const unreadMessages = state.conversations.reduce((total, c) => total + c.unread, 0)
  const openApps = windowManager.windows.filter((w) => !w.closing).map((w) => w.id)

  const context: NexusContextSnapshot = {
    student,
    time: now,
    simulatedTime: state.timeOverride !== null,
    currentClass,
    nextClass: upcomingClasses[0] ?? null,
    activeSubject: currentClass?.subject ?? null,
    currentAssignment,
    recommendedApps,
    allowedApps: ALL_APP_IDS.filter(
      (id) => isInstalled(id) && getPermission(permissionKey('app', id)).state === 'allowed',
    ),
    testMode: state.testMode ? testSession : null,
    unreadNotifications,
    dueSoon: dueSoon(state.assignments, now),
  }

  /* ---------- Actions ---------- */

  const navigate = useCallback((view: View) => dispatch({ type: 'navigate', view }), [])
  const openAssignment = useCallback((id: string) => navigate({ kind: 'assignment', id }), [navigate])
  const setAssignmentStatus = useCallback(
    (id: string, status: AssignmentStatus) =>
      dispatch({ type: 'setAssignmentStatus', id, status, time: stamp() }),
    [],
  )
  const updateDocument = useCallback(
    (key: string, draft: DocumentDraft) => dispatch({ type: 'updateDocument', key, draft }),
    [],
  )
  const showRestriction = useCallback(
    (key: string, label: string) => dispatch({ type: 'showRestriction', key, label }),
    [],
  )
  const notify = useCallback(
    (notification: NewNotification) => dispatch({ type: 'notify', notification, time: stamp() }),
    [],
  )
  const openConversation = useCallback((id: string) => dispatch({ type: 'openConversation', id }), [])
  const dismissRestriction = useCallback(() => dispatch({ type: 'dismissRestriction' }), [])
  const dismissLaunchNotice = useCallback(() => dispatch({ type: 'setLaunchNotice', notice: null }), [])

  const setCatalogFocus = useCallback((id: AppId | null) => dispatch({ type: 'setCatalogFocus', id }), [])
  const setSettingsSection = useCallback(
    (section: SettingsSectionId) => dispatch({ type: 'setSettingsSection', section }),
    [],
  )

  const launchApp = (id: AppId) => {
    const app = getApp(id)
    const key = permissionKey('app', id)
    const plan = planLaunch(app, isInstalled(id), getPermission(key))
    const opened = () => dispatch({ type: 'recordLaunch', id })

    switch (plan.kind) {
      case 'restricted':
        return showRestriction(key, app.name)
      case 'not_installed':
        return openCatalog(id)
      case 'window':
        windowManager.open(id)
        return opened()
      case 'browser': {
        // A web app is a tab in NEXUS Browser, so the browser must be allowed too.
        const browserKey = permissionKey('app', 'browser')
        if (getPermission(browserKey).state !== 'allowed') {
          return showRestriction(browserKey, getApp('browser').name)
        }
        windowManager.open('browser')
        void browser.openInTab(plan.url)
        return opened()
      }
      case 'native':
        // Only counts as opened if the runtime really started it.
        void launchNativeApp(app).then((result) => {
          if (result.started) opened()
          else dispatch({ type: 'setLaunchNotice', notice: { appId: id, message: result.message } })
        })
    }
  }

  const openCatalog = (id?: AppId) => {
    setCatalogFocus(id ?? null)
    launchApp('catalog')
  }

  const openSettings = (section?: SettingsSectionId) => {
    if (section) setSettingsSection(section)
    launchApp('settings')
  }

  const installApp = (id: AppId) => dispatch({ type: 'setInstalled', id, installed: true })

  const uninstallApp = (id: AppId) => {
    if (windowManager.windows.some((w) => w.id === id)) windowManager.close(id)
    dispatch({ type: 'setInstalled', id, installed: false })
  }

  const workOnAssignment = (id: string) => {
    const assignment = getAssignment(id)
    if (!assignment) return
    dispatch({ type: 'navigate', view: { kind: 'assignment', id } })
    if (assignment.status === 'not_started') setAssignmentStatus(id, 'in_progress')
    launchApp(assignment.recommendedApp)
  }

  const openNotification = (notification: NexusNotification) => {
    dispatch({ type: 'markRead', id: notification.id })
    const { target } = notification
    if (!target) return
    if (target.kind === 'assignment') openAssignment(target.id)
    else if (target.kind === 'page') navigate({ kind: 'page', id: target.id })
    else {
      openConversation(target.id)
      navigate({ kind: 'page', id: 'messages' })
    }
  }

  /* ---------- Reactions ---------- */

  // A new class starting is announced once, when the class in session changes.
  const announcedClass = useRef<string | null | undefined>(undefined)
  const currentClassId = currentClass?.period.id ?? null
  useEffect(() => {
    const previous = announcedClass.current
    announcedClass.current = currentClassId
    if (previous === undefined || previous === currentClassId || !currentClass) return
    notify({
      type: 'class_starting',
      title: `${currentClass.subject.name} is starting`,
      body: `${currentClass.period.room} with ${currentClass.subject.teacher}.`,
      target: { kind: 'page', id: 'calendar' },
    })
    // Keyed on the class id: the class object itself is rebuilt every render.
  }, [currentClassId, notify])

  // NEXUS Browser asks the school's policy before every navigation. The policy
  // is NEXUS's own permission system, and a refusal shows the usual dialog.
  useEffect(() => {
    browser.setPolicy(
      createSchoolPolicy((key) => resolvePermission(key, permissionOverrides, state.testMode, classRule)),
    )
    browser.onBlocked = (decision) => showRestriction(decision.key, decision.label)
  }, [permissionOverrides, state.testMode, classRule, showRestriction])

  // Keep the persisted slice of the session up to date.
  useEffect(() => persistState(state), [state])

  // Work a teacher sets for a class reaches every student enrolled in it. The
  // first pass after loading is silent; anything that arrives later notifies.
  const assignmentsSynced = useRef(false)
  useEffect(() => {
    const enrolled = new Set(classesForStudent(school, state.studentId).map((cls) => cls.id))
    const assignments = school.assignments
      .filter((assignment) => enrolled.has(assignment.classId))
      .map<Assignment>((assignment) => {
        const cls = school.classes.find((c) => c.id === assignment.classId)!
        return {
          id: assignment.id,
          title: assignment.title,
          subjectId: cls.subjectId,
          description: assignment.description,
          instructions: assignment.instructions,
          assignedDate: assignment.assignedDate,
          dueDate: assignment.dueDate,
          status: 'not_started',
          recommendedApp: assignment.recommendedApp,
          allowedApps: classApps(school, cls),
          allowedWebsites: classWebsites(school, cls).map((site) => site.name),
        }
      })
    dispatch({
      type: 'syncSchoolAssignments',
      assignments,
      subjectNames: Object.fromEntries(school.subjects.map((s) => [s.id, s.name])),
      notify: assignmentsSynced.current,
      time: stamp(),
    })
    assignmentsSynced.current = true
  }, [school, state.studentId])

  /* ---------- NEXUS Classroom ---------- */

  const browserTabs = useBrowser()
  const activeTab = browserTabs.tabs.find((tab) => tab.id === browserTabs.activeTabId)

  const { connected: classroomConnected, watched: screenWatched } = useStudentLink({
    presence: {
      id: student.id,
      name: student.name,
      initials: student.initials,
      viewing: viewTitle(state.view, (id) => getSubject(id)?.name, (id) => getAssignment(id)?.title),
      currentClass: currentSession?.class.name ?? currentClass?.subject.name ?? null,
      currentClassId: currentSession?.class.id ?? null,
      openApps,
      activeApp: windowManager.activeId,
      browser: openApps.includes('browser') && activeTab?.url ? { title: activeTab.title, url: activeTab.url } : null,
      testMode: state.testMode,
      accessRequests: state.accessRequests,
      assignments: state.assignments.map(({ id, title, status }) => ({ id, title, status })),
      updatedAt: '',
    },
    onSchool: (received: SchoolData) => {
      const next = migrateSchool(received)
      setSchool(next)
      saveSchool(next)
    },
    onClassState: (classState: ClassState) =>
      dispatch({ type: 'applyClassroom', testMode: classState.testMode, permissions: classState.permissions, time: stamp() }),
    onCommand: (command: ClassCommand) => {
      switch (command.type) {
        case 'openUrl':
          // Through the launcher and the browser's policy check, like anything else.
          launchApp('browser')
          return void browser.openInTab(command.url)
        case 'message':
          return dispatch({ type: 'receiveMessage', from: command.from, text: command.text, time: stamp() })
        case 'accessDecision':
          return dispatch({
            type: 'resolveAccessRequest',
            key: command.key,
            label: command.label,
            approved: command.approved,
            time: stamp(),
          })
      }
    },
  })

  /* ---------- Developer Preview ---------- */

  const dev = useMemo<NexusValue['dev']>(
    () => ({
      setStudent: (id) => dispatch({ type: 'setStudent', id }),
      setTimeOverride: (value) => dispatch({ type: 'setTimeOverride', value }),
      setClassOverride: (value) => dispatch({ type: 'setClassOverride', value }),
      setTestMode: (on) => dispatch({ type: 'setTestMode', on, time: stamp() }),
      setPermission: (key, permission) => dispatch({ type: 'setPermission', key, state: permission }),
      setSystem: (patch) => dispatch({ type: 'setSystem', patch }),
      assignNewWork: () => {
        const template = assignmentTemplates[Math.floor(Math.random() * assignmentTemplates.length)]
        const due = new Date()
        due.setDate(due.getDate() + 3)
        due.setHours(23, 59, 0, 0)
        dispatch({
          type: 'addAssignment',
          assignment: { ...template, status: 'not_started', assignedDate: stamp(), dueDate: due.toISOString() },
          subjectName: createSchoolSeed().subjects.find((s) => s.id === template.subjectId)?.name ?? 'your class',
          time: stamp(),
        })
      },
      deliverTeacherMessage: () => {
        const senders = [
          { name: 'Ms. Okafor', initials: 'MO', subjectId: 'science' },
          { name: 'Mrs. Lindqvist', initials: 'ML', subjectId: 'software-dev' },
          { name: 'Mr. Reyes', initials: 'MR', subjectId: 'math' },
        ]
        const from = senders[Math.floor(Math.random() * senders.length)]
        const text = teacherMessageTemplates[Math.floor(Math.random() * teacherMessageTemplates.length)]
        dispatch({ type: 'receiveMessage', from, text, time: stamp() })
      },
      reset: () => {
        removeStored(SESSION_STORAGE_KEY)
        dispatch({ type: 'reset' })
      },
    }),
    [],
  )

  const value: NexusValue = {
    ...state,
    student,
    school,
    periodsFor,
    currentSession,
    classSites,
    subjects,
    schedule,
    events: schoolEvents,
    now,
    currentClass,
    upcomingClasses,
    recommendedApps,
    currentAssignment,
    unreadNotifications,
    unreadMessages,
    openApps,
    classroomConnected,
    screenWatched,
    context,
    getSubject,
    getAssignment,
    getPermission,
    navigate,
    openAssignment,
    setAssignmentStatus,
    workOnAssignment,
    documents: state.documents,
    updateDocument,
    launchApp,
    isInstalled,
    toggleFavorite: (id) => dispatch({ type: 'toggleFavorite', id }),
    dismissLaunchNotice,
    installApp,
    uninstallApp,
    openSettings,
    setSettingsSection,
    openCatalog,
    setCatalogFocus,
    showRestriction,
    dismissRestriction,
    requestAccess: (key, label) => dispatch({ type: 'requestAccess', key, label, time: stamp() }),
    openConversation,
    sendMessage: (conversationId, text) =>
      dispatch({ type: 'sendMessage', conversationId, text, time: stamp() }),
    notify,
    openNotification,
    markAllRead: () => dispatch({ type: 'markAllRead' }),
    dev,
  }

  return <NexusContext.Provider value={value}>{children}</NexusContext.Provider>
}

/** Access to the central NEXUS state, derived context and actions. */
export function useNexus() {
  const value = useContext(NexusContext)
  if (!value) throw new Error('useNexus must be used inside a NexusProvider')
  return value
}
