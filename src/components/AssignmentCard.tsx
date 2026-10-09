import { useNexus } from '../state/NexusContext'
import { dueLabel } from '../state/selectors'
import { type Assignment } from '../types/nexus'
import { AssignmentStatus } from './AssignmentStatus'

interface AssignmentCardProps {
  assignment: Assignment
}

/** One assignment, wherever it appears. Clicking it opens the assignment. */
export function AssignmentCard({ assignment }: AssignmentCardProps) {
  const { getSubject, now, openAssignment } = useNexus()
  const subject = getSubject(assignment.subjectId)

  return (
    <button
      type="button"
      className="assignment-card glass lift"
      style={{ '--subject': subject?.color ?? 'var(--accent)' } as React.CSSProperties}
      onClick={() => openAssignment(assignment.id)}
    >
      <span className="assignment-card__meta">
        <span className="subject-dot" />
        <span>{subject?.name}</span>
        <span aria-hidden="true">•</span>
        <span>{assignment.status === 'submitted' ? 'Handed in' : dueLabel(assignment.dueDate, now)}</span>
      </span>
      <span className="assignment-card__title">{assignment.title}</span>
      <AssignmentStatus status={assignment.status} />
    </button>
  )
}
