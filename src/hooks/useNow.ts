import { useEffect, useState } from 'react'

/** The current time, refreshed often enough to keep a minute clock accurate. */
export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  return now
}
