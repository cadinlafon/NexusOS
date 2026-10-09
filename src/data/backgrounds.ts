// Built-in desktop backgrounds and accent colours. Backgrounds are drawn with
// CSS (a base colour plus three soft glows), so nothing is downloaded. Each one
// has a dark and a light palette so text on the desktop stays readable.

export interface BackgroundPalette {
  base: string
  /** The three glow colours; "transparent" switches one off. */
  glows: [string, string, string]
}

export interface DesktopBackground {
  id: string
  name: string
  dark: BackgroundPalette
  light: BackgroundPalette
}

export const DEFAULT_BACKGROUND = 'nexus'

export const backgrounds: DesktopBackground[] = [
  {
    id: 'nexus',
    name: 'NEXUS Default',
    dark: { base: '#0a0c13', glows: ['rgba(79,107,255,0.34)', 'rgba(150,105,255,0.26)', 'rgba(45,190,220,0.14)'] },
    light: { base: '#eef0f6', glows: ['rgba(110,140,255,0.34)', 'rgba(178,140,255,0.3)', 'rgba(110,215,235,0.24)'] },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    dark: { base: '#07100f', glows: ['rgba(40,200,150,0.3)', 'rgba(70,120,255,0.26)', 'rgba(170,90,255,0.2)'] },
    light: { base: '#ecf4f1', glows: ['rgba(90,215,170,0.36)', 'rgba(120,160,255,0.3)', 'rgba(190,140,255,0.24)'] },
  },
  {
    id: 'school-blue',
    name: 'School Blue',
    dark: { base: '#081020', glows: ['rgba(40,110,255,0.4)', 'rgba(30,160,255,0.22)', 'rgba(60,90,200,0.2)'] },
    light: { base: '#e9f0fb', glows: ['rgba(90,150,255,0.4)', 'rgba(110,195,255,0.3)', 'rgba(140,160,240,0.22)'] },
  },
  {
    id: 'sunrise',
    name: 'Sunrise',
    dark: { base: '#120b10', glows: ['rgba(255,120,90,0.26)', 'rgba(210,90,200,0.24)', 'rgba(255,180,70,0.14)'] },
    light: { base: '#f7efec', glows: ['rgba(255,160,130,0.36)', 'rgba(230,140,220,0.28)', 'rgba(255,205,120,0.28)'] },
  },
  {
    id: 'glass',
    name: 'Glass',
    dark: { base: '#0e1014', glows: ['rgba(150,160,190,0.18)', 'rgba(110,120,150,0.16)', 'rgba(170,180,210,0.08)'] },
    light: { base: '#eff0f3', glows: ['rgba(255,255,255,0.9)', 'rgba(200,205,220,0.5)', 'rgba(255,255,255,0.7)'] },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    dark: { base: '#0d0e12', glows: ['transparent', 'transparent', 'transparent'] },
    light: { base: '#f1f2f5', glows: ['transparent', 'transparent', 'transparent'] },
  },
]

export interface AccentColor {
  id: string
  name: string
  /** [accent, secondary] for each theme. */
  dark: [string, string]
  light: [string, string]
}

export const DEFAULT_ACCENT = 'indigo'

export const accents: AccentColor[] = [
  { id: 'indigo', name: 'Indigo', dark: ['#7c9cff', '#a98bff'], light: ['#4b68f5', '#7d58ec'] },
  { id: 'teal', name: 'Teal', dark: ['#3fd0c0', '#4aa8f0'], light: ['#0f9d8f', '#2b7fd0'] },
  { id: 'rose', name: 'Rose', dark: ['#ff7fa3', '#c98bff'], light: ['#e0457a', '#a24fd6'] },
  { id: 'amber', name: 'Amber', dark: ['#ffb454', '#ff8a6b'], light: ['#d9820b', '#e2603c'] },
  { id: 'green', name: 'Green', dark: ['#5fd68a', '#3fc4c0'], light: ['#1f9d55', '#12918c'] },
]
