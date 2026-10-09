import { Check, Lock, Star } from 'lucide-react'
import { type NexusApp } from '../data/apps'
import { useNexus } from '../state/NexusContext'
import { appStatus, appStatusLabels, permissionKey, type AppStatus } from '../state/selectors'

/** An app's install state combined with what school policy allows. */
export function useAppStatus(app: NexusApp): AppStatus {
  const { isInstalled, getPermission } = useNexus()
  return appStatus(isInstalled(app.id), getPermission(permissionKey('app', app.id)))
}

export function AppStatusBadge({ app }: { app: NexusApp }) {
  const status = useAppStatus(app)
  return (
    <span className={`app-status app-status--${status}`}>
      {status === 'installed' && <Check size={12} strokeWidth={2.6} />}
      {(status === 'blocked' || status === 'disabled' || status === 'requires_approval') && <Lock size={11} />}
      {appStatusLabels[status]}
    </span>
  )
}

/** The one button an app offers given its status: Open, Install or Request Access. */
export function AppPrimaryAction({ app }: { app: NexusApp }) {
  const { launchApp, installApp, requestAccess, accessRequests, showRestriction } = useNexus()
  const status = useAppStatus(app)
  const key = permissionKey('app', app.id)

  switch (status) {
    case 'installed':
      return (
        <button type="button" className="app-button app-button--primary" onClick={() => launchApp(app.id)}>
          Open
        </button>
      )
    case 'available':
      return (
        <button type="button" className="app-button" onClick={() => installApp(app.id)}>
          Install
        </button>
      )
    case 'requires_approval':
      return accessRequests.some((request) => request.key === key) ? (
        <span className="app-status app-status--requested">
          <Check size={12} strokeWidth={2.6} /> Access requested
        </span>
      ) : (
        <button type="button" className="app-button" onClick={() => requestAccess(key, app.name)}>
          Request Access
        </button>
      )
    default:
      // Blocked or disabled: nothing to do but explain.
      return (
        <button type="button" className="app-button" onClick={() => showRestriction(key, app.name)}>
          Why?
        </button>
      )
  }
}

export function FavoriteButton({ app }: { app: NexusApp }) {
  const { favorites, toggleFavorite } = useNexus()
  const pinned = favorites.includes(app.id)
  return (
    <button
      type="button"
      className={`favorite-button${pinned ? ' is-on' : ''}`}
      onClick={() => toggleFavorite(app.id)}
      aria-pressed={pinned}
      aria-label={pinned ? `Remove ${app.name} from favorites` : `Add ${app.name} to favorites`}
      title={pinned ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star size={15} />
    </button>
  )
}
