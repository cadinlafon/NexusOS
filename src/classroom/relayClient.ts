import { RELAY_URL } from './types'

interface Handlers {
  onStatus: (connected: boolean) => void
  /** Named events from the relay, already parsed. */
  onEvent: (event: string, data: unknown) => void
}

/**
 * Opens an event stream to the classroom relay. The browser reconnects by
 * itself if the relay goes away or was never running, so a student desktop
 * simply carries on unsupervised until a teacher view appears.
 */
export function connectToRelay(role: 'teacher' | 'student', id: string, events: string[], handlers: Handlers) {
  const source = new EventSource(`${RELAY_URL}/events?role=${role}&id=${encodeURIComponent(id)}`)
  source.onopen = () => handlers.onStatus(true)
  source.onerror = () => handlers.onStatus(false)
  for (const event of events) {
    source.addEventListener(event, (message) => handlers.onEvent(event, JSON.parse((message as MessageEvent).data)))
  }
  return () => source.close()
}

/** Sends to the relay. Failures are ignored: there may be no relay running. */
export function postToRelay(path: 'presence' | 'state' | 'command' | 'watch' | 'screen' | 'school', body: unknown) {
  void fetch(`${RELAY_URL}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}
