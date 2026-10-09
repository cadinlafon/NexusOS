import { BellRing, Lightbulb, ListChecks } from 'lucide-react'
import { useState } from 'react'
import { ChatPanel } from '../../ai/ChatPanel'
import { RichText } from '../../ai/RichText'
import { ModelsPanel, VoicePanel } from '../../ai/tools'
import { describeAIError } from '../../services/ai/aiService'
import {
  assignmentProgress,
  classTrends,
  draftReminder,
  draftReviewQuestions,
  recommend,
  reminderSuggested,
  type AssignmentProgress,
  type Draft,
  type Recommendation,
} from '../../services/ai/classroomIntelligence'
import { modelLabel } from '../../services/ai/models'
import { Card, PageTitle } from '../parts'
import { useTeacher } from '../TeacherContext'

const tabs = [
  { id: 'chat', label: 'Chat' },
  { id: 'coding', label: 'Coding' },
  { id: 'image', label: 'Image' },
  { id: 'insights', label: 'Class insights' },
  { id: 'voice', label: 'Voice' },
  { id: 'models', label: 'Models' },
] as const

type TabId = (typeof tabs)[number]['id']

const percent = (share: number | null) => (share === null ? '—' : `${Math.round(share * 100)}%`)

type Loadable<T> = { status: 'loading' } | { status: 'done'; value: T } | { status: 'failed'; message: string }

/** Runs one AI request for a row and keeps its result, or its error, with that row. */
function useRowResults<T>() {
  const [results, setResults] = useState<Record<string, Loadable<T>>>({})
  const run = async (id: string, call: () => Promise<T>) => {
    setResults((current) => ({ ...current, [id]: { status: 'loading' } }))
    try {
      const value = await call()
      setResults((current) => ({ ...current, [id]: { status: 'done', value } }))
    } catch (error) {
      setResults((current) => ({ ...current, [id]: { status: 'failed', message: describeAIError(error).message } }))
    }
  }
  return { results, run }
}

function DraftBlock({ title, state }: { title: string; state?: Loadable<Draft> }) {
  if (!state) return null
  return (
    <div className="insight__draft">
      <div className="insight__draft-title">{title}</div>
      {state.status === 'loading' && <p className="site-note">Writing…</p>}
      {state.status === 'failed' && <p className="ai-error">{state.message}</p>}
      {state.status === 'done' && (
        <>
          <RichText text={state.value.text} />
          <div className="insight__draft-footer">
            <span className="ai-model">{modelLabel('chat', state.value.model)}</span>
            <button type="button" className="button" onClick={() => void navigator.clipboard.writeText(state.value.text)}>
              Copy
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** Counted progress for the teacher's classes, with optional AI opinions and drafts on top. */
function ClassInsights() {
  const { school, myClasses, classroom, now, go } = useTeacher()
  const progress = assignmentProgress(school, myClasses, classroom.roster, now)
  const trends = classTrends(progress)

  const recommendations = useRowResults<Recommendation>()
  const reminders = useRowResults<Draft>()
  const questions = useRowResults<Draft>()

  if (progress.length === 0) {
    return (
      <Card title="Class insights">
        <p className="teacher-card__empty">No assignments are set for your classes yet, so there is nothing to summarize.</p>
      </Card>
    )
  }

  const row = (p: AssignmentProgress) => {
    const id = p.assignment.id
    const advice = recommendations.results[id]
    return (
      <li key={id} className="insight">
        <div className="insight__head">
          <div>
            <div className="insight__title">{p.assignment.title}</div>
            <div className="site-note">
              {p.className} ·{' '}
              {p.daysUntilDue < 0 ? `Overdue by ${-p.daysUntilDue} day${p.daysUntilDue === -1 ? '' : 's'}` : p.daysUntilDue === 0 ? 'Due today' : `Due in ${p.daysUntilDue} day${p.daysUntilDue === 1 ? '' : 's'}`}
            </div>
          </div>
          {reminderSuggested(p) && (
            <span className="insight__flag" title="Due within two days and at least one connected student has not started. This is a fixed rule, not AI.">
              <BellRing size={12} /> Reminder suggested
            </span>
          )}
        </div>

        <dl className="insight__counts">
          <div>
            <dt>Not started</dt>
            <dd>{p.notStarted}</dd>
          </div>
          <div>
            <dt>In progress</dt>
            <dd>{p.inProgress}</dd>
          </div>
          <div>
            <dt>Submitted</dt>
            <dd>{p.submitted}</dd>
          </div>
          <div className="is-unknown">
            <dt>Not known</dt>
            <dd>{p.unknown}</dd>
          </div>
        </dl>

        <div className="insight__actions">
          <button type="button" className="button" disabled={advice?.status === 'loading'} onClick={() => void recommendations.run(id, () => recommend(p))}>
            <Lightbulb size={13} /> {advice?.status === 'loading' ? 'Asking…' : 'Get a recommendation'}
          </button>
          <button type="button" className="button" disabled={reminders.results[id]?.status === 'loading'} onClick={() => void reminders.run(id, () => draftReminder(p))}>
            <BellRing size={13} /> Draft a reminder
          </button>
          <button type="button" className="button" disabled={questions.results[id]?.status === 'loading'} onClick={() => void questions.run(id, () => draftReviewQuestions(p))}>
            <ListChecks size={13} /> Review questions
          </button>
        </div>

        {advice?.status === 'failed' && <p className="ai-error">{advice.message}</p>}
        {advice?.status === 'done' && (
          <div className="insight__advice">
            <div>
              <strong>{advice.value.remind >= 0.5 ? 'A reminder looks worthwhile' : 'A reminder may not be needed'}</strong> (
              {Math.round(advice.value.remind * 100)}% likelihood)
              {advice.value.priority && <> · Follow-up priority: {advice.value.priority}</>}
            </div>
            <span className="ai-model">{modelLabel('decisions', advice.value.model)}</span>
            <p className="site-note">An opinion from the totals above. It has sent nothing and changed nothing.</p>
          </div>
        )}
        <DraftBlock title="Reminder draft" state={reminders.results[id]} />
        {reminders.results[id]?.status === 'done' && (
          <button type="button" className="button insight__send" onClick={() => go({ page: 'messages' })}>
            Open Messages to send it yourself
          </button>
        )}
        <DraftBlock title="Review questions" state={questions.results[id]} />
      </li>
    )
  }

  return (
    <>
      <Card title="Across your classes" hint="Counted by NEXUS from your classes’ assignments. No AI is involved in these numbers.">
        <dl className="insight__counts insight__counts--wide">
          <div>
            <dt>Assignments</dt>
            <dd>{trends.assignments}</dd>
          </div>
          <div>
            <dt>Due within 2 days</dt>
            <dd>{trends.dueWithinTwoDays}</dd>
          </div>
          <div>
            <dt>Overdue</dt>
            <dd>{trends.overdue}</dd>
          </div>
          <div>
            <dt>Not started (of known)</dt>
            <dd>{percent(trends.notStartedShare)}</dd>
          </div>
          <div>
            <dt>Students reporting</dt>
            <dd>{percent(trends.reportingShare)}</dd>
          </div>
        </dl>
        <p className="site-note">
          Progress is only known for student desktops that are connected right now; everyone else is counted as “Not
          known”, not as behind. The classes and assignments are still example school data.
        </p>
      </Card>

      <Card title="Assignments" hint="Recommendations and drafts are suggestions. Nothing is sent, graded or changed unless you do it.">
        <ul className="insights">{progress.map(row)}</ul>
      </Card>
    </>
  )
}

/** NEXUS AI in ClassroomOS. */
export function AIPage() {
  const [tab, setTab] = useState<TabId>('chat')

  return (
    <>
      <PageTitle eyebrow="NEXUS AI" title="Teaching assistant" />
      <div className="segmented teacher-tabs" role="tablist">
        {tabs.map((entry) => (
          <button key={entry.id} type="button" role="tab" aria-checked={tab === entry.id} aria-selected={tab === entry.id} onClick={() => setTab(entry.id)}>
            {entry.label}
          </button>
        ))}
      </div>

      {/* Every tab stays mounted, so a conversation is still there when you come back to it. */}
      <section className="teacher-card glass teacher-ai" hidden={tab !== 'chat'}>
        <ChatPanel
          capability="chat"
          persona="teacher"
          allowed
          heading="What are you working on?"
          placeholder="Ask NEXUS AI..."
          suggestions={['Draft a lesson starter on Newton’s laws', 'Write five practice questions on quadratic equations']}
        />
      </section>
      <section className="teacher-card glass teacher-ai" hidden={tab !== 'coding'}>
        <ChatPanel capability="coding" persona="teacher" allowed heading="What are you building?" placeholder="Ask about code, or paste an error..." />
      </section>
      <section className="teacher-card glass teacher-ai" hidden={tab !== 'image'}>
        <ChatPanel capability="image" persona="teacher" allowed heading="Show me a picture" placeholder="Attach a picture and ask about it..." />
      </section>
      <div hidden={tab !== 'insights'} className="stack">
        <ClassInsights />
      </div>
      <section className="teacher-card glass" hidden={tab !== 'voice'}>
        <VoicePanel allowed />
      </section>
      <section className="teacher-card glass" hidden={tab !== 'models'}>
        <ModelsPanel role="teacher" />
      </section>
    </>
  )
}
