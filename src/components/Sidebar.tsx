import { Lock, LogOut, Settings } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { mainNav, type NavItem } from '../navigation'
import { useNexus } from '../state/NexusContext'
import { permissionKey } from '../state/selectors'
import { NexusMark } from './NexusMark'

export function Sidebar() {
  const {
    view,
    navigate,
    student,
    subjects,
    currentClass,
    unreadMessages,
    openApps,
    getAssignment,
    getPermission,
    openSettings,
  } = useNexus()
  const { signOut } = useAuth()

  // An open assignment belongs to the Assignments section.
  const activePage =
    view.kind === 'page' ? view.id : view.kind === 'assignment' ? 'assignments' : null
  const activeSubjectId =
    view.kind === 'subject'
      ? view.id
      : view.kind === 'assignment'
        ? getAssignment(view.id)?.subjectId
        : null

  const renderNavItem = (item: NavItem) => {
    const active = activePage === item.id
    const locked = getPermission(permissionKey('page', item.id)).state !== 'allowed'
    const badge = item.id === 'messages' && !locked ? unreadMessages : 0
    const Icon = item.icon
    return (
      <button
        key={item.id}
        type="button"
        className={`nav-item${active ? ' is-active' : ''}${locked ? ' is-locked' : ''}`}
        aria-current={active ? 'page' : undefined}
        onClick={() => navigate({ kind: 'page', id: item.id })}
      >
        <Icon size={17} strokeWidth={1.9} className="nav-item__icon" />
        <span className="nav-item__label">{item.label}</span>
        {locked && <Lock size={13} className="nav-item__lock" aria-label="Restricted" />}
        {badge > 0 && <span className="nav-item__badge">{badge}</span>}
      </button>
    )
  }

  return (
    <aside className="sidebar glass">
      <div className="sidebar__brand">
        <NexusMark size={34} />
        <div>
          <div className="sidebar__brand-name">NEXUS</div>
          <div className="sidebar__brand-sub">Student OS</div>
        </div>
      </div>

      <nav className="sidebar__scroll" aria-label="Main">
        <div className="sidebar__group">{mainNav.map(renderNavItem)}</div>

        <div className="sidebar__heading">Subjects</div>
        <div className="sidebar__group">
          {subjects.map((subject) => {
            const active = view.kind === 'subject' && view.id === subject.id
            const inSession = currentClass?.subject.id === subject.id
            return (
              <button
                key={subject.id}
                type="button"
                className={`nav-item nav-item--subject${active ? ' is-active' : ''}${
                  !active && activeSubjectId === subject.id ? ' is-related' : ''
                }`}
                aria-current={active ? 'page' : undefined}
                onClick={() => navigate({ kind: 'subject', id: subject.id })}
              >
                <span
                  className="subject-dot"
                  style={{ '--subject': subject.color } as React.CSSProperties}
                />
                <span className="nav-item__label">{subject.name}</span>
                {inSession && <span className="live-dot nav-item__live" title="In session now" />}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="sidebar__footer">
        <button
          type="button"
          className={`nav-item${openApps.includes('settings') ? ' is-related' : ''}`}
          onClick={() => openSettings()}
        >
          <Settings size={17} strokeWidth={1.9} className="nav-item__icon" />
          <span className="nav-item__label">Settings</span>
        </button>
        <div className="account">
          <span className="avatar">{student.initials}</span>
          <div className="account__text">
            <div className="account__name">{student.name}</div>
            <div className="account__role">{student.role}</div>
          </div>
          <button type="button" className="account__signout" onClick={() => void signOut()} aria-label="Sign Out" title="Sign Out">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
