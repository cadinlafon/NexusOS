import { AssignmentCard } from '../components/AssignmentCard'
import { PageHeader } from '../components/PageHeader'
import { SectionHeader } from '../components/SectionHeader'
import { useNexus } from '../state/NexusContext'
import { openAssignments } from '../state/selectors'

export function Assignments() {
  const { assignments } = useNexus()
  const open = openAssignments(assignments)
  const submitted = assignments.filter((a) => a.status === 'submitted')

  return (
    <div className="page">
      <PageHeader
        eyebrow="Assignments"
        title="Your work"
        description="Everything you’ve been set, across all of your subjects. Open one to start it."
      />

      <section className="section">
        <SectionHeader eyebrow="To do" title={open.length === 1 ? '1 assignment' : `${open.length} assignments`} />
        {open.length > 0 ? (
          <div className="assignment-grid">
            {open.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        ) : (
          <div className="empty glass">You’re all caught up. Nothing left to hand in.</div>
        )}
      </section>

      {submitted.length > 0 && (
        <section className="section">
          <SectionHeader eyebrow="Done" title="Handed in" />
          <div className="assignment-grid">
            {submitted.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
