import { ArrowUpRight, Check, Send } from 'lucide-react'
import { useState } from 'react'
import { useNexus } from '../state/NexusContext'
import { dueLabel, statusLabels } from '../state/selectors'

/**
 * Edits one document at a time: the test paper during a test, otherwise the
 * student's active assignment, otherwise a scratch document. Drafts live in
 * the central state, so they survive the window closing.
 */
export function DocsApp() {
  const {
    documents,
    updateDocument,
    assignments,
    activeAssignmentId,
    testMode,
    now,
    getSubject,
    setAssignmentStatus,
    openAssignment,
  } = useNexus()
  const [dirty, setDirty] = useState(false)

  const assignment = testMode ? undefined : assignments.find((a) => a.id === activeAssignmentId)
  const key = testMode ? 'test' : (assignment?.id ?? 'scratch')
  const draft = documents[key] ?? { title: assignment?.title ?? 'Untitled document', body: '' }
  const submitted = assignment?.status === 'submitted'

  const edit = (patch: Partial<typeof draft>) => {
    updateDocument(key, { ...draft, ...patch })
    setDirty(true)
    // Writing is starting: reflect that everywhere the assignment appears.
    if (assignment?.status === 'not_started') setAssignmentStatus(assignment.id, 'in_progress')
  }

  const words = draft.body.trim() ? draft.body.trim().split(/\s+/).length : 0
  const status = submitted ? 'Submitted' : dirty ? 'Unsaved changes' : 'Saved'

  return (
    <div className="app docs">
      <header className="app-toolbar">
        <input
          className="docs__title"
          value={draft.title}
          onChange={(event) => edit({ title: event.target.value })}
          aria-label="Document title"
          placeholder="Untitled document"
          readOnly={submitted}
        />
        <span
          className={`docs__status docs__status--${submitted ? 'submitted' : dirty ? 'unsaved' : 'saved'}`}
        >
          {status}
        </span>
        <button type="button" className="app-button" onClick={() => setDirty(false)} disabled={!dirty || submitted}>
          <Check size={14} />
          Save
        </button>
        {assignment && (
          <button
            type="button"
            className="app-button app-button--primary"
            onClick={() => {
              setDirty(false)
              setAssignmentStatus(assignment.id, 'submitted')
            }}
            disabled={submitted}
          >
            <Send size={13} />
            Submit
          </button>
        )}
      </header>

      <div className="docs__scroll">
        <div className="docs__page">
          <textarea
            className="docs__editor"
            value={draft.body}
            onChange={(event) => edit({ body: event.target.value })}
            aria-label="Document text"
            placeholder="Start writing…"
            readOnly={submitted}
            spellCheck
          />
        </div>
      </div>

      <footer className="app-statusbar">
        <span>
          {words} {words === 1 ? 'word' : 'words'}
        </span>
        {testMode ? (
          <span>Test document</span>
        ) : assignment ? (
          <button type="button" className="docs__assignment" onClick={() => openAssignment(assignment.id)}>
            {getSubject(assignment.subjectId)?.name} · {assignment.title} ·{' '}
            {submitted ? statusLabels.submitted : dueLabel(assignment.dueDate, now)}
            <ArrowUpRight size={12} />
          </button>
        ) : (
          <span>Not linked to an assignment</span>
        )}
      </footer>
    </div>
  )
}
