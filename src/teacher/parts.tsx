// Building blocks shared by the NEXUS Classroom pages.

import { Check, Eye, EyeOff, Plus, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { type RosterEntry, type ScreenSnapshot } from '../classroom/types'
import { AppIcon } from '../components/AppIcon'
import { Modal } from '../components/Modal'
import { apps, getApp } from '../data/apps'
import { subjectColors, subjectIcons } from '../school/icons'
import { type ClassPolicy, type ClassWebsite, type PolicyChoice, type SubjectIconId } from '../school/types'
import { statusLabels } from '../state/selectors'
import { type AppId } from '../types/nexus'
import { ScreenMirror } from './ScreenMirror'

export function Card({
  title,
  hint,
  action,
  children,
}: {
  title?: string
  hint?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="teacher-card glass">
      {(title || action) && (
        <header className="teacher-card__header">
          <div>
            {title && <h2>{title}</h2>}
            {hint && <p>{hint}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function PageTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <header className="teacher-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  )
}

/** A form in a sheet: a title, the fields, and Cancel / Save. */
export function FormDialog({
  title,
  submitLabel,
  canSubmit = true,
  onSubmit,
  onClose,
  children,
}: {
  title: string
  submitLabel: string
  canSubmit?: boolean
  onSubmit: () => void
  onClose: () => void
  children: ReactNode
}) {
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (canSubmit) onSubmit()
  }
  return (
    <Modal open onClose={onClose} label={title} wide>
      <form className="form-dialog" onSubmit={submit}>
        <h2>{title}</h2>
        <div className="form-dialog__fields">{children}</div>
        <footer>
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button--primary" disabled={!canSubmit}>
            {submitLabel}
          </button>
        </footer>
      </form>
    </Modal>
  )
}

/** The coloured tile that stands for a subject or class. */
export function SubjectTile({ icon, color, size = 44 }: { icon: SubjectIconId; color: string; size?: number }) {
  const Icon = subjectIcons[icon]
  return (
    <span className="subject-tile" style={{ '--subject': color, width: size, height: size } as React.CSSProperties}>
      <Icon size={size * 0.46} strokeWidth={1.9} />
    </span>
  )
}

export function LookPicker({
  icon,
  color,
  onChange,
}: {
  icon: SubjectIconId
  color: string
  onChange: (look: { icon: SubjectIconId; color: string }) => void
}) {
  return (
    <div className="look-picker">
      <div className="look-picker__row" role="radiogroup" aria-label="Icon">
        {(Object.keys(subjectIcons) as SubjectIconId[]).map((id) => {
          const Icon = subjectIcons[id]
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={icon === id}
              aria-label={id}
              className="look-picker__icon"
              onClick={() => onChange({ icon: id, color })}
            >
              <Icon size={16} />
            </button>
          )
        })}
      </div>
      <div className="look-picker__row" role="radiogroup" aria-label="Color">
        {subjectColors.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={color === option}
            aria-label={option}
            className="swatch"
            style={{ background: option }}
            onClick={() => onChange({ icon, color: option })}
          >
            {color === option && <Check size={13} strokeWidth={3} />}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Tick the applications from the central registry. Nothing is copied per class. */
export function AppChecklist({
  selected,
  onChange,
  disabled,
}: {
  selected: AppId[]
  onChange: (ids: AppId[]) => void
  disabled?: boolean
}) {
  const toggle = (id: AppId) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  const row = (id: AppId) => {
    const app = getApp(id)
    const checked = selected.includes(id)
    return (
      <li key={id}>
        <label className={`check-row${disabled ? ' is-disabled' : ''}`}>
          <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(id)} />
          <AppIcon app={app} size="sm" />
          <span>{app.name}</span>
        </label>
      </li>
    )
  }
  const available = apps.filter((app) => !selected.includes(app.id) && app.type !== 'system')
  return (
    <div className="checklist">
      <div>
        <div className="eyebrow">Recommended ({selected.length})</div>
        <ul>{selected.map(row)}</ul>
        {selected.length === 0 && <p className="teacher-card__empty">None chosen yet.</p>}
      </div>
      <div>
        <div className="eyebrow">Available</div>
        <ul>{available.map((app) => row(app.id))}</ul>
      </div>
    </div>
  )
}

/** A list of websites with a small form to add one. `inherited` ones are shown but not editable here. */
export function WebsiteEditor({
  websites,
  inherited = [],
  inheritedFrom,
  onChange,
  readOnly,
}: {
  websites: ClassWebsite[]
  inherited?: ClassWebsite[]
  inheritedFrom?: string
  onChange: (websites: ClassWebsite[]) => void
  readOnly?: boolean
}) {
  const [draft, setDraft] = useState<ClassWebsite>({ name: '', url: '', description: '' })
  const [adding, setAdding] = useState(false)

  const add = (event: FormEvent) => {
    event.preventDefault()
    const url = /^https?:\/\//i.test(draft.url.trim()) ? draft.url.trim() : `https://${draft.url.trim()}`
    onChange([...websites, { ...draft, name: draft.name.trim(), url }])
    setDraft({ name: '', url: '', description: '' })
    setAdding(false)
  }

  const item = (site: ClassWebsite, removable: boolean) => (
    <li key={site.url}>
      <span className="teacher-list__label">
        <Check size={13} className="policy-check" />
        <span>
          {site.name}
          <span className="teacher-list__detail"> {site.url.replace(/^https?:\/\//, '')}</span>
          {site.description && <span className="site-note">{site.description}</span>}
        </span>
      </span>
      {removable ? (
        <button
          type="button"
          className="app-icon-button"
          onClick={() => onChange(websites.filter((w) => w.url !== site.url))}
          aria-label={`Remove ${site.name}`}
        >
          <X size={14} />
        </button>
      ) : (
        <span className="teacher-list__detail">{inheritedFrom}</span>
      )}
    </li>
  )

  return (
    <>
      {inherited.length + websites.length > 0 ? (
        <ul className="teacher-list">
          {inherited.map((site) => item(site, false))}
          {websites.map((site) => item(site, !readOnly))}
        </ul>
      ) : (
        <p className="teacher-card__empty">No websites yet.</p>
      )}

      {!readOnly &&
        (adding ? (
          <form className="website-form" onSubmit={add}>
            <Field label="Website name">
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="MDN Web Docs" autoFocus />
            </Field>
            <Field label="URL">
              <input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://developer.mozilla.org" spellCheck={false} />
            </Field>
            <Field label="Description">
              <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Web development documentation" />
            </Field>
            <div className="website-form__actions">
              <button type="button" className="button" onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button type="submit" className="button button--primary" disabled={!draft.name.trim() || !draft.url.trim()}>
                Add website
              </button>
            </div>
          </form>
        ) : (
          <div>
            <button type="button" className="button" onClick={() => setAdding(true)}>
              <Plus size={14} /> Add Website
            </button>
          </div>
        ))}
    </>
  )
}

const policyRows: { key: keyof ClassPolicy; label: string; hint: string; blocked: string }[] = [
  { key: 'internet', label: 'Internet', hint: 'NEXUS Browser and every web application.', blocked: 'Off during class' },
  { key: 'browser', label: 'Browser', hint: 'NEXUS Browser on its own.', blocked: 'Off during class' },
  { key: 'ai', label: 'AI', hint: 'NEXUS AI.', blocked: 'Off during class' },
  { key: 'applications', label: 'Applications', hint: 'Which applications students may open.', blocked: 'Class applications only' },
]

export function PolicyEditor({
  policy,
  onChange,
  readOnly,
}: {
  policy: ClassPolicy
  onChange: (policy: ClassPolicy) => void
  readOnly?: boolean
}) {
  return (
    <ul className="teacher-list">
      {policyRows.map((row) => (
        <li key={row.key}>
          <span className="teacher-list__label">
            <span>
              {row.label}
              <span className="site-note">{row.hint}</span>
            </span>
          </span>
          <select
            value={policy[row.key]}
            disabled={readOnly}
            onChange={(event) => onChange({ ...policy, [row.key]: event.target.value as PolicyChoice })}
            aria-label={`${row.label} policy`}
          >
            <option value="school">School policy</option>
            <option value="allowed">Allowed</option>
            <option value="blocked">{row.blocked}</option>
          </select>
        </li>
      ))}
    </ul>
  )
}

/** What one connected student is doing right now, as their desktop reports it. */
export function StudentPanel({
  student,
  watching,
  screen,
  onWatch,
}: {
  student: RosterEntry
  watching: boolean
  screen: ScreenSnapshot | null
  onWatch: (watch: boolean) => void
}) {
  const active = student.activeApp ? getApp(student.activeApp) : null
  const firstName = student.name.split(' ')[0]
  return (
    <section className="teacher-card glass student-panel">
      <div className="student-panel__identity">
        <span className="avatar avatar--lg">{student.initials}</span>
        <div>
          <h2>{student.name}</h2>
          <div className="student-panel__status">
            <span className="live-dot" /> Online
            {student.currentClass && <span>· {student.currentClass}</span>}
            {student.testMode && <span className="test-pill">Test Mode</span>}
          </div>
        </div>
        <button type="button" className={`button${watching ? '' : ' button--primary'}`} onClick={() => onWatch(!watching)}>
          {watching ? <EyeOff size={15} /> : <Eye size={15} />}
          {watching ? 'Stop viewing' : 'View screen'}
        </button>
      </div>

      {watching && (
        <div className="student-panel__screen">
          {screen ? (
            <ScreenMirror snapshot={screen} />
          ) : (
            <div className="screen-mirror screen-mirror--waiting">Waiting for {firstName}’s screen…</div>
          )}
          <p>
            {firstName} can see that you are viewing their screen. Websites’ contents aren’t included, only the NEXUS
            desktop.
          </p>
        </div>
      )}

      <dl className="student-panel__facts">
        <div>
          <dt>Viewing</dt>
          <dd>{student.viewing}</dd>
        </div>
        <div>
          <dt>Active app</dt>
          <dd>
            {active ? (
              <span className="setting-line__app">
                <AppIcon app={active} size="sm" /> {active.name}
              </span>
            ) : (
              'None'
            )}
          </dd>
        </div>
        <div>
          <dt>Browser</dt>
          <dd>
            {student.browser ? (
              <>
                {student.browser.title}
                <span className="student-panel__url">{student.browser.url}</span>
              </>
            ) : (
              'No page open'
            )}
          </dd>
        </div>
        <div>
          <dt>Open apps</dt>
          <dd className="student-panel__apps">
            {student.openApps.length > 0
              ? student.openApps.map((id) => (
                  <span key={id} title={getApp(id).name}>
                    <AppIcon app={getApp(id)} />
                  </span>
                ))
              : 'None'}
          </dd>
        </div>
      </dl>

      <div className="eyebrow">Assignments</div>
      <ul className="student-panel__work">
        {student.assignments.map((assignment) => (
          <li key={assignment.id}>
            <span>{assignment.title}</span>
            <span className={`work-status work-status--${assignment.status}`}>{statusLabels[assignment.status]}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
