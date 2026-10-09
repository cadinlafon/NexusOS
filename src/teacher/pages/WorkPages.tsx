import { useProfile } from '../../auth/AuthProvider'
import { initialsOf } from '../../auth/types'
import { Send, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { getApp } from '../../data/apps'
import { students as directory } from '../../data/mockData'
import { classApps } from '../../school/timeEngine'
import { type SchoolAssignment } from '../../school/types'
import { statusLabels } from '../../state/selectors'
import { type AppId } from '../../types/nexus'
import { Card, Field, PageTitle } from '../parts'
import { newId, useTeacher } from '../TeacherContext'

const NoClasses = () => (
  <section className="teacher-card glass teacher-empty">
    <h2>No classes yet</h2>
    <p>Create a class first; work and messages go to the students enrolled in it.</p>
  </section>
)

/** Set work for a class. It reaches every student enrolled in that class, through the school model. */
export function AssignmentsPage() {
  const { school, myClasses, update, online, confirm } = useTeacher()
  const [classId, setClassId] = useState(myClasses[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueIn, setDueIn] = useState(3)
  const [appId, setAppId] = useState<AppId | ''>('')

  if (myClasses.length === 0) return <NoClasses />
  const cls = myClasses.find((c) => c.id === classId) ?? myClasses[0]
  const appChoices = classApps(school, cls)
  const recommendedApp = appId && appChoices.includes(appId) ? appId : (appChoices[0] ?? 'docs')

  const create = (event: FormEvent) => {
    event.preventDefault()
    const due = new Date()
    due.setDate(due.getDate() + dueIn)
    due.setHours(23, 59, 0, 0)
    const assignment: SchoolAssignment = {
      id: newId('asg'),
      classId: cls.id,
      title: title.trim(),
      description: description.trim(),
      instructions: description.trim() ? [description.trim()] : [],
      assignedDate: new Date().toISOString(),
      dueDate: due.toISOString(),
      recommendedApp,
    }
    update((s) => ({ ...s, assignments: [...s.assignments, assignment] }))
    confirm(`“${assignment.title}” assigned to the ${cls.studentIds.length} students in ${cls.name}.`)
    setTitle('')
    setDescription('')
  }

  const mine = school.assignments.filter((a) => myClasses.some((c) => c.id === a.classId))

  return (
    <>
      <PageTitle eyebrow="Assignments" title="Set work" />
      <Card title="New assignment" hint="Goes to everyone enrolled in the class, including students who connect later.">
        <form className="stack" onSubmit={create}>
          <div className="field-row">
            <Field label="Class">
              <select value={cls.id} onChange={(e) => setClassId(e.target.value)}>
                {myClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.studentIds.length} students)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Due">
              <select value={dueIn} onChange={(e) => setDueIn(Number(e.target.value))}>
                <option value={1}>Tomorrow</option>
                <option value={3}>In 3 days</option>
                <option value={7}>In a week</option>
                <option value={14}>In two weeks</option>
              </select>
            </Field>
          </div>
          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Build a to-do list component" />
          </Field>
          <Field label="Instructions">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What students should do" />
          </Field>
          <div className="field-row">
            <Field label="Recommended app" hint="From this class's applications.">
              <select value={recommendedApp} onChange={(e) => setAppId(e.target.value as AppId)}>
                {appChoices.map((id) => (
                  <option key={id} value={id}>
                    {getApp(id).name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="field field--end">
              <button type="submit" className="button button--primary" disabled={!title.trim()}>
                Assign to class
              </button>
            </div>
          </div>
        </form>
      </Card>

      <Card title="Assigned" hint="Progress shows for students whose desktops are connected.">
        {mine.length > 0 ? (
          <ul className="teacher-list">
            {mine.map((assignment) => {
              const target = school.classes.find((c) => c.id === assignment.classId)
              const statuses = (target?.studentIds ?? [])
                .map((id) => online(id)?.assignments.find((a) => a.id === assignment.id)?.status)
                .filter((status) => status !== undefined)
              return (
                <li key={assignment.id}>
                  <span className="teacher-list__label">
                    <span>
                      {assignment.title}
                      <span className="site-note">
                        {target?.name} · due {new Date(assignment.dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {statuses.length > 0 && ` · ${statuses.map((s) => statusLabels[s]).join(', ')}`}
                      </span>
                    </span>
                  </span>
                  <button
                    type="button"
                    className="app-icon-button"
                    onClick={() => update((s) => ({ ...s, assignments: s.assignments.filter((a) => a.id !== assignment.id) }))}
                    aria-label={`Delete ${assignment.title}`}
                    title="Stop assigning (students who already have it keep it)"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="teacher-card__empty">Nothing assigned yet.</p>
        )}
      </Card>
    </>
  )
}

type Audience = 'class' | 'selected' | 'individual'

/** Message a class, some of it, or one student. Recipients come from the class's enrolment. */
export function MessagesPage() {
  const { myClasses, classroom, online, confirm } = useTeacher()
  const profile = useProfile()
  const [classId, setClassId] = useState(myClasses[0]?.id ?? '')
  const [audience, setAudience] = useState<Audience>('class')
  const [chosen, setChosen] = useState<string[]>([])
  const [text, setText] = useState('')
  const [sent, setSent] = useState<{ id: string; to: string; text: string; reached: number; total: number }[]>([])

  if (myClasses.length === 0) return <NoClasses />
  const cls = myClasses.find((c) => c.id === classId) ?? myClasses[0]
  const enrolled = cls.studentIds.map((id) => directory.find((s) => s.id === id)).filter((s) => s !== undefined)
  const recipients = audience === 'class' ? cls.studentIds : chosen.filter((id) => cls.studentIds.includes(id))
  const reached = recipients.filter((id) => online(id)).length

  const pick = (id: string) =>
    setChosen((current) =>
      audience === 'individual' ? [id] : current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    )

  const send = (event: FormEvent) => {
    event.preventDefault()
    const message = text.trim()
    if (!message || recipients.length === 0) return
    classroom.send(recipients, {
      type: 'message',
      from: { name: profile.displayName, initials: initialsOf(profile.displayName), subjectId: cls.subjectId },
      text: message,
    })
    const to =
      audience === 'class'
        ? cls.name
        : recipients.map((id) => directory.find((s) => s.id === id)?.name).join(', ')
    setSent((log) => [{ id: newId('msg'), to, text: message, reached, total: recipients.length }, ...log])
    confirm(`Sent to ${reached} of ${recipients.length} (connected now).`)
    setText('')
  }

  return (
    <>
      <PageTitle eyebrow="Messages" title="Message students" />
      <Card title="New message" hint="Messages are delivered to desktops that are connected right now. Nothing is stored for later yet.">
        <form className="stack" onSubmit={send}>
          <div className="field-row">
            <Field label="Class">
              <select
                value={cls.id}
                onChange={(e) => {
                  setClassId(e.target.value)
                  setChosen([])
                }}
              >
                {myClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="field">
              <span className="field__label">Send to</span>
              <div className="segmented" role="radiogroup" aria-label="Send to">
                {(
                  [
                    ['class', 'Entire class'],
                    ['selected', 'Selected students'],
                    ['individual', 'One student'],
                  ] as [Audience, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={audience === id}
                    onClick={() => {
                      setAudience(id)
                      setChosen((c) => (id === 'individual' ? c.slice(0, 1) : c))
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {audience !== 'class' && (
            <ul className="teacher-list">
              {enrolled.map((s) => (
                <li key={s.id}>
                  <label className="check-row">
                    <input
                      type={audience === 'individual' ? 'radio' : 'checkbox'}
                      name="recipient"
                      checked={chosen.includes(s.id)}
                      onChange={() => pick(s.id)}
                    />
                    <span>{s.name}</span>
                  </label>
                  <span className="teacher-list__detail">
                    <span className={`live-dot${online(s.id) ? '' : ' live-dot--idle'}`} /> {online(s.id) ? 'Online' : 'Not connected'}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Field label="Message">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Remember to commit your work before the bell." />
          </Field>
          <div className="stack__footer">
            <span className="teacher-list__detail">
              {recipients.length} {recipients.length === 1 ? 'recipient' : 'recipients'} · {reached} connected now
            </span>
            <button type="submit" className="button button--primary" disabled={!text.trim() || recipients.length === 0}>
              <Send size={14} /> Send
            </button>
          </div>
        </form>
      </Card>

      <Card title="Sent this session">
        {sent.length > 0 ? (
          <ul className="teacher-list">
            {sent.map((message) => (
              <li key={message.id}>
                <span className="teacher-list__label">
                  <span>
                    {message.text}
                    <span className="site-note">
                      To {message.to} · reached {message.reached} of {message.total}
                    </span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="teacher-card__empty">Nothing sent yet.</p>
        )}
      </Card>
    </>
  )
}
