import { ChevronRight, Lock } from 'lucide-react'
import { apps, getApp, type NexusApp } from '../data/apps'
import { testSession } from '../data/mockData'
import { useNexus } from '../state/NexusContext'
import { permissionKey } from '../state/selectors'
import { type AppId } from '../types/nexus'
import { useWindowManager } from '../windows/WindowManagerContext'
import { useAppMenu } from './AppContextMenu'
import { AppIcon } from './AppIcon'
import { StatusCard } from './StatusCard'

/**
 * The application dock. Nothing here is hardcoded: it lists the installed
 * apps from the registry, grouped into pinned, recommended for the class in
 * session, and everything else. Every icon launches through `launchApp`.
 */
export function AppDock() {
  const { currentClass, recommendedApps, installedApps, favorites, testMode, getPermission, launchApp } =
    useNexus()
  const { windows, activeId } = useWindowManager()
  const openMenu = useAppMenu()

  const installed = apps.filter((app) => installedApps.includes(app.id))
  const isInstalled = (id: AppId) => installedApps.includes(id)

  // Each app appears once, in the first group that claims it.
  const groups: { label: string; tone?: 'accent' | 'test'; ids: AppId[] }[] = testMode
    ? [{ label: 'Allowed in test', tone: 'test', ids: testSession.allowedApps.filter(isInstalled) }]
    : [
        { label: 'Pinned', ids: favorites.filter(isInstalled) },
        {
          label: `Recommended · ${currentClass?.subject.name ?? ''}`,
          tone: 'accent',
          ids: recommendedApps.filter((id) => !favorites.includes(id)),
        },
      ]
  const grouped = groups.flatMap((group) => group.ids)
  const others = installed.filter((app) => !grouped.includes(app.id))
  const hasGroups = grouped.length > 0

  const renderApp = (app: NexusApp, prominent: boolean) => {
    const win = windows.find((w) => w.id === app.id && !w.closing)
    const permission = getPermission(permissionKey('app', app.id)).state
    const className = [
      'dock-app',
      prominent ? 'dock-app--featured' : hasGroups && 'dock-app--quiet',
      win && 'is-running',
      win?.minimized && 'is-minimized',
      activeId === app.id && 'is-active',
      permission === 'blocked' && 'is-blocked',
      permission !== 'allowed' && 'is-locked',
    ]
      .filter(Boolean)
      .join(' ')
    const status = permission !== 'allowed' ? ' (restricted)' : !win ? '' : win.minimized ? ' (minimized)' : ' (open)'

    return (
      <li key={app.id}>
        <button
          type="button"
          className={className}
          data-dock-app={app.id}
          onClick={() => launchApp(app.id)}
          onContextMenu={(event) => openMenu(event, app.id)}
          title={app.name}
          aria-label={`${app.name}${status}`}
        >
          <span className="dock-app__running" aria-hidden="true" />
          <AppIcon app={app} />
          <span className="dock-app__name">{app.name}</span>
          {permission === 'allowed' ? (
            <ChevronRight size={15} className="dock-app__arrow" />
          ) : (
            <Lock size={13} className="dock-app__lock" />
          )}
        </button>
      </li>
    )
  }

  return (
    <aside className="dock glass" aria-label="Applications">
      <div className="dock__header">
        <div className="eyebrow">Applications</div>
        <div className="dock__title">Quick Access</div>
      </div>

      <div className="dock__scroll">
        {groups
          .filter((group) => group.ids.length > 0)
          .map((group) => (
            // Keyed by label so the list re-animates when the class changes.
            <div key={group.label}>
              <div className={`dock__section${group.tone ? ` dock__section--${group.tone}` : ''}`}>{group.label}</div>
              <ul className="dock__apps dock__apps--featured">{group.ids.map((id) => renderApp(getApp(id), true))}</ul>
            </div>
          ))}
        {hasGroups && <div className="dock__section">{testMode ? 'Paused during test' : 'All applications'}</div>}
        <ul className="dock__apps">{others.map((app) => renderApp(app, false))}</ul>
      </div>

      <StatusCard />
    </aside>
  )
}
