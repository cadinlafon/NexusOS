import { Plus } from 'lucide-react'
import { useState } from 'react'
import { classPeriod, describeSchedule } from '../../school/timeEngine'
import { type SchoolClass, type SubjectIconId } from '../../school/types'
import { Field, FormDialog, LookPicker, PageTitle, SubjectTile } from '../parts'
import { newId, useTeacher } from '../TeacherContext'

/** Create a class, or edit the basics of one. Students, apps and schedule are set on the class's own page. */
export function ClassDialog({ existing, onClose }: { existing?: SchoolClass; onClose: () => void }) {
  const { school, teacher, update, go, confirm } = useTeacher()
  const [draft, setDraft] = useState(() => ({
    name: existing?.name ?? '',
    subjectId: existing?.subjectId ?? school.subjects[0]?.id ?? '',
    description: existing?.description ?? '',
    grade: existing?.grade ?? 'Grade 10',
    room: existing?.room ?? '',
    teacherId: existing?.teacherId ?? teacher.id,
    icon: existing?.icon,
    color: existing?.color,
  }))
  const subject = school.subjects.find((s) => s.id === draft.subjectId)
  const set = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }))

  const save = () => {
    if (!subject) return
    const fields = { ...draft, name: draft.name.trim() || subject.name, room: draft.room.trim() }
    if (existing) {
      update((s) => ({ ...s, classes: s.classes.map((c) => (c.id === existing.id ? { ...c, ...fields } : c)) }))
      confirm(`Saved ${fields.name}.`)
    } else {
      const created: SchoolClass = {
        id: newId('cls'),
        ...fields,
        studentIds: [],
        // A new class starts from its subject: same apps (inherited) and the subject's default policy.
        appIds: null,
        websites: [],
        policy: subject.defaultPolicy,
      }
      update((s) => ({ ...s, classes: [...s.classes, created] }))
      confirm(`Created ${created.name}. Add students and a schedule next.`)
      go({ page: 'class', classId: created.id })
    }
    onClose()
  }

  return (
    <FormDialog
      title={existing ? 'Edit class' : 'Add a class'}
      submitLabel={existing ? 'Save' : 'Create class'}
      canSubmit={!!subject}
      onSubmit={save}
      onClose={onClose}
    >
      <Field label="Subject" hint="The class uses this subject's apps, websites and default policy.">
        <select value={draft.subjectId} onChange={(e) => set({ subjectId: e.target.value })}>
          {school.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Class name">
        <input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder={`${subject?.name ?? 'Class'} — Period 2`} autoFocus />
      </Field>
      <Field label="Description">
        <input value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="What this class covers" />
      </Field>
      <div className="field-row">
        <Field label="Grade">
          <input value={draft.grade} onChange={(e) => set({ grade: e.target.value })} />
        </Field>
        <Field label="Room">
          <input value={draft.room} onChange={(e) => set({ room: e.target.value })} placeholder="Room 118" />
        </Field>
      </div>
      <Field label="Teacher">
        <select value={draft.teacherId} onChange={(e) => set({ teacherId: e.target.value })}>
          {school.teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Icon and color" hint="Starts as the subject's. Change them to tell classes apart.">
        <LookPicker
          icon={(draft.icon ?? subject?.icon ?? 'book') as SubjectIconId}
          color={draft.color ?? subject?.color ?? '#60a5fa'}
          onChange={(look) => set(look)}
        />
      </Field>
    </FormDialog>
  )
}

export function ClassesPage() {
  const { school, myClasses, go } = useTeacher()
  const [adding, setAdding] = useState(false)

  return (
    <>
      <PageTitle
        eyebrow="Classes"
        title="My classes"
        action={
          <button type="button" className="button button--primary" onClick={() => setAdding(true)}>
            <Plus size={15} /> Add Class
          </button>
        }
      />

      {myClasses.length > 0 ? (
        <div className="class-grid">
          {myClasses.map((cls) => {
            const subject = school.subjects.find((s) => s.id === cls.subjectId)
            const period = classPeriod(school, cls.id)
            const times = describeSchedule(school, cls.id)
            return (
              <button key={cls.id} type="button" className="class-card glass lift" onClick={() => go({ page: 'class', classId: cls.id })}>
                <SubjectTile icon={cls.icon ?? subject?.icon ?? 'book'} color={cls.color ?? subject?.color ?? '#60a5fa'} size={48} />
                <span className="class-card__name">{cls.name}</span>
                <span className="class-card__meta">
                  {[period && `Period ${period}`, `${cls.studentIds.length} ${cls.studentIds.length === 1 ? 'student' : 'students'}`]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                <span className="class-card__meta">{[cls.room, cls.grade].filter(Boolean).join(' · ')}</span>
                <span className="class-card__meta">{times[0] ?? 'Not on the schedule yet'}</span>
                <span className="class-card__open">Open Class</span>
              </button>
            )
          })}
        </div>
      ) : (
        <section className="teacher-card glass teacher-empty">
          <h2>No classes yet</h2>
          <p>Add a class to choose its subject, students and schedule.</p>
        </section>
      )}

      {adding && <ClassDialog onClose={() => setAdding(false)} />}
    </>
  )
}
