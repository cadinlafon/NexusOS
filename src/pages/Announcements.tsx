import { PageHeader } from '../components/PageHeader'
import { useNexus } from '../state/NexusContext'
import { relativeTime } from '../state/selectors'

export function Announcements() {
  const { announcements } = useNexus()

  return (
    <div className="page">
      <PageHeader
        eyebrow="Announcements"
        title="From your school"
        description="News and updates from teachers and the school office."
      />

      <div className="list">
        {announcements.map((item) => (
          <article key={item.id} className="list-card glass lift">
            <div className="list-card__top">
              <span className="list-card__source">{item.from}</span>
              <span className="list-card__time">{relativeTime(item.date)}</span>
            </div>
            <h2 className="list-card__title">{item.title}</h2>
            <p className="list-card__text">{item.body}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
