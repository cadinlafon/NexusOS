import { ArrowLeft, Globe, MessageCircle, Pencil, Plus, Search, Trash2, UserPlus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { resolveAddress } from '../../browser/address'
import { students as directory } from '../../data/mockData'
import { canManageClass } from '../../school/access'
import { classApps, classPeriod, describeSchedule } from '../../school/timeEngine'
import { type SchoolClass } from '../../school/types'
import { AppChecklist, Card, FormDialog, PolicyEditor, SubjectTile, WebsiteEditor } from '../parts'
import { useTeacher } from '../TeacherContext'
import { ClassDialog } from './ClassesPage'

type Tab = 'students' | 'apps' | 'websites' | 'policy' | 'schedule'
const tabs: { id: Tab; label: string }[] = [
  { id: 'students', label: 'Students' },
  { id: 'apps', label: 'Applications' },
  { id: 'websites', label: 'Websites' },
  { id: 'policy', label: 'Policy' },
  { id: 'schedule', label: 'Schedule' },
]

/** Pick students from the school directory. Nobody is created here; enrolment only refers to them. */
function StudentPicker({ cls, onClose }: { cls: SchoolClass; onClose: () => void }) {
  const { update, confirm } = useTeacher()
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<string[]>([])
  const candidates = directory.filter(
    (s) => !cls.studentIds.includes(s.id) && s.name.toLowerCase().includes(query.trim().toLowerCase()),
  )
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))

  const add = () => {
    update((s) => ({
      ...s,
      classes: s.classes.map((c) => (c.id === cls.id ? { ...c, studentIds: [...c.studentIds, ...chosen] } : c)),
    }))
    confirm(`Added ${chosen.length} ${chosen.length === 1 ? 'student' : 'students'} to ${cls.name}.`)
    onClose()
  }

  return (
    <FormDialog
      title="Add students"
      submitLabel={chosen.length > 0 ? `Add ${chosen.length}` : 'Add'}
      canSubmit={chosen.length > 0}
      onSubmit={add}
      onClose={onClose}
    >
      <label className="teacher-input">
        <Search size={14} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the student directory" autoFocus />
      </label>
      {candidates.length > 0 ? (
        <ul className="teacher-list teacher-list--scroll">
          {candidates.map((s) => (
            <li key={s.id}>
              <label className="check-row">
                <input type="checkbox" checked={chosen.includes(s.id)} onChange={() => toggle(s.id)} />
                <span className="avatar avatar--soft">{s.initials}</span>
                <span>
                  {s.name}
                  <span className="site-note">
                    {s.grade} · {s.studentNumber}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="teacher-card__empty">
          {query ? 'No students match that search.' : 'Every student in the directory is already in this class.'}
        </p>
      )}
    </FormDialog>
  )
}

export function ClassPage({ classId }: { classId: string }) {
  const { school, teacher, update, go, online, classroom, confirm } = useTeacher()
  const [tab, setTab] = useState<Tab>('students')
  const [dialog, setDialog] = useState<'edit' | 'students' | null>(null)
  const [address, setAddress] = useState('')

  const cls = school.classes.find((c) => c.id === classId)
  const subject = cls && school.subjects.find((s) => s.id === cls.subjectId)
  if (!cls || !subject) {
    return (
      <section className="teacher-card glass teacher-empty">
        <h2>This class no longer exists</h2>
        <p>It may have been deleted.</p>
      </section>
    )
  }

  const editable = canManageClass(teacher.id, cls)
  const patch = (change: Partial<SchoolClass>) =>
    update((s) => ({ ...s, classes: s.classes.map((c) => (c.id === cls.id ? { ...c, ...change } : c)) }))

  const enrolled = cls.studentIds.map((id) => directory.find((s) => s.id === id)).filter((s) => s !== undefined)
  const onlineIds = cls.studentIds.filter((id) => online(id))
  const period = classPeriod(school, cls.id)
  const times = describeSchedule(school, cls.id)
  const teacherName = school.teachers.find((t) => t.id === cls.teacherId)?.name

  const remove = () => {
    if (!window.confirm(`Delete ${cls.name}? Its schedule entries and assignments go with it.`)) return
    update((s) => ({
      ...s,
      classes: s.classes.filter((c) => c.id !== cls.id),
      schedule: s.schedule.filter((e) => e.classId !== cls.id),
      assignments: s.assignments.filter((a) => a.classId !== cls.id),
    }))
    go({ page: 'classes' })
  }

  const openWebsite = (event: FormEvent) => {
    event.preventDefault()
    const resolved = resolveAddress(address)
    if (!resolved) return
    classroom.send(cls.studentIds, { type: 'openUrl', url: resolved.url })
    confirm(`Opened ${resolved.url} on ${onlineIds.length} connected ${onlineIds.length === 1 ? 'desktop' : 'desktops'}.`)
    setAddress('')
  }

  return (
    <>
      <button type="button" className="back-link" onClick={() => go({ page: 'classes' })}>
        <ArrowLeft size={14} /> Classes
      </button>

      <section className="teacher-card glass class-hero">
        <SubjectTile icon={cls.icon ?? subject.icon} color={cls.color ?? subject.color} size={64} />
        <div className="class-hero__text">
          <div className="eyebrow">{subject.name}</div>
          <h1>{cls.name}</h1>
          <p>
            {[period && `Period ${period}`, ...times, cls.room, cls.grade, teacherName].filter(Boolean).join(' · ') ||
              'Not on the schedule yet'}
          </p>
          <p>
            {cls.studentIds.length} {cls.studentIds.length === 1 ? 'student' : 'students'} · {onlineIds.length} online
            {cls.description && ` · ${cls.description}`}
          </p>
        </div>
        {editable && (
          <div className="class-hero__actions">
            <button type="button" className="button" onClick={() => setDialog('edit')}>
              <Pencil size={14} /> Edit Class
            </button>
            <button type="button" className="button" onClick={() => go({ page: 'messages' })}>
              <MessageCircle size={14} /> Message Class
            </button>
            <button type="button" className="button" onClick={() => go({ page: 'assignments' })}>
              <Plus size={14} /> Create Assignment
            </button>
          </div>
        )}
      </section>

      {!editable && (
        <p className="teacher-note">This class is taught by {teacherName}. You can view it but not change it.</p>
      )}

      <div className="segmented teacher-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-checked={tab === t.id} aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'students' && (
        <Card
          title={`${enrolled.length} ${enrolled.length === 1 ? 'student' : 'students'}`}
          action={
            editable && (
              <button type="button" className="button button--primary" onClick={() => setDialog('students')}>
                <UserPlus size={14} /> Add Students
              </button>
            )
          }
        >
          {enrolled.length > 0 ? (
            <ul className="teacher-list">
              {enrolled.map((s) => {
                const live = online(s.id)
                return (
                  <li key={s.id}>
                    <button type="button" className="today-row" onClick={() => go({ page: 'students' })} title="Open in Students">
                      <span className="avatar avatar--soft">{s.initials}</span>
                      <span className="today-row__name">{s.name}</span>
                      <span className="teacher-list__detail">
                        <span className={`live-dot${live ? '' : ' live-dot--idle'}`} /> {live ? `Online · ${live.viewing}` : 'Not connected'}
                      </span>
                    </button>
                    {editable && (
                      <button
                        type="button"
                        className="app-icon-button"
                        onClick={() => patch({ studentIds: cls.studentIds.filter((id) => id !== s.id) })}
                        aria-label={`Remove ${s.name} from the class`}
                        title="Remove from class"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="teacher-card__empty">No students yet. Add some from the school directory.</p>
          )}

          <form className="teacher-form" onSubmit={openWebsite}>
            <label className="teacher-input">
              <Globe size={14} />
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Open a website on this class's desktops"
                aria-label="Website address"
                spellCheck={false}
              />
            </label>
            <button type="submit" className="button" disabled={!address.trim() || onlineIds.length === 0}>
              Open
            </button>
          </form>
        </Card>
      )}

      {tab === 'apps' && (
        <Card
          title="Class applications"
          hint="Brought to the front of each student's dock while this class is in session."
          action={
            editable && (
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={cls.appIds === null}
                  onChange={(e) => patch({ appIds: e.target.checked ? null : classApps(school, cls) })}
                />
                Use {subject.name}’s list
              </label>
            )
          }
        >
          <AppChecklist
            selected={classApps(school, cls)}
            disabled={!editable || cls.appIds === null}
            onChange={(appIds) => patch({ appIds })}
          />
        </Card>
      )}

      {tab === 'websites' && (
        <Card title="Class websites" hint="Offered to students in NEXUS Browser and on the subject page during this class.">
          <WebsiteEditor
            websites={cls.websites}
            inherited={subject.websites}
            inheritedFrom={`From ${subject.name}`}
            readOnly={!editable}
            onChange={(websites) => patch({ websites })}
          />
        </Card>
      )}

      {tab === 'policy' && (
        <Card title="Class policy" hint="Applies on student desktops only while this class is in session, on top of school policy.">
          <PolicyEditor policy={cls.policy} readOnly={!editable} onChange={(policy) => patch({ policy })} />
        </Card>
      )}

      {tab === 'schedule' && (
        <Card
          title="Schedule"
          action={
            <button type="button" className="button" onClick={() => go({ page: 'schedule' })}>
              Edit Schedule
            </button>
          }
        >
          {times.length > 0 ? (
            <ul className="teacher-list">
              {times.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="teacher-card__empty">This class isn’t on the schedule yet, so students won’t see it as a current class.</p>
          )}
        </Card>
      )}

      {editable && (
        <div>
          <button type="button" className="button button--quiet-danger" onClick={remove}>
            <Trash2 size={14} /> Delete class
          </button>
        </div>
      )}

      {dialog === 'edit' && <ClassDialog existing={cls} onClose={() => setDialog(null)} />}
      {dialog === 'students' && <StudentPicker cls={cls} onClose={() => setDialog(null)} />}
    </>
  )
}
