import { ArrowLeft, Check, Play, Send } from 'lucide-react'
import { getApp } from '../data/apps'
import { AppIcon } from '../components/AppIcon'
import { AssignmentStatus } from '../components/AssignmentStatus'
import { useNexus } from '../state/NexusContext'
import { dueLabel } from '../state/selectors'

interface AssignmentPageProps {
  assignmentId: string
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

/** The assignment experience: read it, start it, work on it, hand it in. */
export function AssignmentPage({ assignmentId }: AssignmentPageProps) {
  const { getAssignment, getSubject, now, navigate, setAssignmentStatus, workOnAssignment, launchApp } =
    useNexus()
  const assignment = getAssignment(assignmentId)

  if (!assignment) {
    return (
      <div className="page">
        <div className="empty glass">This assignment is no longer available.</div>
      </div>
    )
  }

  const subject = getSubject(assignment.subjectId)
  const recommended = getApp(assignment.recommendedApp)
  const { status } = assignment

  return (
    <div className="page" style={{ '--subject': subject?.color ?? 'var(--accent)' } as React.CSSProperties}>
      <header className="page-header">
        <button
          type="button"
          className="back-link"
          onClick={() => navigate({ kind: 'page', id: 'assignments' })}
        >
          <ArrowLeft size={14} /> Assignments
        </button>
        <button
          type="button"
          className="assignment-subject"
          onClick={() => subject && navigate({ kind: 'subject', id: subject.id })}
        >
          <span className="subject-dot" />
          {subject?.name} · {subject?.teacher}
        </button>
        <h1 className="page-header__title">{assignment.title}</h1>
        <p className="page-header__description">{assignment.description}</p>
      </header>

      <section className="assignment-bar glass">
        <div className="assignment-bar__status">
          <AssignmentStatus status={status} />
          <span className="assignment-bar__due">
            {status === 'submitted' ? 'Handed in' : dueLabel(assignment.dueDate, now)} ·{' '}
            {formatDate(assignment.dueDate)}
          </span>
        </div>

        <div className="assignment-bar__actions">
          {status === 'not_started' && (
            <button
              type="button"
              className="button button--primary"
              onClick={() => setAssignmentStatus(assignment.id, 'in_progress')}
            >
              <Play size={14} /> Start assignment
            </button>
          )}
          {status === 'in_progress' && (
            <button
              type="button"
              className="button button--primary"
              onClick={() => setAssignmentStatus(assignment.id, 'submitted')}
            >
              <Send size={14} /> Submit
            </button>
          )}
          {status === 'submitted' && (
            <span className="assignment-bar__done">
              <Check size={15} /> Submitted
            </span>
          )}
        </div>
      </section>

      <div className="assignment-layout">
        <section className="detail-card glass">
          <div className="eyebrow">Instructions</div>
          <ol className="instructions">
            {assignment.instructions.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="detail-card__meta">Assigned {formatDate(assignment.assignedDate)}</div>
        </section>

        <aside className="assignment-side">
          <section className="detail-card glass">
            <div className="eyebrow">Recommended app</div>
            <div className="recommended-app">
              <AppIcon app={recommended} size="lg" />
              <div>
                <div className="recommended-app__name">{recommended.name}</div>
                <div className="recommended-app__hint">
                  {status === 'not_started' ? 'Opening it starts the assignment.' : 'Pick up where you left off.'}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="button button--wide"
              onClick={() => workOnAssignment(assignment.id)}
              disabled={status === 'submitted'}
            >
              Open in {recommended.name}
            </button>
          </section>

          <section className="detail-card glass">
            <div className="eyebrow">Allowed for this assignment</div>
            <div className="chip-row">
              {assignment.allowedApps.map((id) => (
                <button key={id} type="button" className="chip" onClick={() => launchApp(id)}>
                  <AppIcon app={getApp(id)} size="sm" />
                  {getApp(id).name}
                </button>
              ))}
            </div>
            {assignment.allowedWebsites.length > 0 && (
              <div className="detail-card__meta">Websites: {assignment.allowedWebsites.join(', ')}</div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
