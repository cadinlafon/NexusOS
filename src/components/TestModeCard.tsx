import { Check, Lock } from 'lucide-react'
import { apps, getApp } from '../data/apps'
import { sites, testSession } from '../data/mockData'
import { mainNav } from '../navigation'
import { useNexus } from '../state/NexusContext'

/** Shown on the dashboard while a test is running: what works and what doesn't. */
export function TestModeCard() {
  const { getSubject, installedApps } = useNexus()

  const allowed = [
    ...testSession.allowedApps.map((id) => getApp(id).name),
    ...testSession.allowedSites.map((id) => `${sites.find((s) => s.id === id)?.label} (approved website)`),
  ]
  const restricted = [
    ...apps
      .filter((app) => installedApps.includes(app.id) && !testSession.allowedApps.includes(app.id))
      .map((app) => app.name),
    ...mainNav.filter((item) => testSession.restrictedPages.includes(item.id)).map((item) => item.label),
    'Other websites',
  ]

  return (
    <section className="test-card glass" aria-label="Test Mode">
      <div className="test-card__header">
        <span className="test-pill">
          <span className="test-pill__dot" />
          Test Mode
        </span>
        <h2 className="test-card__title">
          {getSubject(testSession.subjectId)?.name}: {testSession.title}
        </h2>
        <p className="test-card__text">
          Your desktop stays the same, but anything not needed for the test is paused until it ends.
        </p>
      </div>

      <div className="test-card__lists">
        <div>
          <div className="eyebrow">Allowed</div>
          <ul>
            {allowed.map((label) => (
              <li key={label} className="is-allowed">
                <Check size={14} /> {label}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="eyebrow">Restricted</div>
          <ul className="test-card__restricted">
            {restricted.map((label) => (
              <li key={label}>
                <Lock size={12} /> {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
