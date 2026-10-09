import { Lock } from 'lucide-react'
import { memo, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { appComponents } from '../apps/registry'
import { getApp, type NexusApp } from '../data/apps'
import { testSession } from '../data/mockData'
import { useNexus } from '../state/NexusContext'
import { permissionKey } from '../state/selectors'
import { type Point, type Size, type WindowState } from '../windows/types'
import { useWindowManager } from '../windows/WindowManagerContext'
import { WindowTitleBar } from './WindowTitleBar'

interface AppWindowProps {
  win: WindowState
  /** Size of the desktop area windows may occupy. */
  bounds: Size
  active: boolean
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const MIN_WIDTH = 300
const MIN_HEIGHT = 220

/**
 * The Larger Text setting zooms the desktop. Pointer events and bounding
 * rects are in screen pixels while window positions are in zoomed pixels, so
 * anything that mixes the two divides by this.
 */
const desktopZoom = () => parseFloat(getComputedStyle(document.body).zoom) || 1

// Memoised so dragging a window doesn't re-render the app inside it.
const WindowBody = memo(function WindowBody({ app }: { app: NexusApp }) {
  const Component = appComponents[app.id]
  return Component ? <Component /> : null
})

export function AppWindow({ win, bounds, active }: AppWindowProps) {
  const app = getApp(win.id)
  const { focus, close, minimize, toggleMaximize, move, resize } = useWindowManager()
  const { getPermission } = useNexus()
  const ref = useRef<HTMLDivElement>(null)

  // An app that becomes restricted while open is covered, not closed, so
  // whatever the student was doing is still there when access returns.
  const permission = getPermission(permissionKey('app', win.id))
  const locked = permission.state !== 'allowed'

  // While dragging, the position lives here and is committed on release.
  const [dragPos, setDragPos] = useState<Point | null>(null)
  const drag = useRef<{ pointer: Point; origin: Point; latest: Point; zoom: number } | null>(null)

  // Same idea for resizing: the size in progress lives here until release.
  const [resizeSize, setResizeSize] = useState<Size | null>(null)
  const resizing = useRef<{
    pointer: Point
    origin: Size
    latest: Size
    zoom: number
    horizontal: boolean
    vertical: boolean
  } | null>(null)

  // A window never exceeds the desktop and can never be left outside it.
  const width = Math.min((resizeSize ?? win).width, bounds.width)
  const height = Math.min((resizeSize ?? win).height, bounds.height)
  const maxX = bounds.width - width
  const maxY = bounds.height - height
  const x = clamp((dragPos ?? win).x, 0, maxX)
  const y = clamp((dragPos ?? win).y, 0, maxY)

  const rect = win.maximized
    ? { left: 0, top: 0, width: bounds.width, height: bounds.height }
    : { left: x, top: y, width, height }

  // Aim the minimise animation at this app's icon in the dock.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !win.minimized) return
    const icon = document.querySelector(`[data-dock-app="${win.id}"]`)
    const layer = el.offsetParent
    if (!icon || !layer) return
    const iconRect = icon.getBoundingClientRect()
    const layerRect = layer.getBoundingClientRect()
    const zoom = desktopZoom()
    const centerX = layerRect.left + (el.offsetLeft + el.offsetWidth / 2) * zoom
    const centerY = layerRect.top + (el.offsetTop + el.offsetHeight / 2) * zoom
    el.style.setProperty('--min-x', `${(iconRect.left + iconRect.width / 2 - centerX) / zoom}px`)
    el.style.setProperty('--min-y', `${(iconRect.top + iconRect.height / 2 - centerY) / zoom}px`)
  }, [win.minimized, win.id])

  const onDragStart = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || win.maximized) return
    if ((event.target as HTMLElement).closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const origin = { x, y }
    drag.current = { pointer: { x: event.clientX, y: event.clientY }, origin, latest: origin, zoom: desktopZoom() }
  }

  const onDragMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current) return
    const next = {
      x: clamp(current.origin.x + (event.clientX - current.pointer.x) / current.zoom, 0, maxX),
      y: clamp(current.origin.y + (event.clientY - current.pointer.y) / current.zoom, 0, maxY),
    }
    current.latest = next
    setDragPos(next)
  }

  const onDragEnd = () => {
    const current = drag.current
    if (!current) return
    drag.current = null
    move(win.id, current.latest)
    setDragPos(null)
  }

  // Resizing drags the right edge, the bottom edge, or both from the corner.
  const onResizeStart = (horizontal: boolean, vertical: boolean) => (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const origin = { width, height }
    resizing.current = {
      pointer: { x: event.clientX, y: event.clientY },
      origin,
      latest: origin,
      zoom: desktopZoom(),
      horizontal,
      vertical,
    }
  }

  const onResizeMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = resizing.current
    if (!current) return
    const dx = (event.clientX - current.pointer.x) / current.zoom
    const dy = (event.clientY - current.pointer.y) / current.zoom
    const next = {
      width: current.horizontal
        ? clamp(current.origin.width + dx, Math.min(MIN_WIDTH, bounds.width), bounds.width - x)
        : current.origin.width,
      height: current.vertical
        ? clamp(current.origin.height + dy, Math.min(MIN_HEIGHT, bounds.height), bounds.height - y)
        : current.origin.height,
    }
    current.latest = next
    setResizeSize(next)
  }

  const onResizeEnd = () => {
    const current = resizing.current
    if (!current) return
    resizing.current = null
    resize(win.id, current.latest)
    setResizeSize(null)
  }

  const resizeHandle = (edge: 'e' | 's' | 'se') => (
    <div
      className={`window-resize window-resize--${edge}`}
      onPointerDown={onResizeStart(edge !== 's', edge !== 'e')}
      onPointerMove={onResizeMove}
      onPointerUp={onResizeEnd}
      onPointerCancel={onResizeEnd}
    />
  )

  const className = [
    'app-window',
    active && 'is-active',
    win.maximized && 'is-maximized',
    win.minimized && 'is-minimized',
    win.closing && 'is-closing',
    (dragPos || resizeSize) && 'is-dragging',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...rect, zIndex: win.z }}
      role="dialog"
      aria-label={app.windowTitle ?? app.name}
      aria-hidden={win.minimized}
      onPointerDownCapture={() => focus(win.id)}
    >
      <WindowTitleBar
        app={app}
        maximized={win.maximized}
        onMinimize={() => minimize(win.id)}
        onToggleMaximize={() => toggleMaximize(win.id)}
        onClose={() => close(win.id)}
        dragHandlers={{
          onPointerDown: onDragStart,
          onPointerMove: onDragMove,
          onPointerUp: onDragEnd,
          onPointerCancel: onDragEnd,
        }}
      />
      <div className="app-window__body" inert={locked}>
        <WindowBody app={app} />
      </div>
      {!win.maximized && (
        <>
          {resizeHandle('e')}
          {resizeHandle('s')}
          {resizeHandle('se')}
        </>
      )}
      {locked && (
        <div className="window-lock">
          <span className="restriction__icon">
            <Lock size={22} />
          </span>
          <strong>
            {permission.reason === 'test_mode' ? 'Restricted by Test Mode' : 'This app is restricted'}
          </strong>
          <span>
            {permission.reason === 'test_mode'
              ? `${app.name} is paused during ${testSession.title}. Your work is still here and will be back when the test ends.`
              : `${app.name} isn’t available right now. Your work is still here.`}
          </span>
        </div>
      )}
    </div>
  )
}
