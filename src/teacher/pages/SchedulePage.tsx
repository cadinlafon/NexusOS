import { Plus } from 'lucide-react'
import { useState } from 'react'
import { formatSpan, formatTime, WEEKDAYS } from '../../school/timeEngine'
import { type ScheduleEntry } from '../../school/types'
import { Card, Field, FormDialog, PageTitle } from '../parts'
import { newId, useTeacher } from '../TeacherContext'

const toInput = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
const fromInput = (value: string) => {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

type Draft = Omit<ScheduleEntry, 'id'> & { id?: string; repeat: boolean }

/** Add or change one schedule entry. A period fills in the bell times; custom times are also allowed. */
function EntryDialog({ draft: initial, onClose }: { draft: Draft; onClose: () => void }) {
  const { school, myClasses, update, confirm } = useTeacher()
  const [draft, setDraft] = useState(initial)
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const cls = myClasses.find((c) => c.id === draft.classId)
  const valid = !!cls && draft.end > draft.start

  const choosePeriod = (value: string) => {
    const period = school.periods.find((p) => String(p.number) === value)
    set(period ? { period: period.number, start: period.start, end: period.end } : { period: undefined })
  }

  const save = () => {
    const { id, repeat, ...fields } = draft
    const entry = { ...fields, room: fields.room?.trim() || undefined }
    if (id) {
      update((s) => ({ ...s, schedule: s.schedule.map((e) => (e.id === id ? { ...entry, id } : e)) }))
      confirm('Schedule updated.')
    } else {
      // "Every weekday" makes one entry per day, skipping days this class already has at that time.
      const days = repeat ? WEEKDAYS.map((d) => d.id) : [entry.day]
      update((s) => ({
        ...s,
        schedule: [
          ...s.schedule,
          ...days
            .filter((day) => !s.schedule.some((e) => e.classId === entry.classId && e.day === day && e.start === entry.start))
            .map((day) => ({ ...entry, day, id: newId('sch') })),
        ],
      }))
      confirm(`${cls?.name} added to the schedule.`)
    }
    onClose()
  }

  const remove = () => {
    update((s) => ({ ...s, schedule: s.schedule.filter((e) => e.id !== draft.id) }))
    confirm('Removed from the schedule.')
    onClose()
  }

  return (
    <FormDialog title={draft.id ? 'Edit schedule entry' : 'Add to schedule'} submitLabel={draft.id ? 'Save' : 'Add'} canSubmit={valid} onSubmit={save} onClose={onClose}>
      <Field label="Class">
        <select value={draft.classId} onChange={(e) => set({ classId: e.target.value })}>
          {myClasses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="field-row">
        <Field label="Day">
          <select value={draft.day} onChange={(e) => set({ day: Number(e.target.value) })} disabled={!draft.id && draft.repeat}>
            {WEEKDAYS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Period">
          <select value={draft.period ?? ''} onChange={(e) => choosePeriod(e.target.value)}>
            {school.periods.map((p) => (
              <option key={p.number} value={p.number}>
                Period {p.number} ({formatTime(p.start)})
              </option>
            ))}
            <option value="">Custom time</option>
          </select>
        </Field>
      </div>
      <div className="field-row">
        <Field label="Start time">
          <input type="time" value={toInput(draft.start)} onChange={(e) => e.target.value && set({ start: fromInput(e.target.value), period: undefined })} />
        </Field>
        <Field label="End time">
          <input type="time" value={toInput(draft.end)} onChange={(e) => e.target.value && set({ end: fromInput(e.target.value), period: undefined })} />
        </Field>
      </div>
      <Field label="Room" hint={`Leave empty to use the class's usual room${cls?.room ? ` (${cls.room})` : ''}.`}>
        <input value={draft.room ?? ''} onChange={(e) => set({ room: e.target.value })} placeholder={cls?.room} />
      </Field>
      {!draft.id && (
        <label className="check-row">
          <input type="checkbox" checked={draft.repeat} onChange={(e) => set({ repeat: e.target.checked })} />
          Repeat every Monday to Friday
        </label>
      )}
      {!valid && draft.end <= draft.start && <p className="field__error">The end time must be after the start time.</p>}
      {draft.id && (
        <div>
          <button type="button" className="button button--quiet-danger" onClick={remove}>
            Remove from schedule
          </button>
        </div>
      )}
    </FormDialog>
  )
}

export function SchedulePage() {
  const { school, myClasses, now } = useTeacher()
  const [draft, setDraft] = useState<Draft | null>(null)

  const mine = new Set(myClasses.map((c) => c.id))
  const entries = school.schedule.filter((e) => mine.has(e.classId))
  // Entries that line up with a bell period go in the grid; the rest are listed underneath.
  const inGrid = (entry: ScheduleEntry) => school.periods.some((p) => p.start === entry.start)
  const others = entries.filter((e) => !inGrid(e)).sort((a, b) => a.day - b.day || a.start - b.start)

  const classOf = (entry: ScheduleEntry) => {
    const cls = school.classes.find((c) => c.id === entry.classId)
    const subject = cls && school.subjects.find((s) => s.id === cls.subjectId)
    return { cls, color: cls?.color ?? subject?.color ?? 'var(--accent)' }
  }

  const blank = (day: number, start: number, end: number, period?: number): Draft => ({
    classId: myClasses[0]?.id ?? '',
    day,
    start,
    end,
    period,
    repeat: false,
  })

  const chip = (entry: ScheduleEntry) => {
    const { cls, color } = classOf(entry)
    return (
      <button
        key={entry.id}
        type="button"
        className="schedule-chip"
        style={{ '--subject': color } as React.CSSProperties}
        onClick={() => setDraft({ ...entry, repeat: false })}
        title="Edit"
      >
        <span className="schedule-chip__name">{cls?.name}</span>
        <span className="schedule-chip__room">{entry.room || cls?.room}</span>
      </button>
    )
  }

  return (
    <>
      <PageTitle
        eyebrow="Schedule"
        title="My week"
        action={
          <button
            type="button"
            className="button button--primary"
            disabled={myClasses.length === 0}
            onClick={() => setDraft(blank(1, school.periods[0].start, school.periods[0].end, school.periods[0].number))}
          >
            <Plus size={15} /> Add Entry
          </button>
        }
      />
      <p className="teacher-note">
        Students don’t have their own schedules to maintain: each student’s timetable is built from the classes they’re
        enrolled in. Click an empty slot to add a class, or an entry to change it.
      </p>

      <section className="teacher-card glass week-grid" style={{ '--columns': WEEKDAYS.length } as React.CSSProperties}>
        <div className="week-grid__corner" />
        {WEEKDAYS.map((day) => (
          <div key={day.id} className={`week-grid__day${now.getDay() === day.id ? ' is-today' : ''}`}>
            {day.short}
          </div>
        ))}
        {school.periods.map((period) => (
          <div key={period.number} className="week-grid__row">
            <div className="week-grid__period">
              <strong>Period {period.number}</strong>
              <span>{formatSpan(period.start, period.end)}</span>
            </div>
            {WEEKDAYS.map((day) => {
              const here = entries.filter((e) => e.day === day.id && e.start === period.start)
              return (
                <div key={day.id} className="week-grid__cell">
                  {here.map(chip)}
                  {here.length === 0 && myClasses.length > 0 && (
                    <button
                      type="button"
                      className="week-grid__add"
                      onClick={() => setDraft(blank(day.id, period.start, period.end, period.number))}
                      aria-label={`Add a class on ${day.name}, period ${period.number}`}
                    >
                      <Plus size={14} /> Add Class
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </section>

      {others.length > 0 && (
        <Card title="Other times" hint="Entries that don't line up with a bell period.">
          <ul className="teacher-list">
            {others.map((entry) => (
              <li key={entry.id}>
                <button type="button" className="today-row" onClick={() => setDraft({ ...entry, repeat: false })}>
                  <span className="today-row__time">
                    {WEEKDAYS.find((d) => d.id === entry.day)?.short} {formatSpan(entry.start, entry.end)}
                  </span>
                  <span className="today-row__name">{classOf(entry).cls?.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {draft && <EntryDialog draft={draft} onClose={() => setDraft(null)} />}
    </>
  )
}
