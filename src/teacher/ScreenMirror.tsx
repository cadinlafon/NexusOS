import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { type ScreenSnapshot } from '../classroom/types'

/**
 * Shows a student's desktop snapshot, scaled to fit. Each snapshot loads in a
 * hidden frame and is swapped in once ready, so updates don't flash.
 *
 * The frames are sandboxed: the copy cannot reach this page, and the only
 * script in it is the one that restores scroll positions.
 */
export function ScreenMirror({ snapshot }: { snapshot: ScreenSnapshot }) {
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  // Two frames: `front` is showing, the other loads the next snapshot.
  const [front, setFront] = useState(0)
  const [documents, setDocuments] = useState<[string, string]>([snapshot.html, ''])
  const loading = useRef<number | null>(null)

  useLayoutEffect(() => {
    const element = container.current
    if (!element) return
    const measure = () => setWidth(element.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setDocuments((current) => {
      if (current[front] === snapshot.html) return current
      const back = front === 0 ? 1 : 0
      loading.current = back
      const next: [string, string] = [...current]
      next[back] = snapshot.html
      return next
    })
    // Runs only for a new snapshot: `front` changing is the result of one, not a reason to load.
  }, [snapshot.html])

  const scale = width / snapshot.width

  return (
    <div className="screen-mirror" ref={container} style={{ height: snapshot.height * scale }}>
      {documents.map((html, index) => (
        <iframe
          key={index}
          title={index === front ? 'Student screen' : undefined}
          aria-hidden={index !== front}
          sandbox="allow-scripts"
          srcDoc={html}
          tabIndex={-1}
          onLoad={() => {
            if (loading.current === index) {
              loading.current = null
              setFront(index)
            }
          }}
          style={{
            width: snapshot.width,
            height: snapshot.height,
            transform: `scale(${scale})`,
            visibility: index === front ? 'visible' : 'hidden',
          }}
        />
      ))}
    </div>
  )
}
