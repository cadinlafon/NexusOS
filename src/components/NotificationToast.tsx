import { useEffect, useRef, useState } from 'react'
import { useNexus } from '../state/NexusContext'
import { useSettings, type NotificationCategory } from '../state/SettingsContext'
import { type NexusNotification, type NotificationType } from '../types/nexus'
import { NotificationIcon } from './NotificationIcon'

const VISIBLE_MS = 5000

/** Which Settings switch governs each kind of notification. */
const categoryOf: Record<NotificationType, NotificationCategory> = {
  new_assignment: 'assignments',
  due_soon: 'assignments',
  assignment_submitted: 'assignments',
  teacher_message: 'messages',
  class_starting: 'calendar',
  announcement: 'system',
  system: 'system',
}

/** Briefly surfaces each notification as it arrives. */
export function NotificationToast() {
  const { notifications, openNotification } = useNexus()
  const { settings } = useSettings()
  const [toast, setToast] = useState<NexusNotification | null>(null)
  const lastSeen = useRef<string | undefined>(undefined)
  // Read through a ref so changing a preference doesn't restart a visible toast's timer.
  const preferences = useRef(settings)
  preferences.current = settings

  const newest = notifications[0]

  useEffect(() => {
    const previous = lastSeen.current
    lastSeen.current = newest?.id
    // Nothing to announce on first render, or when the list only got shorter.
    if (previous === undefined || !newest || newest.id === previous || newest.read) return
    // Muted notifications still land in the bell; they just don't pop up.
    const { doNotDisturb, notifications: enabled } = preferences.current
    if (doNotDisturb || !enabled[categoryOf[newest.type]]) return
    setToast(newest)
    const id = window.setTimeout(() => setToast(null), VISIBLE_MS)
    return () => window.clearTimeout(id)
  }, [newest])

  if (!toast) return null

  return (
    <button
      type="button"
      className="toast glass"
      key={toast.id}
      onClick={() => {
        openNotification(toast)
        setToast(null)
      }}
    >
      <NotificationIcon type={toast.type} />
      <span className="notification-row__text">
        <span className="notification-row__title">{toast.title}</span>
        <span className="notification-row__body">{toast.body}</span>
      </span>
    </button>
  )
}
