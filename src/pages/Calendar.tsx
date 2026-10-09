import { PageHeader } from '../components/PageHeader'
import { SectionHeader } from '../components/SectionHeader'
import { useNexus } from '../state/NexusContext'
import { calendarMarkersForDay, formatMinutes, minutesOf, periodStatus } from '../state/selectors'

const statusText = { done: 'Finished', current: 'Now', upcoming: 'Up next' } as const

const DAYS_AHEAD = 14

export function Calendar() {
  const {
    schedule,
    periodsFor,
    subjects,
    assignments,
    events,
    now,
    currentClass,
    getSubject,
    openAssignment,
    launchApp,
  } = useNexus()

  // The next two weeks of deadlines and events, from the same data as everything else.
  const comingUp = Array.from({ length: DAYS_AHEAD + 1 }, (_, offset) => {
    const day = new Date(now)
    day.setDate(now.getDate() + offset)
    return { day, offset, items: calendarMarkersForDay(day, { periodsFor, subjects, assignments, events }) }
  }).filter((entry) => entry.items.length > 0)

  // Monday to Friday of the current week.
  const week = [1, 2, 3, 4, 5].map((weekday) => {
    const day = new Date(now)
    day.setDate(now.getDate() - now.getDay() + weekday)
    return day
  })

  const dayName = (day: Date, offset: number) =>
    offset === 0
      ? 'Today'
      : offset === 1
        ? 'Tomorrow'
        : day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="page">
      <PageHeader
        eyebrow="Calendar"
        title="Your schedule"
        description="Classes, due dates and school events in one timeline."
      />

      <div>
        <button type="button" className="button" onClick={() => launchApp('calendar')}>
          Open the Calendar app
        </button>
      </div>

      <section className="section">
        <SectionHeader eyebrow="Today" title="Classes" />
        <div className="schedule glass">
          {schedule.map((period) => {
            const subject = getSubject(period.subjectId)
            const status = periodStatus(period, currentClass?.period ?? null, minutesOf(now))
            return (
              <div
                key={period.id}
                className={`schedule__row schedule__row--${status}`}
                style={{ '--subject': subject?.color } as React.CSSProperties}
              >
                <span className="schedule__time">{formatMinutes(period.start)}</span>
                <span className="subject-dot" />
                <span className="schedule__name">{subject?.name}</span>
                <span className="schedule__room">{period.room}</span>
                <span className="schedule__status">
                  {status === 'current' && <span className="live-dot" />}
                  {statusText[status]}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="section">
        <SectionHeader eyebrow="This week" title="Timetable" />
        <div className="week glass">
          {week.map((day) => (
            <div key={day.toDateString()} className={`week__day${day.toDateString() === now.toDateString() ? ' is-today' : ''}`}>
              <div className="week__name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              {periodsFor(day).map((period) => (
                <div
                  key={period.id}
                  className="week__class"
                  style={{ '--subject': getSubject(period.subjectId)?.color } as React.CSSProperties}
                >
                  <span className="week__time">{formatMinutes(period.start)}</span>
                  <span className="week__subject">{getSubject(period.subjectId)?.name}</span>
                  <span className="week__room">{period.room}</span>
                </div>
              ))}
              {periodsFor(day).length === 0 && <div className="week__none">No classes</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeader eyebrow="Next two weeks" title="Due dates and events" />
        <div className="list">
          {comingUp.map(({ day, offset, items }) => (
            <div key={day.toDateString()} className="agenda-day">
              <div className="agenda-day__label">{dayName(day, offset)}</div>
              <div className="agenda-day__items">
                {items.map((item) =>
                  item.assignmentId ? (
                    <button
                      key={item.id}
                      type="button"
                      className="agenda-item glass lift"
                      style={{ '--subject': item.color } as React.CSSProperties}
                      onClick={() => openAssignment(item.assignmentId!)}
                    >
                      <span className="agenda-item__kind">Assignment</span>
                      <span className="agenda-item__title">{item.title}</span>
                      <span className="agenda-item__detail">{item.detail}</span>
                    </button>
                  ) : (
                    <div
                      key={item.id}
                      className="agenda-item glass"
                      style={{ '--subject': item.color } as React.CSSProperties}
                    >
                      <span className="agenda-item__kind">School event</span>
                      <span className="agenda-item__title">{item.title}</span>
                      <span className="agenda-item__detail">{item.detail}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
