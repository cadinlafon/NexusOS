import { useProfile } from '../../auth/AuthProvider'
import { Check, X } from 'lucide-react'
import { testSession } from '../../data/mockData'
import { formatSpan, sessionAt, sessionsAfter, teacherSchedule, type ClassSession } from '../../school/timeEngine'
import { Card, PageTitle, SubjectTile } from '../parts'
import { useTeacher } from '../TeacherContext'

const greeting = (hour: number) => (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening')

export function DashboardPage() {
  const { teacher, school, now, go, online, classroom, confirm } = useTeacher()
  const profile = useProfile()
  const today = teacherSchedule(school, teacher.id, now)
  const current = sessionAt(today, now)
  const next = sessionsAfter(today, now)[0] ?? null

  const onlineIn = (session: ClassSession) => session.class.studentIds.filter((id) => online(id)).length

  const requests = classroom.roster
    .filter((entry) => entry.online)
    .flatMap((entry) => entry.accessRequests.map((request) => ({ ...request, student: entry })))

  const decide = (request: (typeof requests)[number], approved: boolean) => {
    // Approval lifts the restriction for the class, then tells the student.
    if (approved) classroom.setPermission(request.key, 'allowed')
    classroom.send(request.student.id, { type: 'accessDecision', key: request.key, label: request.label, approved })
    confirm(`${approved ? 'Approved' : 'Denied'} ${request.label} for ${request.student.name}.`)
  }

  const sessionCard = (label: string, session: ClassSession | null, empty: string) => (
    <Card>
      <div className="eyebrow">{label}</div>
      {session ? (
        <button type="button" className="now-class" onClick={() => go({ page: 'class', classId: session.class.id })}>
          <SubjectTile icon={session.class.icon ?? session.subject.icon} color={session.class.color ?? session.subject.color} size={52} />
          <span className="now-class__text">
            <span className="now-class__name">{session.class.name}</span>
            <span className="now-class__meta">
              {formatSpan(session.start, session.end)} · {session.room} · {session.class.studentIds.length} students
            </span>
            {label === 'Current class' && (
              <span className="now-class__online">
                <span className="live-dot" /> {onlineIn(session)} online
                <span className="now-class__offline">
                  {session.class.studentIds.length - onlineIn(session)} not connected
                </span>
              </span>
            )}
          </span>
        </button>
      ) : (
        <p className="teacher-card__empty">{empty}</p>
      )}
    </Card>
  )

  return (
    <>
      <PageTitle
        eyebrow={now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        title={`${greeting(now.getHours())}, ${profile.displayName}`}
      />

      <div className="teacher-grid">
        {sessionCard('Current class', current, today.length > 0 ? 'No class right now.' : 'You have no classes today.')}
        {sessionCard('Next class', next, 'Nothing else today.')}
      </div>

      <Card title="Today">
        {today.length > 0 ? (
          <ul className="teacher-list">
            {today.map((session) => (
              <li key={session.entry.id} className={session === current ? 'is-current' : undefined}>
                <button type="button" className="today-row" onClick={() => go({ page: 'class', classId: session.class.id })}>
                  <span className="today-row__time">{formatSpan(session.start, session.end)}</span>
                  <span className="subject-dot" style={{ '--subject': session.class.color ?? session.subject.color } as React.CSSProperties} />
                  <span className="today-row__name">{session.class.name}</span>
                  <span className="teacher-list__detail">
                    {session.class.studentIds.length} students · {session.room}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="teacher-card__empty">Nothing is timetabled for you today. Add entries on the Schedule page.</p>
        )}
      </Card>

      <div className="teacher-grid">
        <Card title="Access requests" hint="Approving allows the app or site for your students.">
          {requests.length > 0 ? (
            <ul className="teacher-list">
              {requests.map((request) => (
                <li key={`${request.student.id}:${request.key}`}>
                  <span>
                    <strong>{request.student.name}</strong> asked for {request.label}
                  </span>
                  <span className="teacher-list__actions">
                    <button type="button" className="app-button app-button--primary" onClick={() => decide(request, true)}>
                      <Check size={13} /> Approve
                    </button>
                    <button type="button" className="app-button" onClick={() => decide(request, false)}>
                      <X size={13} /> Deny
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="teacher-card__empty">No requests waiting.</p>
          )}
        </Card>

        <Card title="Test Mode" hint={`${testSession.title}. Connected desktops keep only the test's applications.`}>
          <button
            type="button"
            className={`button button--wide${classroom.classState.testMode ? '' : ' button--primary'}`}
            onClick={() => classroom.setTestMode(!classroom.classState.testMode)}
          >
            {classroom.classState.testMode ? 'End Test Mode' : 'Start Test Mode'}
          </button>
        </Card>
      </div>
    </>
  )
}
