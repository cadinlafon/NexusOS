import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { getApp } from '../data/apps'
import { useNexus } from '../state/NexusContext'
import { permissionKey } from '../state/selectors'
import { type AppId } from '../types/nexus'

type OpenMenu = (event: MouseEvent, appId: AppId) => void

const AppMenuContext = createContext<OpenMenu>(() => {})

/** Returns a handler for `onContextMenu` that opens the app menu at the pointer. */
export const useAppMenu = () => useContext(AppMenuContext)

const MENU_WIDTH = 190

/**
 * The right-click menu for an app icon, wherever the icon appears. Only
 * actions the app actually supports are listed.
 */
export function AppMenuProvider({ children }: { children: ReactNode }) {
  const { launchApp, openCatalog, isInstalled, favorites, toggleFavorite, getPermission } = useNexus()
  const [menu, setMenu] = useState<{ appId: AppId; x: number; y: number } | null>(null)

  const openMenu = useCallback<OpenMenu>((event, appId) => {
    event.preventDefault()
    // Pointer positions are in screen pixels; the desktop may be zoomed (Larger Text).
    const zoom = parseFloat(getComputedStyle(document.body).zoom) || 1
    setMenu({
      appId,
      x: Math.min(event.clientX, window.innerWidth - MENU_WIDTH * zoom - 8) / zoom,
      y: Math.min(event.clientY, window.innerHeight - 150 * zoom) / zoom,
    })
  }, [])

  const close = useCallback(() => setMenu(null), [])

  useEffect(() => {
    if (!menu) return
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && close()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menu, close])

  const app = menu && getApp(menu.appId)
  const run = (action: () => void) => () => {
    close()
    action()
  }

  return (
    <AppMenuContext.Provider value={openMenu}>
      {children}
      {menu && app && (
        <>
          <div className="popover-scrim" onMouseDown={close} onContextMenu={(event) => (event.preventDefault(), close())} />
          <div className="app-menu glass" role="menu" aria-label={app.name} style={{ left: menu.x, top: menu.y, width: MENU_WIDTH }}>
            <div className="app-menu__title">{app.name}</div>
            {isInstalled(app.id) && getPermission(permissionKey('app', app.id)).state === 'allowed' && (
              <button type="button" role="menuitem" onClick={run(() => launchApp(app.id))}>
                Open
              </button>
            )}
            {isInstalled(app.id) && (
              <button type="button" role="menuitem" onClick={run(() => toggleFavorite(app.id))}>
                {favorites.includes(app.id) ? 'Remove from Dock' : 'Pin to Dock'}
              </button>
            )}
            <button type="button" role="menuitem" onClick={run(() => openCatalog(app.id))}>
              App Details
            </button>
          </div>
        </>
      )}
    </AppMenuContext.Provider>
  )
}
