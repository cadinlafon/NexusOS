import { ArrowLeft, ArrowRight, Globe, Lock, Plus, RotateCw, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import { displayHost } from '../browser/address'
import { browser, useBrowser } from '../browser/BrowserManager'
import { sites, testSession } from '../data/mockData'
import { useNexus } from '../state/NexusContext'
import { permissionKey } from '../state/selectors'

/**
 * Keeps the engine's native page view lined up with `host`, the element the
 * page should appear in. The native view floats above the whole NEXUS UI, so
 * it is hidden whenever anything else (another window, a dialog, a menu) is in
 * front of any part of that element.
 */
const EDGE = 14

function useNativePageView(host: RefObject<HTMLDivElement | null>, tabId: string | null) {
  useEffect(() => {
    const showTab = browser.engine.showTab?.bind(browser.engine)
    if (!showTab) return

    let last = ''
    const sync = () => {
      const element = host.current
      const rect = element?.getBoundingClientRect()
      const uncovered =
        !!element &&
        !!rect &&
        rect.width > EDGE * 3 &&
        rect.height > EDGE * 3 &&
        // Sampled a little way in from the edges: the window's rounded
        // corners clip the element's own corners.
        [
          [rect.left + EDGE, rect.top + EDGE],
          [rect.right - EDGE, rect.top + EDGE],
          [rect.left + EDGE, rect.bottom - EDGE],
          [rect.right - EDGE, rect.bottom - EDGE],
          [rect.left + rect.width / 2, rect.top + rect.height / 2],
        ].every(([x, y]) => element.contains(document.elementFromPoint(x, y)))

      const area =
        tabId && rect && uncovered
          ? {
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            }
          : null
      const key = area ? `${tabId}:${area.x},${area.y},${area.width},${area.height}` : ''
      if (key === last) return
      last = key
      showTab(area ? tabId : null, area)
    }
    // Every frame while NEXUS is on screen, so the page follows a window being
    // dragged. Animation frames stop when the NEXUS window itself is covered,
    // so a slow timer keeps things correct for when it comes back.
    let frame = requestAnimationFrame(function loop() {
      sync()
      frame = requestAnimationFrame(loop)
    })
    const timer = window.setInterval(sync, 400)

    return () => {
      cancelAnimationFrame(frame)
      window.clearInterval(timer)
      showTab(null, null)
    }
  }, [host, tabId])
}

// Tabs are closed when the Browser window closes. Counted rather than done
// directly in the effect cleanup so a remount doesn't throw the tabs away.
let openWindows = 0

/**
 * The NEXUS Browser's own interface: tabs, navigation and the address bar.
 * It drives a BrowserEngine through the BrowserManager and shows whatever
 * state the engine reports. Rendering the page itself is the engine's job.
 */
export function BrowserApp() {
  const { getPermission, testMode, classSites, currentSession } = useNexus()
  const { tabs, activeTabId } = useBrowser()
  const tab = tabs.find((t) => t.id === activeTabId) ?? null
  const [address, setAddress] = useState('')

  // The engine draws the page over this element whenever a page is showing.
  const pageHost = useRef<HTMLDivElement>(null)
  const showingPage = !!tab?.url && !tab.error
  useNativePageView(pageHost, showingPage ? tab.id : null)

  useEffect(() => {
    openWindows += 1
    void browser.ensureTab()
    return () => {
      openWindows -= 1
      window.setTimeout(() => {
        if (openWindows === 0) void browser.closeAll()
      }, 0)
    }
  }, [])

  // The address bar follows the page, but not while the student is typing in it.
  const tabUrl = tab?.url ?? ''
  useEffect(() => setAddress(tabUrl), [tabUrl, activeTabId])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!tab || !address.trim()) return
    // A refused address shouldn't linger in the bar as if it were the page.
    void browser.open(tab.id, address).then((opened) => !opened && setAddress(tab.url))
  }

  const closeTab = (id: string) => {
    // Always leave one tab to type into.
    if (tabs.length === 1) void browser.newTab().then(() => browser.closeTab(id))
    else void browser.closeTab(id)
  }

  // During a test only the approved websites are offered.
  const shortcuts = testMode ? sites.filter((site) => testSession.allowedSites.includes(site.id)) : sites

  return (
    <div className="app browser">
      <div className="browser__tabs" role="tablist" aria-label="Browser tabs">
        {tabs.map((item) => (
          <div
            key={item.id}
            className={`browser-tab${item.id === activeTabId ? ' is-active' : ''}`}
            role="tab"
            aria-selected={item.id === activeTabId}
          >
            <button type="button" className="browser-tab__select" onClick={() => browser.selectTab(item.id)}>
              {item.loading ? <span className="browser-tab__spinner" /> : <Globe size={13} />}
              <span className="browser-tab__title">{item.title}</span>
            </button>
            <button
              type="button"
              className="browser-tab__close"
              onClick={() => closeTab(item.id)}
              aria-label={`Close ${item.title}`}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <button type="button" className="app-icon-button" onClick={() => void browser.newTab()} aria-label="New tab">
          <Plus size={15} />
        </button>
      </div>

      <header className="app-toolbar browser__toolbar">
        <button
          type="button"
          className="app-icon-button"
          onClick={() => tab && browser.goBack(tab.id)}
          disabled={!tab?.canGoBack}
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <button
          type="button"
          className="app-icon-button"
          onClick={() => tab && browser.goForward(tab.id)}
          disabled={!tab?.canGoForward}
          aria-label="Forward"
        >
          <ArrowRight size={16} />
        </button>
        {tab?.loading ? (
          <button type="button" className="app-icon-button" onClick={() => browser.stop(tab.id)} aria-label="Stop">
            <X size={16} />
          </button>
        ) : (
          <button
            type="button"
            className="app-icon-button"
            onClick={() => tab && browser.reload(tab.id)}
            disabled={!tab?.url}
            aria-label="Reload"
          >
            <RotateCw size={15} />
          </button>
        )}
        <form className="browser__address" onSubmit={submit}>
          <Search size={14} />
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            onFocus={(event) => event.target.select()}
            placeholder="Search or enter an address"
            aria-label="Address"
            spellCheck={false}
            autoCapitalize="off"
          />
        </form>
      </header>

      <div className={`browser__progress${tab?.loading ? ' is-loading' : ''}`} aria-hidden="true" />

      {testMode && (
        <div className="browser__notice">
          <Lock size={12} /> Test Mode: only approved websites can be opened.
        </div>
      )}

      <div className="browser__page" ref={pageHost}>
        <span className="browser__logo">
          <Globe size={30} strokeWidth={1.6} />
        </span>
        {tab?.error ? (
          <>
            <h2 className="browser__heading">This page can’t be reached</h2>
            <p className="browser__text">
              {displayHost(tab.url)} didn’t load. Check the address, or try again in a moment.
            </p>
            <code className="browser__url">{tab.error}</code>
            <button type="button" className="app-button" onClick={() => browser.open(tab.id, tab.url)}>
              Try again
            </button>
          </>
        ) : tab?.url ? (
          browser.engine.kind === 'preview' ? (
            <>
              <h2 className="browser__heading">{displayHost(tab.url)}</h2>
              <p className="browser__text">
                This is where the page will appear. NEXUS is running in web development mode, where
                the Chromium engine isn’t available, so nothing is loaded from the internet.
              </p>
              <code className="browser__url">{tab.url}</code>
            </>
          ) : (
            // Only seen while the page's native view is hidden.
            <>
              <h2 className="browser__heading">{tab.title}</h2>
              <p
                className="browser__text"
                data-screen-note="The website’s contents aren’t included in screen viewing. The address is shown above."
              >
                The page is hidden while something else is in front of it. Bring NEXUS Browser to
                the front to see it again.
              </p>
            </>
          )
        ) : (
          <>
            <h2 className="browser__heading">NEXUS Browser</h2>
            <p className="browser__text">A focused, school-safe way to browse the web.</p>
            {!testMode && currentSession && classSites.length > 0 && (
              <>
                <div className="eyebrow browser__section">For {currentSession.class.name}</div>
                <div className="browser__shortcuts">
                  {classSites.map((site) => (
                    <button
                      key={site.url}
                      type="button"
                      className="browser__shortcut"
                      title={site.description}
                      onClick={() => tab && browser.open(tab.id, site.url)}
                    >
                      <span className="browser__shortcut-icon">{site.name[0]}</span>
                      {site.name}
                    </button>
                  ))}
                </div>
                <div className="eyebrow browser__section">School</div>
              </>
            )}
            <div className="browser__shortcuts">
              {shortcuts.map((site) => {
                const allowed = getPermission(permissionKey('site', site.id)).state === 'allowed'
                return (
                  <button
                    key={site.id}
                    type="button"
                    className={`browser__shortcut${allowed ? '' : ' is-locked'}`}
                    onClick={() => tab && browser.open(tab.id, `https://${site.host}`)}
                  >
                    <span className="browser__shortcut-icon">{allowed ? site.label[0] : <Lock size={14} />}</span>
                    {site.label}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
