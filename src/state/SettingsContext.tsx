import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { accents, backgrounds, DEFAULT_ACCENT, DEFAULT_BACKGROUND } from '../data/backgrounds'
import { loadJSON, removeStored, saveJSON } from '../services/storage'

const STORAGE_KEY = 'nexus.settings'

export type ThemeChoice = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
export type TextSize = 'default' | 'large' | 'larger'
export type NotificationCategory = 'assignments' | 'messages' | 'calendar' | 'system'

/** The student's own preferences. Saved on this device. */
export interface Settings {
  theme: ThemeChoice
  background: string
  accent: string
  reduceMotion: boolean
  reduceTransparency: boolean
  textSize: TextSize
  increasedContrast: boolean
  notifications: Record<NotificationCategory, boolean>
  doNotDisturb: boolean
  privacy: { camera: boolean; microphone: boolean; location: boolean }
  /** The NEXUS AI model chosen in Settings, or null to use the default. */
  aiModel: string | null
}

const defaults: Settings = {
  theme: 'dark',
  background: DEFAULT_BACKGROUND,
  accent: DEFAULT_ACCENT,
  reduceMotion: false,
  reduceTransparency: false,
  textSize: 'default',
  increasedContrast: false,
  notifications: { assignments: true, messages: true, calendar: true, system: true },
  doNotDisturb: false,
  privacy: { camera: false, microphone: false, location: false },
  aiModel: null,
}

function loadSettings(): Settings {
  const stored = loadJSON<Settings>(STORAGE_KEY)
  return {
    ...defaults,
    ...stored,
    notifications: { ...defaults.notifications, ...stored?.notifications },
    privacy: { ...defaults.privacy, ...stored?.privacy },
  }
}

interface SettingsValue {
  settings: Settings
  /** The theme actually showing, after "system" is resolved. */
  resolvedTheme: ResolvedTheme
  update: (patch: Partial<Settings>) => void
  toggleTheme: () => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsValue | null>(null)

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)')

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(loadSettings)
  const [systemIsDark, setSystemIsDark] = useState(() => systemDark().matches)

  useEffect(() => {
    const query = systemDark()
    const onChange = () => setSystemIsDark(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme: ResolvedTheme =
    settings.theme === 'system' ? (systemIsDark ? 'dark' : 'light') : settings.theme

  useEffect(() => saveJSON(STORAGE_KEY, settings), [settings])

  // Settings reach the UI as attributes and custom properties on <html>, so
  // every stylesheet can respond without any component knowing about them.
  useEffect(() => {
    const root = document.documentElement
    const flag = (name: string, on: boolean, value = 'on') =>
      on ? root.setAttribute(name, value) : root.removeAttribute(name)

    root.dataset.theme = resolvedTheme
    flag('data-motion', settings.reduceMotion, 'reduced')
    flag('data-transparency', settings.reduceTransparency, 'reduced')
    flag('data-contrast', settings.increasedContrast, 'more')
    flag('data-text', settings.textSize !== 'default', settings.textSize)

    const background = backgrounds.find((b) => b.id === settings.background) ?? backgrounds[0]
    const palette = background[resolvedTheme]
    root.style.setProperty('--bg', palette.base)
    palette.glows.forEach((glow, index) => root.style.setProperty(`--orb-${'abc'[index]}`, glow))

    const accent = accents.find((a) => a.id === settings.accent) ?? accents[0]
    root.style.setProperty('--accent', accent[resolvedTheme][0])
    root.style.setProperty('--accent-2', accent[resolvedTheme][1])
  }, [settings, resolvedTheme])

  const update = useCallback(
    (patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch })),
    [],
  )

  const value = useMemo<SettingsValue>(
    () => ({
      settings,
      resolvedTheme,
      update,
      toggleTheme: () => update({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' }),
      resetSettings: () => {
        removeStored(STORAGE_KEY)
        setSettings(defaults)
      },
    }),
    [settings, resolvedTheme, update],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const value = useContext(SettingsContext)
  if (!value) throw new Error('useSettings must be used inside a SettingsProvider')
  return value
}
