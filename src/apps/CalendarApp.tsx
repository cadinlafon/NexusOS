import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useNexus } from '../state/NexusContext'
import { calendarItemsForDay, calendarMarkersForDay, isSameDay } from '../state/selectors'
import { type CalendarItem } from '../types/nexus'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const kindLabel: Record<CalendarItem['kind'], string> = {
  class: 'Class',
  assignment: 'Assignment',
  event: 'School event',
}

/** Month view over the same schedule, assignments and events as the rest of NEXUS. */
export function CalendarApp() {
  const { now, periodsFor, subjects, assignments, events, openAssignment } = useNexus()
  const sources = { periodsFor, subjects, assignments, events }

  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [selected, setSelected] = useState(() => new Date(now))

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const days = Array.from(
    { length: daysInMonth },
    (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1),
  )

  const shiftMonth = (delta: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))

  const goToday = () => {
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelected(new Date(now))
  }

  const selectedItems = calendarItemsForDay(selected, sources)
  const isToday = isSameDay(selected, now)

  return (
    <div className="app app--split cal">
      <section className="app-main cal__month">
        <header className="app-toolbar">
          <h2 className="app-toolbar__title">
            {month.toLocaleDateString('en-US', { month: 'long' })}{' '}
            <span className="cal__year">{month.getFullYear()}</span>
          </h2>
          <button type="button" className="app-button" onClick={goToday}>
            Today
          </button>
          <button type="button" className="app-icon-button" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="app-icon-button" onClick={() => shiftMonth(1)} aria-label="Next month">
            <ChevronRight size={16} />
          </button>
        </header>

        <div className="cal__weekdays">
          {WEEKDAYS.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>

        <div className="cal__grid">
          {Array.from({ length: month.getDay() }, (_, index) => (
            <span key={`blank-${index}`} />
          ))}
          {days.map((date) => (
            <button
              key={date.getDate()}
              type="button"
              className={[
                'cal-day',
                isSameDay(date, now) && 'is-today',
                isSameDay(date, selected) && 'is-selected',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setSelected(date)}
              aria-label={date.toLocaleDateString('en-US', { dateStyle: 'full' })}
            >
              <span className="cal-day__number">{date.getDate()}</span>
              <span className="cal-day__dots">
                {calendarMarkersForDay(date, sources)
                  .slice(0, 3)
                  .map((item) => (
                    <span key={item.id} style={{ background: item.color }} />
                  ))}
              </span>
            </button>
          ))}
        </div>
      </section>

      <aside className="cal__agenda">
        <div className="eyebrow">
          {isToday ? 'Today' : selected.toLocaleDateString('en-US', { weekday: 'long' })}
        </div>
        <div className="cal__agenda-date">
          {selected.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </div>

        <ul className="cal__entries">
          {selectedItems.map((item) => {
            const content = (
              <>
                <span className="cal-entry__kind">{kindLabel[item.kind]}</span>
                <span className="cal-entry__title">{item.title}</span>
                <span className="cal-entry__detail">{item.detail}</span>
              </>
            )
            const style = { '--subject': item.color } as React.CSSProperties
            return (
              <li key={item.id}>
                {item.assignmentId ? (
                  <button
                    type="button"
                    className="cal-entry cal-entry--link"
                    style={style}
                    onClick={() => openAssignment(item.assignmentId!)}
                  >
                    {content}
                  </button>
                ) : (
                  <div className="cal-entry" style={style}>
                    {content}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </aside>
    </div>
  )
}
