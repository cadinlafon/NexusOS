import { type AppId } from '../data/apps'

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

/** One open application window. Each app has at most one, so the app id is the key. */
export interface WindowState extends Point, Size {
  id: AppId
  /** Stacking order; higher is closer to the user. */
  z: number
  minimized: boolean
  maximized: boolean
  /** True for the brief moment a window is animating out before removal. */
  closing: boolean
}

export interface WindowManagerApi {
  windows: WindowState[]
  /** The frontmost visible window, if any. */
  activeId: AppId | null
  /** Opens the app, or restores and raises its window if it is already open. */
  open: (id: AppId) => void
  close: (id: AppId) => void
  minimize: (id: AppId) => void
  toggleMaximize: (id: AppId) => void
  focus: (id: AppId) => void
  move: (id: AppId, position: Point) => void
  resize: (id: AppId, size: Size) => void
}
