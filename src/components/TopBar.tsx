import { Bell, Eye, Lock, Moon, Sparkles, Sun } from 'lucide-react'
import { useState } from 'react'
import { testSession } from '../data/mockData'
import { viewTitle } from '../navigation'
import { useNexus } from '../state/NexusContext'
import { permissionKey } from '../state/selectors'
import { useSettings } from '../state/SettingsContext'
import { NotificationCenter } from './NotificationCenter'
import { SystemStatus } from './SystemStatus'

export function TopBar() {
  const { resolvedTheme: theme, toggleTheme: onToggleTheme } = useSettings()
  const {
    view,
    now,
    timeOverride,
    student,
    testMode,
    screenWatched,
    unreadNotifications,
    openSettings,
    launchApp,
    getSubject,
    getAssignment,
    getPermission,
  } = useNexus()
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const title = viewTitle(
    view,
    (id) => getSubject(id)?.name,
    (id) => getAssignment(id)?.title,
  )
  const unread = unreadNotifications.length
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const aiLocked = getPermission(permissionKey('app', 'nexus-ai')).state !== 'allowed'

  return (
    <header className="topbar">
      <div className="topbar__left">
        <span className="topbar__os">NEXUS</span>
        <span className="topbar__sep" aria-hidden="true" />
        <span className="topbar__title">{title}</span>
        {testMode && (
          <span className="test-pill" role="status">
            <span className="test-pill__dot" />
            Test Mode
            <span className="test-pill__detail">
              {getSubject(testSession.subjectId)?.name}: {testSession.title}
            </span>
          </span>
        )}
        {screenWatched && (
          <span className="watch-pill" role="status">
            <Eye size={13} />
            Your teacher is viewing your screen
          </span>
        )}
      </div>

      <div className="topbar__right">
        <time className="topbar__clock" dateTime={now.toISOString()}>
          {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          <span className="topbar__clock-time">
            {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
          {timeOverride && (
            <span className="topbar__sim" title="The clock is simulated. Change it in Settings.">
              Simulated
            </span>
          )}
        </time>

        <SystemStatus />

        <button
          type="button"
          className="icon-button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${nextTheme} mode`}
          title={`Switch to ${nextTheme} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          type="button"
          className={`icon-button${notificationsOpen ? ' is-open' : ''}`}
          onClick={() => setNotificationsOpen((open) => !open)}
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          aria-expanded={notificationsOpen}
          title="Notifications"
        >
          <Bell size={16} />
          {unread > 0 && <span className="icon-button__count">{unread}</span>}
        </button>

        <button
          type="button"
          className={`ask-ai${aiLocked ? ' is-locked' : ''}`}
          onClick={() => launchApp('nexus-ai')}
        >
          {aiLocked ? <Lock size={13} /> : <Sparkles size={14} />}
          Ask AI
        </button>

        <button
          type="button"
          className="avatar avatar--button"
          onClick={() => openSettings('account')}
          aria-label={`${student.name}, open settings`}
          title={student.name}
        >
          {student.initials}
        </button>
      </div>

      {notificationsOpen && <NotificationCenter onClose={() => setNotificationsOpen(false)} />}
    </header>
  )
}
