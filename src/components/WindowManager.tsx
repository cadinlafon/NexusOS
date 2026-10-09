import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { type Size } from '../windows/types'
import { useWindowManager } from '../windows/WindowManagerContext'
import { AppWindow } from './AppWindow'

/**
 * The desktop's window layer. It sits over the workspace, measures the space
 * windows are allowed to use, and renders one AppWindow per open app.
 */
export function WindowManager() {
  const { windows, activeId, close, minimize } = useWindowManager()
  const layerRef = useRef<HTMLDivElement>(null)
  const [bounds, setBounds] = useState<Size | null>(null)

  // Measured once before first paint, then kept current as the desktop resizes.
  useLayoutEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    const measure = () => setBounds({ width: layer.clientWidth, height: layer.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(layer)
    return () => observer.disconnect()
  }, [])

  // Cmd/Ctrl+W closes and Cmd/Ctrl+M minimises the active window. With no
  // window active the keys are left alone for the browser.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!activeId || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return
      const key = event.key.toLowerCase()
      if (key === 'w') {
        event.preventDefault()
        close(activeId)
      } else if (key === 'm') {
        event.preventDefault()
        minimize(activeId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeId, close, minimize])

  return (
    <div className="window-layer" ref={layerRef}>
      {bounds &&
        windows.map((win) => (
          <AppWindow key={win.id} win={win} bounds={bounds} active={win.id === activeId} />
        ))}
    </div>
  )
}
