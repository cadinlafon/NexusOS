import { ArrowLeft, Check, Lock } from 'lucide-react'
import { appTypeLabels, categoryLabel, isBuiltIn, type NexusApp } from '../data/apps'
import { capabilityGranted, capabilityLabels } from '../policy/schoolPolicy'
import { useNexus } from '../state/NexusContext'
import { appStatusLabels } from '../state/selectors'
import { AppPrimaryAction, FavoriteButton, useAppStatus } from './AppActions'
import { AppIcon } from './AppIcon'

/** One application's page in the library: what it is, its status and what it may access. */
export function AppDetails({ app }: { app: NexusApp }) {
  const { school, isInstalled, uninstallApp, setCatalogFocus } = useNexus()
  const status = useAppStatus(app)
  // Which subjects recommend it is decided in NEXUS Classroom, not here.
  const recommendedFor = school.subjects.filter((subject) => subject.appIds.includes(app.id))

  return (
    <div className="app details">
      <header className="app-toolbar">
        <button type="button" className="back-link details__back" onClick={() => setCatalogFocus(null)}>
          <ArrowLeft size={14} /> Applications
        </button>
      </header>

      <div className="details__scroll">
        <div className="details__hero">
          <AppIcon app={app} size="xl" />
          <div className="details__heading">
            <h2 className="details__name">{app.name}</h2>
            <div className="details__category">{app.categories.map(categoryLabel).join(' · ')}</div>
            <p className="details__description">{app.description}</p>

            <div className="details__actions">
              <AppPrimaryAction app={app} />
              {isInstalled(app.id) && !isBuiltIn(app) && (
                <button type="button" className="app-button app-button--danger" onClick={() => uninstallApp(app.id)}>
                  Remove
                </button>
              )}
              <FavoriteButton app={app} />
            </div>
          </div>
        </div>

        <dl className="details__facts">
          <div>
            <dt>Category</dt>
            <dd>{app.categories.map(categoryLabel).join(', ')}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{appTypeLabels[app.type]}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{appStatusLabels[status]}</dd>
          </div>
          <div>
            <dt>Recommended for</dt>
            <dd>{recommendedFor.length > 0 ? recommendedFor.map((s) => s.name).join(', ') : 'Any class'}</dd>
          </div>
          {app.url && (
            <div>
              <dt>Opens</dt>
              <dd className="details__mono">{app.url}</dd>
            </div>
          )}
          {app.command && (
            <div>
              <dt>Command</dt>
              <dd className="details__mono">{app.command}</dd>
            </div>
          )}
        </dl>

        <h3 className="details__section">Required permissions</h3>
        {app.permissions.length > 0 ? (
          <ul className="details__permissions">
            {app.permissions.map((capability) => {
              const granted = capabilityGranted(capability)
              return (
                <li key={capability} className={granted ? undefined : 'is-denied'}>
                  {granted ? <Check size={13} strokeWidth={2.6} /> : <Lock size={12} />}
                  <span>{capabilityLabels[capability]}</span>
                  {!granted && <span className="details__denied">Not allowed by your school</span>}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="details__note">This application doesn’t ask for any permissions.</p>
        )}

        {app.type === 'native' && (
          <p className="details__note">
            Native applications are started by the NEXUS runtime on a NEXUS computer. Installing one
            here only records it in this prototype; nothing is added to this machine.
          </p>
        )}
        {app.type === 'web' && (
          <p className="details__note">Web applications open as a tab in NEXUS Browser.</p>
        )}
      </div>
    </div>
  )
}
