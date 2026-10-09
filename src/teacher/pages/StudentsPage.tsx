import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { students as directory } from '../../data/mockData'
import { PageTitle, StudentPanel } from '../parts'
import { useTeacher } from '../TeacherContext'

/** The teacher's students, from enrolment in their classes, with live status. */
export function StudentsPage() {
  const { myClasses, online, classroom } = useTeacher()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Everyone enrolled in at least one of this teacher's classes, once each.
  const enrolledIds = new Set(myClasses.flatMap((cls) => cls.studentIds))
  const mine = directory.filter((s) => enrolledIds.has(s.id) && s.name.toLowerCase().includes(query.trim().toLowerCase()))
  const selected = (selectedId && online(selectedId)) || mine.map((s) => online(s.id)).find((entry) => entry) || null

  // Viewing follows the student on show: switching away, or the student leaving, ends it.
  const { watchingId, watch } = classroom
  const selectedOnlineId = selected?.id ?? null
  useEffect(() => {
    if (watchingId && watchingId !== selectedOnlineId) watch(null)
  }, [watchingId, selectedOnlineId, watch])

  return (
    <>
      <PageTitle eyebrow="Students" title="My students" />
      <div className="students-layout">
        <section className="teacher-card glass">
          <label className="teacher-input">
            <Search size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search students" aria-label="Search students" />
          </label>
          <div className="teacher-roster__list">
            {mine.map((person) => {
              const entry = online(person.id)
              const classes = myClasses.filter((cls) => cls.studentIds.includes(person.id))
              return (
                <button
                  key={person.id}
                  type="button"
                  className={`roster-row${entry && entry.id === selected?.id ? ' is-active' : ''}`}
                  disabled={!entry}
                  onClick={() => setSelectedId(person.id)}
                >
                  <span className="avatar avatar--soft">{person.initials}</span>
                  <span className="roster-row__text">
                    <span className="roster-row__name">{person.name}</span>
                    <span className="roster-row__status">
                      {entry ? `Online · ${entry.viewing}` : 'Not connected'} · {classes.length} of your{' '}
                      {classes.length === 1 ? 'class' : 'classes'}
                    </span>
                  </span>
                  <span className={`live-dot${entry ? '' : ' live-dot--idle'}`} />
                </button>
              )
            })}
            {mine.length === 0 && <p className="teacher-card__empty">No students match.</p>}
          </div>
        </section>

        {selected ? (
          <StudentPanel
            student={selected}
            watching={watchingId === selected.id}
            screen={classroom.screen}
            onWatch={(on) => watch(on ? selected.id : null)}
          />
        ) : (
          <section className="teacher-card glass teacher-empty">
            <h2>No students connected</h2>
            <p>A student appears here when their NEXUS desktop is open (http://localhost:5173).</p>
          </section>
        )}
      </div>
    </>
  )
}
