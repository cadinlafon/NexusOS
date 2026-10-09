import { type BrowserEngine, type BrowserTabState, type PageArea } from './types'

// The bridge the NEXUS native host (native/src) puts on `window` for the
// NEXUS desktop page, and only for that page. Requests go out through
// `nexusNativeQuery`; the host calls `__nexusNativeEvent` with what happens.

interface NativeQuery {
  request: string
  onSuccess: (response: string) => void
  onFailure: (code: number, message: string) => void
}

type NativeEvent =
  | { type: 'tab'; tab: BrowserTabState }
  /** A page in a tab wants to navigate; the host is holding the request. */
  | { type: 'policy'; requestId: number; tabId: string; url: string }
  /** A page asked for a new window. */
  | { type: 'popup'; tabId: string; url: string }

declare global {
  interface Window {
    nexusNativeQuery?: (query: NativeQuery) => void
    __nexusNativeEvent?: (event: NativeEvent) => void
  }
}

/** True when NEXUS is running inside its native host rather than a normal browser. */
export const hasNativeHost = () => typeof window.nexusNativeQuery === 'function'

/**
 * The real engine: every tab is a Chromium (CEF) browser owned by the native
 * host, drawn in a native view over the page area this class reports.
 */
export class NativeEngine implements BrowserEngine {
  readonly kind = 'native' as const
  private listeners = new Set<(tab: BrowserTabState) => void>()
  private guard: (url: string) => boolean = () => true
  private popupListener: (tabId: string, url: string) => void = () => {}

  constructor() {
    window.__nexusNativeEvent = (event) => this.handle(event)
  }

  onTabChanged(listener: (tab: BrowserTabState) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  createTab() {
    return this.send('createTab')
  }

  async navigate(tabId: string, url: string) {
    await this.send('navigate', { tabId, url })
  }

  async goBack(tabId: string) {
    await this.send('goBack', { tabId })
  }

  async goForward(tabId: string) {
    await this.send('goForward', { tabId })
  }

  async reload(tabId: string) {
    await this.send('reload', { tabId })
  }

  async stop(tabId: string) {
    await this.send('stop', { tabId })
  }

  async closeTab(tabId: string) {
    await this.send('closeTab', { tabId })
  }

  showTab(tabId: string | null, area: PageArea | null) {
    const hidden = { tabId: '', x: 0, y: 0, width: 0, height: 0 }
    void this.send('showTab', tabId && area ? { tabId, ...area } : hidden)
  }

  setNavigationGuard(guard: (url: string) => boolean) {
    this.guard = guard
  }

  onPopup(listener: (tabId: string, url: string) => void) {
    this.popupListener = listener
  }

  private handle(event: NativeEvent) {
    if (event.type === 'tab') {
      this.listeners.forEach((listener) => listener(event.tab))
    } else if (event.type === 'policy') {
      // The host is waiting on this answer before the page may load.
      void this.send('policyDecision', { requestId: event.requestId, allowed: this.guard(event.url) })
    } else {
      this.popupListener(event.tabId, event.url)
    }
  }

  private send(cmd: string, args: Record<string, unknown> = {}) {
    return new Promise<string>((resolve, reject) => {
      window.nexusNativeQuery!({
        request: JSON.stringify({ cmd, ...args }),
        onSuccess: resolve,
        onFailure: (code, message) => reject(new Error(`${cmd} failed (${code}): ${message}`)),
      })
    })
  }
}
