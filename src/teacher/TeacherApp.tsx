import {
  BookOpen,
  CalendarDays,
  Check,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useAuth, useProfile } from '../auth/AuthProvider'
import { initialsOf } from '../auth/types'
import { NexusMark } from '../components/NexusMark'
import { testSession } from '../data/mockData'
import { TeacherPages } from './pages'
import { TeacherProvider, useTeacher, type TeacherPage } from './TeacherContext'

const nav: { id: TeacherPage; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'classes', label: 'Classes', icon: GraduationCap },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'assignments', label: 'Assignments', icon: ClipboardList },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'ai', label: 'NEXUS AI', icon: Sparkles },
  { id: 'applications', label: 'Applications', icon: LayoutGrid },
]

function Shell() {
  const { view, go, now, timeOverride, theme, setTheme, classroom, myClasses, confirmation } = useTeacher()
  const { signOut } = useAuth()
  const profile = useProfile()
  const initials = initialsOf(profile.displayName)

  // A class or subject page belongs to its section in the sidebar.
  const section: TeacherPage = view.page === 'class' ? 'classes' : view.page === 'subject' ? 'subjects' : view.page
  const item = (id: TeacherPage, label: string, Icon: LucideIcon) => (
    <button
      key={id}
      type="button"
      className={`nav-item${section === id ? ' is-active' : ''}`}
      aria-current={section === id ? 'page' : undefined}
      onClick={() => go({ page: id })}
    >
      <Icon size={17} strokeWidth={1.9} className="nav-item__icon" />
      <span className="nav-item__label">{label}</span>
    </button>
  )

  return (
    <div className="desktop teacher">
      <div className="wallpaper" aria-hidden="true">
        <span className="wallpaper__orb wallpaper__orb--a" />
        <span className="wallpaper__orb wallpaper__orb--b" />
        <span className="wallpaper__orb wallpaper__orb--c" />
      </div>

      <header className="topbar">
        <div className="topbar__left">
          <span className="topbar__os">NEXUS</span>
          <span className="topbar__sep" aria-hidden="true" />
          <span className="topbar__title">Classroom</span>
          {classroom.classState.testMode && (
            <span className="test-pill" role="status">
              <span className="test-pill__dot" />
              Test Mode
              <span className="test-pill__detail">{testSession.title}</span>
            </span>
          )}
        </div>
        <div className="topbar__right">
          <time className="topbar__clock" dateTime={now.toISOString()}>
            {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            <span className="topbar__clock-time">{now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
            {timeOverride && (
              <span className="topbar__sim" title="The clock is simulated. Change it in Settings.">
                Simulated
              </span>
            )}
          </time>
          <span
            className={`relay-status${classroom.connected ? ' is-up' : ''}`}
            title="The local relay that links this view to student desktops and saves the school's setup."
          >
            <span className={`live-dot${classroom.connected ? '' : ' live-dot--idle'}`} />
            {classroom.connected ? 'Class link active' : 'Class link down'}
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <span className="avatar" title={profile.displayName}>
            {initials}
          </span>
        </div>
      </header>

      <div className="teacher__body">
        <aside className="sidebar glass">
          <div className="sidebar__brand">
            <NexusMark size={34} />
            <div>
              <div className="sidebar__brand-name">NEXUS</div>
              <div className="sidebar__brand-sub">Classroom</div>
            </div>
          </div>

          <nav className="sidebar__scroll" aria-label="Main">
            <div className="sidebar__group">{nav.map((entry) => item(entry.id, entry.label, entry.icon))}</div>

            <div className="sidebar__heading">My classes</div>
            <div className="sidebar__group">
              {myClasses.map((cls) => (
                <button
                  key={cls.id}
                  type="button"
                  className={`nav-item nav-item--subject${view.page === 'class' && view.classId === cls.id ? ' is-active' : ''}`}
                  onClick={() => go({ page: 'class', classId: cls.id })}
                >
                  <span className="subject-dot" />
                  <span className="nav-item__label">{cls.name}</span>
                </button>
              ))}
            </div>
          </nav>

          <div className="sidebar__footer">
            {item('settings', 'Settings', Settings)}
            <div className="account">
              <span className="avatar">{initials}</span>
              <div className="account__text">
                <div className="account__name">{profile.displayName}</div>
                <div className="account__role">Teacher</div>
              </div>
              <button type="button" className="account__signout" onClick={() => void signOut()} aria-label="Sign Out" title="Sign Out">
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </aside>

        {/* Keyed so each page scrolls from the top and fades in. */}
        <main className="teacher-main" key={JSON.stringify(view)}>
          <TeacherPages view={view} />
        </main>
      </div>

      {confirmation && (
        <div className="toast glass teacher-toast" role="status">
          <Check size={15} /> {confirmation}
        </div>
      )}
    </div>
  )
}

/** The teacher workspace: NEXUS Classroom. Only reachable through a ProtectedRoute. */
export default function ClassroomOS() {
  return (
    <TeacherProvider>
      <Shell />
    </TeacherProvider>
  )
}
