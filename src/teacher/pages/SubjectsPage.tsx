import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { canManageSubject } from '../../school/access'
import { openClassPolicy } from '../../school/seed'
import { type SchoolSubject, type SubjectIconId } from '../../school/types'
import { AppChecklist, Card, Field, FormDialog, LookPicker, PageTitle, PolicyEditor, SubjectTile, WebsiteEditor } from '../parts'
import { newId, useTeacher } from '../TeacherContext'

/** Name, description and look. Apps, websites and policy are set on the subject's own page. */
function SubjectDialog({ existing, onClose }: { existing?: SchoolSubject; onClose: () => void }) {
  const { teacher, update, go, confirm } = useTeacher()
  const [draft, setDraft] = useState({
    name: existing?.name ?? '',
    description: existing?.description ?? '',
    icon: (existing?.icon ?? 'book') as SubjectIconId,
    color: existing?.color ?? '#60a5fa',
  })

  const save = () => {
    const fields = { ...draft, name: draft.name.trim() }
    if (existing) {
      update((s) => ({ ...s, subjects: s.subjects.map((x) => (x.id === existing.id ? { ...x, ...fields } : x)) }))
      confirm(`Saved ${fields.name}.`)
    } else {
      const created: SchoolSubject = {
        id: newId('sub'),
        ...fields,
        appIds: ['browser', 'docs'],
        websites: [],
        defaultPolicy: openClassPolicy,
        ownerId: teacher.id,
      }
      update((s) => ({ ...s, subjects: [...s.subjects, created] }))
      confirm(`Created ${created.name}. Choose its apps and websites next.`)
      go({ page: 'subject', subjectId: created.id })
    }
    onClose()
  }

  return (
    <FormDialog
      title={existing ? 'Edit subject' : 'Create a subject'}
      submitLabel={existing ? 'Save' : 'Create subject'}
      canSubmit={!!draft.name.trim()}
      onSubmit={save}
      onClose={onClose}
    >
      <Field label="Name">
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Biology" autoFocus />
      </Field>
      <Field label="Description">
        <input
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder="What students learn in this subject"
        />
      </Field>
      <Field label="Icon and color">
        <LookPicker icon={draft.icon} color={draft.color} onChange={(look) => setDraft({ ...draft, ...look })} />
      </Field>
    </FormDialog>
  )
}

export function SubjectsPage() {
  const { school, teacher, go } = useTeacher()
  const [adding, setAdding] = useState(false)

  return (
    <>
      <PageTitle
        eyebrow="Subjects"
        title="Subjects at school"
        action={
          <button type="button" className="button button--primary" onClick={() => setAdding(true)}>
            <Plus size={15} /> Create Subject
          </button>
        }
      />
      <p className="teacher-note">
        A subject is taught once and reused: every class in it starts with the subject’s apps, websites and policy.
      </p>

      <div className="class-grid">
        {school.subjects.map((subject) => {
          const classes = school.classes.filter((c) => c.subjectId === subject.id)
          return (
            <button key={subject.id} type="button" className="class-card glass lift" onClick={() => go({ page: 'subject', subjectId: subject.id })}>
              <SubjectTile icon={subject.icon} color={subject.color} size={48} />
              <span className="class-card__name">{subject.name}</span>
              <span className="class-card__meta">{subject.description || 'No description'}</span>
              <span className="class-card__meta">
                {classes.length} {classes.length === 1 ? 'class' : 'classes'} · {subject.appIds.length} apps · {subject.websites.length} websites
              </span>
              <span className="class-card__open">{canManageSubject(teacher.id, subject, school) ? 'Open Subject' : 'View'}</span>
            </button>
          )
        })}
      </div>

      {adding && <SubjectDialog onClose={() => setAdding(false)} />}
    </>
  )
}

export function SubjectPage({ subjectId }: { subjectId: string }) {
  const { school, teacher, update, go } = useTeacher()
  const [editing, setEditing] = useState(false)
  const subject = school.subjects.find((s) => s.id === subjectId)
  if (!subject) {
    return (
      <section className="teacher-card glass teacher-empty">
        <h2>This subject no longer exists</h2>
      </section>
    )
  }

  const editable = canManageSubject(teacher.id, subject, school)
  const classes = school.classes.filter((c) => c.subjectId === subject.id)
  const patch = (change: Partial<SchoolSubject>) =>
    update((s) => ({ ...s, subjects: s.subjects.map((x) => (x.id === subject.id ? { ...x, ...change } : x)) }))

  const remove = () => {
    update((s) => ({ ...s, subjects: s.subjects.filter((x) => x.id !== subject.id) }))
    go({ page: 'subjects' })
  }

  return (
    <>
      <button type="button" className="back-link" onClick={() => go({ page: 'subjects' })}>
        <ArrowLeft size={14} /> Subjects
      </button>

      <section className="teacher-card glass class-hero">
        <SubjectTile icon={subject.icon} color={subject.color} size={64} />
        <div className="class-hero__text">
          <div className="eyebrow">Subject</div>
          <h1>{subject.name}</h1>
          <p>{subject.description || 'No description'}</p>
        </div>
        {editable && (
          <div className="class-hero__actions">
            <button type="button" className="button" onClick={() => setEditing(true)}>
              Edit Subject
            </button>
          </div>
        )}
      </section>

      {!editable && (
        <p className="teacher-note">
          This subject is provided by the school and you don’t teach a class in it, so it is read-only for you.
        </p>
      )}

      <Card title="Classes" hint="The groups of students taught this subject.">
        {classes.length > 0 ? (
          <ul className="teacher-list">
            {classes.map((cls) => (
              <li key={cls.id}>
                <button type="button" className="today-row" onClick={() => go({ page: 'class', classId: cls.id })}>
                  <span className="today-row__name">{cls.name}</span>
                  <span className="teacher-list__detail">
                    {school.teachers.find((t) => t.id === cls.teacherId)?.name} · {cls.studentIds.length} students
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="teacher-card__empty">No classes in this subject yet. Create one from the Classes page.</p>
        )}
      </Card>

      <Card title="Recommended apps" hint="The default for every class in this subject.">
        <AppChecklist selected={subject.appIds} disabled={!editable} onChange={(appIds) => patch({ appIds })} />
      </Card>

      <Card title="Recommended websites">
        <WebsiteEditor websites={subject.websites} readOnly={!editable} onChange={(websites) => patch({ websites })} />
      </Card>

      <Card title="Default class policy" hint="New classes in this subject start with this. Existing classes keep their own.">
        <PolicyEditor policy={subject.defaultPolicy} readOnly={!editable} onChange={(defaultPolicy) => patch({ defaultPolicy })} />
      </Card>

      {editable && classes.length === 0 && subject.ownerId === teacher.id && (
        <div>
          <button type="button" className="button button--quiet-danger" onClick={remove}>
            <Trash2 size={14} /> Delete subject
          </button>
        </div>
      )}

      {editing && <SubjectDialog existing={subject} onClose={() => setEditing(false)} />}
    </>
  )
}
