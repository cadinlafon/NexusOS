import { ArrowRight, Bell } from 'lucide-react'
import { useNexus } from '../state/NexusContext'

/** The dashboard banner that points at the latest school announcement. */
export function AnnouncementCard() {
  const { announcements, navigate } = useNexus()
  const latest = announcements[0]
  if (!latest) return null

  return (
    <button
      type="button"
      className="announcement-card glass lift"
      onClick={() => navigate({ kind: 'page', id: 'announcements' })}
    >
      <span className="announcement-card__icon">
        <Bell size={18} />
      </span>
      <span className="announcement-card__body">
        <span className="eyebrow eyebrow--accent">Announcement · {latest.from}</span>
        <span className="announcement-card__title">{latest.title}</span>
        <span className="announcement-card__hint">Click to view the latest update.</span>
      </span>
      <ArrowRight size={18} className="announcement-card__arrow" />
    </button>
  )
}
