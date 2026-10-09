import { useEffect } from 'react'
import { useNexus } from '../state/NexusContext'
import { relativeTime } from '../state/selectors'
import { NotificationIcon } from './NotificationIcon'

interface NotificationCenterProps {
  onClose: () => void
}

/** The panel under the bell: unread first-class, with the full history below. */
export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const { notifications, unreadNotifications, openNotification, markAllRead } = useNexus()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <>
      <div className="popover-scrim" onMouseDown={onClose} />
      <section className="notification-center glass" role="dialog" aria-label="Notifications">
        <header className="notification-center__header">
          <div>
            <h2 className="notification-center__title">Notifications</h2>
            <div className="notification-center__count">
              {unreadNotifications.length > 0 ? `${unreadNotifications.length} unread` : 'All caught up'}
            </div>
          </div>
          <button
            type="button"
            className="text-button"
            onClick={markAllRead}
            disabled={unreadNotifications.length === 0}
          >
            Mark all as read
          </button>
        </header>

        <ul className="notification-center__list">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                className={`notification-row${notification.read ? '' : ' is-unread'}`}
                onClick={() => {
                  openNotification(notification)
                  onClose()
                }}
              >
                <NotificationIcon type={notification.type} />
                <span className="notification-row__text">
                  <span className="notification-row__title">{notification.title}</span>
                  <span className="notification-row__body">{notification.body}</span>
                  <span className="notification-row__time">{relativeTime(notification.time)}</span>
                </span>
                {!notification.read && <span className="unread-dot" aria-label="Unread" />}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
