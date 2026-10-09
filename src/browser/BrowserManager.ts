import { useSyncExternalStore } from 'react'
import { resolveAddress } from './address'
import { hasNativeHost, NativeEngine } from './NativeEngine'
import { openPolicy } from './policy'
import { PreviewEngine } from './PreviewEngine'
import {
  type BrowserEngine,
  type BrowserPolicy,
  type BrowserTabState,
  type PolicyDecision,
} from './types'

export interface BrowserSnapshot {
  tabs: BrowserTabState[]
  activeTabId: string | null
}

/**
 * Owns the browser's tabs. The UI calls this; this resolves what was typed,
 * asks the policy, and only then tells the engine to do anything. Every route
 * into a page load (address bar, shortcuts, web apps, future remote commands)
 * goes through `open`, so policy cannot be bypassed from the UI.
 */
export class BrowserManager {
  private snapshot: BrowserSnapshot = { tabs: [], activeTabId: null }
  private subscribers = new Set<() => void>()
  private policy: BrowserPolicy = openPolicy

  /** Called when policy refuses a navigation, so NEXUS can explain why. */
  onBlocked: (decision: Extract<PolicyDecision, { allowed: false }>) => void = () => {}

  constructor(readonly engine: BrowserEngine) {
    engine.onTabChanged((tab) => {
      const exists = this.snapshot.tabs.some((t) => t.id === tab.id)
      this.update({
        tabs: exists
          ? this.snapshot.tabs.map((t) => (t.id === tab.id ? tab : t))
          : [...this.snapshot.tabs, tab],
      })
    })

    // Links and redirects inside a page are checked against the same policy
    // as the address bar, and a page that wants a new window gets a new tab.
    engine.setNavigationGuard?.((url) => {
      const decision = this.policy.canNavigate(url)
      if (!decision.allowed) this.onBlocked(decision)
      return decision.allowed
    })
    engine.onPopup?.((_tabId, url) => void this.newTab(url))
  }

  subscribe = (subscriber: () => void) => {
    this.subscribers.add(subscriber)
    return () => this.subscribers.delete(subscriber)
  }

  getSnapshot = () => this.snapshot

  setPolicy(policy: BrowserPolicy) {
    this.policy = policy
  }

  // Tabs being created right now. Creating one is asynchronous with a native
  // engine, so "no tabs yet" does not mean none is on its way.
  private creating = 0

  /** Makes sure there is at least one tab. Safe to call repeatedly. */
  async ensureTab() {
    if (this.snapshot.tabs.length === 0 && this.creating === 0) await this.newTab()
  }

  /** Opens a new tab, optionally loading an address in it. */
  async newTab(input?: string) {
    this.creating += 1
    let id: string
    try {
      id = await this.engine.createTab()
    } finally {
      this.creating -= 1
    }
    this.update({ activeTabId: id })
    if (input) await this.open(id, input)
    return id
  }

  /** Loads an address in the current tab if it is blank, otherwise in a new one. */
  async openInTab(input: string) {
    // Checked up front so a refused address doesn't leave an empty tab behind.
    const address = resolveAddress(input)
    if (!address) return
    const decision = this.policy.canNavigate(address.url)
    if (!decision.allowed) return this.onBlocked(decision)
    const active = this.snapshot.tabs.find((t) => t.id === this.snapshot.activeTabId)
    if (active && !active.url) await this.open(active.id, input)
    else await this.newTab(input)
  }

  /** Resolves typed text to a URL, checks policy, then navigates. Resolves false if refused. */
  async open(tabId: string, input: string) {
    const address = resolveAddress(input)
    if (!address) return false
    const decision = this.policy.canNavigate(address.url)
    if (!decision.allowed) {
      this.onBlocked(decision)
      return false
    }
    await this.engine.navigate(tabId, address.url)
    return true
  }

  selectTab(tabId: string) {
    this.update({ activeTabId: tabId })
  }

  async closeTab(tabId: string) {
    const index = this.snapshot.tabs.findIndex((t) => t.id === tabId)
    if (index === -1) return
    const tabs = this.snapshot.tabs.filter((t) => t.id !== tabId)
    // Closing the active tab moves to its neighbour.
    const activeTabId =
      this.snapshot.activeTabId === tabId
        ? (tabs[Math.min(index, tabs.length - 1)]?.id ?? null)
        : this.snapshot.activeTabId
    this.update({ tabs, activeTabId })
    await this.engine.closeTab(tabId)
  }

  /** Closes every tab, releasing whatever the engine holds for them. */
  async closeAll() {
    const ids = this.snapshot.tabs.map((t) => t.id)
    this.update({ tabs: [], activeTabId: null })
    await Promise.all(ids.map((id) => this.engine.closeTab(id)))
  }

  goBack = (tabId: string) => this.engine.goBack(tabId)
  goForward = (tabId: string) => this.engine.goForward(tabId)
  reload = (tabId: string) => this.engine.reload(tabId)
  stop = (tabId: string) => this.engine.stop(tabId)

  private update(patch: Partial<BrowserSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch }
    this.subscribers.forEach((subscriber) => subscriber())
  }
}

/**
 * Picks the engine for this environment: Chromium (CEF) when NEXUS is running
 * inside its native host, otherwise the preview engine. Nothing else in the
 * UI depends on which one it is.
 */
function createBrowserEngine(): BrowserEngine {
  return hasNativeHost() ? new NativeEngine() : new PreviewEngine()
}

/** The one browser for this NEXUS session. */
export const browser = new BrowserManager(createBrowserEngine())

export const useBrowser = () => useSyncExternalStore(browser.subscribe, browser.getSnapshot)
