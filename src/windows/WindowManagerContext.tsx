import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react'
import { windowDefaults, type AppId } from '../data/apps'
import { type Point, type Size, type WindowManagerApi, type WindowState } from './types'

/** Must match the closing transition in windows.css. */
const CLOSE_MS = 160

interface State {
  windows: WindowState[]
  nextZ: number
}

type Action =
  | { type: 'open'; id: AppId }
  | { type: 'closing'; id: AppId }
  | { type: 'remove'; id: AppId }
  | { type: 'minimize'; id: AppId }
  | { type: 'toggleMaximize'; id: AppId }
  | { type: 'focus'; id: AppId }
  | { type: 'move'; id: AppId; position: Point }
  | { type: 'resize'; id: AppId; size: Size }

const update = (state: State, id: AppId, patch: Partial<WindowState>, raise = false): State => ({
  windows: state.windows.map((w) =>
    w.id === id ? { ...w, ...patch, ...(raise ? { z: state.nextZ } : null) } : w,
  ),
  nextZ: raise ? state.nextZ + 1 : state.nextZ,
})

function reducer(state: State, action: Action): State {
  const existing = state.windows.find((w) => w.id === action.id)

  if (action.type === 'open') {
    if (existing) return update(state, action.id, { minimized: false, closing: false }, true)
    const created: WindowState = {
      id: action.id,
      ...windowDefaults(action.id),
      z: state.nextZ,
      minimized: false,
      maximized: false,
      closing: false,
    }
    return { windows: [...state.windows, created], nextZ: state.nextZ + 1 }
  }

  if (!existing) return state

  switch (action.type) {
    case 'closing':
      return update(state, action.id, { closing: true })
    case 'remove':
      // Skip if the app was reopened while its window was animating out.
      if (!existing.closing) return state
      return { ...state, windows: state.windows.filter((w) => w.id !== action.id) }
    case 'minimize':
      return update(state, action.id, { minimized: true })
    case 'toggleMaximize':
      return update(state, action.id, { maximized: !existing.maximized }, true)
    case 'focus':
      if (existing.z === state.nextZ - 1) return state
      return update(state, action.id, {}, true)
    case 'move':
      return update(state, action.id, action.position)
    case 'resize':
      return update(state, action.id, action.size)
  }
}

const WindowManagerContext = createContext<WindowManagerApi | null>(null)

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { windows: [], nextZ: 1 })

  const open = useCallback((id: AppId) => dispatch({ type: 'open', id }), [])
  const minimize = useCallback((id: AppId) => dispatch({ type: 'minimize', id }), [])
  const toggleMaximize = useCallback((id: AppId) => dispatch({ type: 'toggleMaximize', id }), [])
  const focus = useCallback((id: AppId) => dispatch({ type: 'focus', id }), [])
  const move = useCallback(
    (id: AppId, position: Point) => dispatch({ type: 'move', id, position }),
    [],
  )
  const resize = useCallback((id: AppId, size: Size) => dispatch({ type: 'resize', id, size }), [])
  const close = useCallback((id: AppId) => {
    dispatch({ type: 'closing', id })
    window.setTimeout(() => dispatch({ type: 'remove', id }), CLOSE_MS)
  }, [])

  const api = useMemo<WindowManagerApi>(() => {
    const visible = state.windows.filter((w) => !w.minimized && !w.closing)
    const front = visible.reduce<WindowState | null>(
      (top, w) => (top === null || w.z > top.z ? w : top),
      null,
    )
    return {
      windows: state.windows,
      activeId: front?.id ?? null,
      open,
      close,
      minimize,
      toggleMaximize,
      focus,
      move,
      resize,
    }
  }, [state.windows, open, close, minimize, toggleMaximize, focus, move, resize])

  return <WindowManagerContext.Provider value={api}>{children}</WindowManagerContext.Provider>
}

export function useWindowManager() {
  const api = useContext(WindowManagerContext)
  if (!api) throw new Error('useWindowManager must be used inside a WindowManagerProvider')
  return api
}
