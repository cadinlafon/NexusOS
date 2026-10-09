// The contract between the NEXUS Browser UI and whatever renders web pages.
// The React side only ever talks to a BrowserEngine; it never knows whether
// that is Chromium (CEF) in the native shell or the preview engine used when
// NEXUS runs in an ordinary browser tab during development.

export interface BrowserTabState {
  id: string
  /** Empty string means the new-tab page. */
  url: string
  title: string
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  /** Set when the last navigation failed. */
  error: string | null
}

/** A rectangle in the NEXUS window, in CSS pixels from its top-left corner. */
export interface PageArea {
  x: number
  y: number
  width: number
  height: number
}

/** `native` renders real pages with Chromium; `preview` renders nothing. */
export type EngineKind = 'native' | 'preview'

export interface BrowserEngine {
  readonly kind: EngineKind
  /** Creates a tab on the new-tab page and resolves with its id. */
  createTab(): Promise<string>
  navigate(tabId: string, url: string): Promise<void>
  goBack(tabId: string): Promise<void>
  goForward(tabId: string): Promise<void>
  reload(tabId: string): Promise<void>
  stop(tabId: string): Promise<void>
  /** Destroys the tab and everything the engine holds for it. */
  closeTab(tabId: string): Promise<void>
  /**
   * The engine reports every change to a tab (URL, title, loading, history)
   * through this. Returns a function that stops listening.
   */
  onTabChanged(listener: (tab: BrowserTabState) => void): () => void

  /* The rest only applies to an engine that draws pages in its own native view. */

  /** Shows this tab's page over `area` and hides every other tab. Null hides all. */
  showTab?(tabId: string | null, area: PageArea | null): void
  /**
   * Called for navigations the page starts itself (links, redirects), which
   * never pass through the address bar. Return false to refuse.
   */
  setNavigationGuard?(guard: (url: string) => boolean): void
  /** A page asked to open a new window. */
  onPopup?(listener: (tabId: string, url: string) => void): void
}

/* ---------- Policy ---------- */

export type PolicyDecision =
  | { allowed: true }
  /** `key` is a NEXUS permission key (`site:…`), `label` is what to call it in the UI. */
  | { allowed: false; key: string; label: string }

export type WebPermission = 'camera' | 'microphone' | 'location' | 'clipboard' | 'notifications'

/**
 * Every decision the school may eventually want a say in. Chromium (CEF) asks
 * the native layer, the native layer asks this, and this asks school policy.
 * Only `canNavigate` is enforced today; the rest are the agreed seam.
 */
export interface BrowserPolicy {
  canNavigate(url: string): PolicyDecision
  canDownload(url: string): PolicyDecision
  canOpenPopup(url: string): PolicyDecision
  canRequestPermission(origin: string, permission: WebPermission): PolicyDecision
  canUseDevTools(): PolicyDecision
}
