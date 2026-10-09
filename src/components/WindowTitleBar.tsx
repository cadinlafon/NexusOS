import { Maximize2, Minimize2, Minus, X } from 'lucide-react'
import { type HTMLAttributes } from 'react'
import { type NexusApp } from '../data/apps'
import { AppIcon } from './AppIcon'

interface WindowTitleBarProps {
  app: NexusApp
  maximized: boolean
  onMinimize: () => void
  onToggleMaximize: () => void
  onClose: () => void
  /** Pointer handlers that make the bar the window's drag handle. */
  dragHandlers: Pick<
    HTMLAttributes<HTMLDivElement>,
    'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'
  >
}

export function WindowTitleBar({
  app,
  maximized,
  onMinimize,
  onToggleMaximize,
  onClose,
  dragHandlers,
}: WindowTitleBarProps) {
  return (
    <div className="window-titlebar" onDoubleClick={onToggleMaximize} {...dragHandlers}>
      <div className="window-titlebar__identity">
        <AppIcon app={app} size="sm" />
        <span className="window-titlebar__name">{app.windowTitle ?? app.name}</span>
      </div>

      <div className="window-titlebar__controls" onDoubleClick={(e) => e.stopPropagation()}>
        <button type="button" className="window-control" onClick={onMinimize} aria-label="Minimize">
          <Minus size={14} />
        </button>
        <button
          type="button"
          className="window-control"
          onClick={onToggleMaximize}
          aria-label={maximized ? 'Restore' : 'Maximize'}
        >
          {maximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
        <button
          type="button"
          className="window-control window-control--close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
