import { useEffect, useSyncExternalStore } from 'react'

// A very small router over the browser's address bar. NEXUS has four places
// (/login, /student, /classroom, /admin), so it does not need a library.

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('popstate', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
  }
}

export function navigateTo(path: string, { replace = false } = {}) {
  if (path === window.location.pathname) return
  if (replace) window.history.replaceState(null, '', path)
  else window.history.pushState(null, '', path)
  notify()
}

/** The current path, kept up to date. */
export const usePath = () => useSyncExternalStore(subscribe, () => window.location.pathname)

/** The first part of a path: "/classroom/classes" → "classroom". */
export const sectionOf = (path: string) => path.split('/').filter(Boolean)[0] ?? ''

/** Sends the browser somewhere else, replacing the current entry so Back does not return here. */
export function Redirect({ to }: { to: string }) {
  useEffect(() => navigateTo(to, { replace: true }), [to])
  return null
}
