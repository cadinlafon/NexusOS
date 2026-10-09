import { Lock } from 'lucide-react'
import { useState } from 'react'
import { apps } from '../../data/apps'
import { sites, testSession } from '../../data/mockData'
import { policyFor } from '../../policy/schoolPolicy'
import { permissionKey, permissionLabels } from '../../state/selectors'
import { type PermissionState } from '../../types/nexus'
import { useAuth, useProfile } from '../../auth/AuthProvider'
import { Card, PageTitle } from '../parts'
import { useTeacher } from '../TeacherContext'

/** Allow, restrict or block applications and websites for connected desktops, on top of school policy. */
export function ApplicationsPage() {
  const { classroom } = useTeacher()
  const [tab, setTab] = useState<'app' | 'site'>('app')
  const { classState, setPermission } = classroom

  const targets =
    tab === 'site'
      ? sites.map((site) => ({ key: permissionKey('site', site.id), label: site.label, detail: site.host }))
      : apps.map((app) => ({ key: permissionKey('app', app.id), label: app.name, detail: '' }))

  return (
    <>
      <PageTitle eyebrow="Applications" title="What students can open" />
      <p className="teacher-note">
        These choices apply to every connected desktop straight away. To recommend applications for one class, open the
        class and use its Applications tab.
      </p>
      <Card
        title="Permissions"
        action={
          <div className="segmented" role="radiogroup" aria-label="Permission type">
            <button type="button" role="radio" aria-checked={tab === 'app'} onClick={() => setTab('app')}>
              Applications
            </button>
            <button type="button" role="radio" aria-checked={tab === 'site'} onClick={() => setTab('site')}>
              Websites
            </button>
          </div>
        }
      >
        <ul className="teacher-list">
          {targets.map((target) => {
            const chosen = classState.permissions[target.key]
            const effective = chosen ?? policyFor(target.key)
            return (
              <li key={target.key}>
                <span className="teacher-list__label">
                  {effective !== 'allowed' && <Lock size={12} />}
                  {target.label}
                  {target.detail && <span className="teacher-list__detail">{target.detail}</span>}
                </span>
                <select
                  value={chosen ?? ''}
                  onChange={(e) => setPermission(target.key, (e.target.value || null) as PermissionState | null)}
                  aria-label={`${target.label} permission`}
                >
                  <option value="">School policy ({permissionLabels[policyFor(target.key)]})</option>
                  {(Object.keys(permissionLabels) as PermissionState[]).map((state) => (
                    <option key={state} value={state}>
                      {permissionLabels[state]}
                    </option>
                  ))}
                </select>
              </li>
            )
          })}
        </ul>
      </Card>
    </>
  )
}

export function SettingsPage() {
  const { school, teacherId, theme, setTheme, timeOverride, setPrefs, classroom, resetSchool, confirm } = useTeacher()
  const { signOut, sendPasswordReset } = useAuth()
  const profile = useProfile()

  return (
    <>
      <PageTitle eyebrow="Settings" title="NEXUS Classroom" />

      <Card title="Appearance">
        <ul className="teacher-list">
          <li>
            <span className="teacher-list__label">Theme</span>
            <div className="segmented" role="radiogroup" aria-label="Theme">
              <button type="button" role="radio" aria-checked={theme === 'dark'} onClick={() => setTheme('dark')}>
                Dark
              </button>
              <button type="button" role="radio" aria-checked={theme === 'light'} onClick={() => setTheme('light')}>
                Light
              </button>
            </div>
          </li>
        </ul>
      </Card>

      <Card title="Account">
        <ul className="teacher-list">
          <li>
            <span className="teacher-list__label">
              <span>
                {profile.displayName}
                <span className="site-note">{profile.email} · Teacher</span>
              </span>
            </span>
            <span className="field-row">
              <button
                type="button"
                className="button"
                onClick={() =>
                  void sendPasswordReset(profile.email).then(
                    () => confirm(`A password reset link was sent to ${profile.email}.`),
                    () => confirm('The reset link couldn’t be sent. Try again.'),
                  )
                }
              >
                Reset Password
              </button>
              <button type="button" className="button" onClick={() => void signOut()}>
                Sign Out
              </button>
            </span>
          </li>
        </ul>
      </Card>

      <Card title="Test Mode" hint={`${testSession.title}. Applies to every connected desktop.`}>
        <button
          type="button"
          className={`button${classroom.classState.testMode ? '' : ' button--primary'}`}
          onClick={() => classroom.setTestMode(!classroom.classState.testMode)}
        >
          {classroom.classState.testMode ? 'End Test Mode' : 'Start Test Mode'}
        </button>
      </Card>

      <section className="teacher-card glass dev-card">
        <header className="teacher-card__header">
          <div>
            <span className="dev-panel__badge">Prototype controls</span>
            <p>There is no real school database or clock yet. These stand in for them and would not exist in a real build.</p>
          </div>
        </header>
        <ul className="teacher-list">
          <li>
            <span className="teacher-list__label">
              <span>
                Teaching as
                <span className="site-note">
                  Your account isn’t linked to a school record yet, so it manages this example teacher’s classes.
                </span>
              </span>
            </span>
            <select value={teacherId} onChange={(e) => setPrefs({ teacherId: e.target.value })} aria-label="Teaching as">
              {school.teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </li>
          <li>
            <span className="teacher-list__label">
              <span>
                Clock
                <span className="site-note">Student desktops have their own clock setting in Developer Preview.</span>
              </span>
            </span>
            <span className="teacher-list__actions">
              <select
                value={timeOverride === null ? 'real' : 'simulated'}
                onChange={(e) => setPrefs({ timeOverride: e.target.value === 'real' ? null : '09:20' })}
                aria-label="Clock source"
              >
                <option value="simulated">Simulated</option>
                <option value="real">Real time</option>
              </select>
              {timeOverride !== null && (
                <input
                  type="time"
                  value={timeOverride}
                  onChange={(e) => e.target.value && setPrefs({ timeOverride: e.target.value })}
                  aria-label="Simulated time"
                />
              )}
            </span>
          </li>
          <li>
            <span className="teacher-list__label">
              <span>
                Reset the school
                <span className="site-note">Returns subjects, classes, enrolment and schedules to the starting data.</span>
              </span>
            </span>
            <button
              type="button"
              className="app-button app-button--danger"
              onClick={() => {
                if (!window.confirm('Reset all subjects, classes and schedules to the starting data?')) return
                resetSchool()
                confirm('The school was reset to its starting data.')
              }}
            >
              Reset
            </button>
          </li>
        </ul>
      </section>
    </>
  )
}
