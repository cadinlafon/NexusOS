import { displayHost } from './address'
import { type BrowserEngine, type BrowserTabState } from './types'

interface PreviewTab {
  id: string
  history: string[]
  index: number
  loading: boolean
  timer: number | undefined
}

const LOAD_MS = 450

/**
 * The engine used when NEXUS runs in an ordinary browser tab (`npm run dev`).
 * It keeps real per-tab history and loading state so the whole browser UI can
 * be developed and tested, but it renders no web content. It is not Chromium
 * and does not load anything from the network.
 */
export class PreviewEngine implements BrowserEngine {
  readonly kind = 'preview' as const
  private tabs = new Map<string, PreviewTab>()
  private listeners = new Set<(tab: BrowserTabState) => void>()
  private nextId = 1

  onTabChanged(listener: (tab: BrowserTabState) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async createTab() {
    const id = `tab-${this.nextId++}`
    this.tabs.set(id, { id, history: [''], index: 0, loading: false, timer: undefined })
    this.emit(id)
    return id
  }

  async navigate(tabId: string, url: string) {
    const tab = this.tabs.get(tabId)
    if (!tab) return
    // Navigating drops any forward history, as in a real browser.
    tab.history = [...tab.history.slice(0, tab.index + 1), url]
    tab.index = tab.history.length - 1
    this.load(tab)
  }

  async goBack(tabId: string) {
    this.step(tabId, -1)
  }

  async goForward(tabId: string) {
    this.step(tabId, 1)
  }

  async reload(tabId: string) {
    const tab = this.tabs.get(tabId)
    if (tab && tab.history[tab.index]) this.load(tab)
  }

  async stop(tabId: string) {
    const tab = this.tabs.get(tabId)
    if (!tab) return
    window.clearTimeout(tab.timer)
    tab.loading = false
    this.emit(tabId)
  }

  async closeTab(tabId: string) {
    window.clearTimeout(this.tabs.get(tabId)?.timer)
    this.tabs.delete(tabId)
  }

  private step(tabId: string, delta: number) {
    const tab = this.tabs.get(tabId)
    const target = tab ? tab.index + delta : -1
    if (!tab || target < 0 || target >= tab.history.length) return
    tab.index = target
    this.load(tab)
  }

  private load(tab: PreviewTab) {
    window.clearTimeout(tab.timer)
    const isPage = tab.history[tab.index] !== ''
    tab.loading = isPage
    this.emit(tab.id)
    if (!isPage) return
    tab.timer = window.setTimeout(() => {
      tab.loading = false
      this.emit(tab.id)
    }, LOAD_MS)
  }

  private emit(tabId: string) {
    const tab = this.tabs.get(tabId)
    if (!tab) return
    const url = tab.history[tab.index]
    const state: BrowserTabState = {
      id: tab.id,
      url,
      title: url ? displayHost(url) : 'New Tab',
      loading: tab.loading,
      canGoBack: tab.index > 0,
      canGoForward: tab.index < tab.history.length - 1,
      error: null,
    }
    this.listeners.forEach((listener) => listener(state))
  }
}
