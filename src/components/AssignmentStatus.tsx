import { statusLabels } from '../state/selectors'
import { type AssignmentStatus as Status } from '../types/nexus'

const order: Status[] = ['not_started', 'in_progress', 'submitted']

/** Three-step indicator for Not started → In progress → Submitted. */
export function AssignmentStatus({ status }: { status: Status }) {
  const reached = order.indexOf(status)
  return (
    <div className={`steps steps--${status}`}>
      <div className="steps__track" aria-hidden="true">
        {order.map((step, index) => (
          <span key={step} className={index <= reached ? 'is-reached' : undefined} />
        ))}
      </div>
      <span className="steps__label">{statusLabels[status]}</span>
    </div>
  )
}
