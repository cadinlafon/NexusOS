// Turns what the student types in the address bar into a URL to load.
// Kept on its own so the search engine (or the rules) can change in one place.

export interface SearchEngine {
  id: string
  name: string
  searchUrl: (query: string) => string
}

export const searchEngines: SearchEngine[] = [
  { id: 'google', name: 'Google', searchUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { id: 'duckduckgo', name: 'DuckDuckGo', searchUrl: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
  { id: 'bing', name: 'Bing', searchUrl: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
]

/** The configured search engine. Change this (or make it a setting) to switch. */
export const defaultSearchEngine = searchEngines[0]

export interface ResolvedAddress {
  url: string
  kind: 'url' | 'search'
}

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i
const LOCAL_HOST = /^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?([/?#].*)?$/i
// A hostname with a dot and an alphabetic top-level domain: "github.com", "bbc.co.uk/news".
const LOOKS_LIKE_HOST = /^([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?([/?#].*)?$/i

const parse = (candidate: string) => {
  try {
    return new URL(candidate).href
  } catch {
    return null
  }
}

/**
 * - "https://github.com"          → loaded as typed
 * - "github.com"                  → https://github.com
 * - "localhost:5173"              → http://localhost:5173
 * - "minecraft redstone tutorial" → a search
 *
 * Only http and https are ever navigated to. Anything else with a scheme
 * (file:, javascript:, chrome:) is treated as a search for that text.
 */
export function resolveAddress(
  input: string,
  engine: SearchEngine = defaultSearchEngine,
): ResolvedAddress | null {
  const text = input.trim()
  if (!text) return null

  const search: ResolvedAddress = { url: engine.searchUrl(text), kind: 'search' }
  if (/\s/.test(text)) return search

  if (/^https?:\/\//i.test(text)) {
    const url = parse(text)
    return url ? { url, kind: 'url' } : search
  }

  if (LOCAL_HOST.test(text)) {
    const url = parse(`http://${text}`)
    return url ? { url, kind: 'url' } : search
  }

  // Checked before the scheme test so "example.com:8080" isn't read as a scheme.
  if (LOOKS_LIKE_HOST.test(text)) {
    const url = parse(`https://${text}`)
    return url ? { url, kind: 'url' } : search
  }

  if (HAS_SCHEME.test(text)) return search

  return search
}

/** "https://www.github.com/a/b" → "github.com", for tab titles and the address bar. */
export function displayHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
