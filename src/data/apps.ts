// The NEXUS application registry: the single list of every application NEXUS
// knows about. The dock, the App Library, Settings, class recommendations,
// search and the launcher all read from here. Adding an application is one
// entry in `apps` (plus a component in apps/registry.ts if it runs in NEXUS).
//
// This module is data only, so anything may import it. What the school allows
// is not decided here: see policy/schoolPolicy.ts.

import {
  Activity,
  Calculator,
  CalendarDays,
  Code,
  FileCode,
  FileText,
  Folder,
  Gamepad2,
  GitBranch,
  GitPullRequest,
  Globe,
  Hexagon,
  LayoutGrid,
  MessagesSquare,
  NotebookPen,
  Palette,
  School,
  Settings,
  Shapes,
  Smartphone,
  Sparkles,
  Terminal,
  type LucideIcon,
} from 'lucide-react'
import { type AppCapability, type AppId } from '../types/nexus'

export type { AppId } from '../types/nexus'

/**
 * How an application runs, which is what the launcher branches on:
 * - `nexus`  built into NEXUS; opens in a NEXUS window
 * - `system` part of NEXUS itself (Settings today; network, display, power later)
 * - `web`    a website, opened in NEXUS Browser (Chromium/CEF in the native runtime)
 * - `native` a Linux application, started by the native NEXUS runtime
 */
export type AppType = 'nexus' | 'system' | 'web' | 'native'

export type AppCategory =
  | 'productivity'
  | 'development'
  | 'education'
  | 'communication'
  | 'media'
  | 'system'
  | 'design'
  | 'utilities'

export interface AppWindowDefaults {
  width: number
  height: number
  /** Top-left corner within the desktop area when first opened. */
  x: number
  y: number
}

export interface NexusApp {
  id: AppId
  /** Short name used in the dock and library. */
  name: string
  /** Name shown in the window title bar, when it differs from `name`. */
  windowTitle?: string
  description: string
  /** Other words people search for. */
  keywords?: string[]
  icon: LucideIcon
  /** Two-stop gradient for the app tile. */
  tint: [string, string]
  /** One or more; the first is the primary category. */
  categories: AppCategory[]
  type: AppType
  /** Whether a fresh NEXUS device has it. */
  installedByDefault: boolean
  /** Subject ids whose classes bring this app forward. */
  subjects: string[]
  /** What the app asks the system for. School policy decides what is granted. */
  permissions: AppCapability[]
  /** Web apps: the address NEXUS Browser opens. */
  url?: string
  /** Native apps: the command the native runtime will run. */
  command?: string
  /** NEXUS and system apps: the window they open in. */
  window?: AppWindowDefaults
}

const ALL_SUBJECTS = ['science', 'math', 'software-dev', 'english']

export const apps: NexusApp[] = [
  /* ---------- NEXUS applications ---------- */
  {
    id: 'browser',
    name: 'NEXUS Browser',
    description: 'A focused, school-safe way to browse the web.',
    keywords: ['web', 'internet', 'search'],
    icon: Globe,
    tint: ['#4f9bff', '#3b6cf6'],
    categories: ['productivity', 'utilities'],
    type: 'nexus',
    installedByDefault: true,
    subjects: ALL_SUBJECTS,
    permissions: ['internet', 'clipboard'],
    window: { width: 760, height: 520, x: 44, y: 28 },
  },
  {
    id: 'docs',
    name: 'NEXUS Docs',
    description: 'Write essays and reports, linked to your assignments.',
    keywords: ['write', 'essay', 'document'],
    icon: FileText,
    tint: ['#6f8dff', '#7c5cf0'],
    categories: ['productivity', 'education'],
    type: 'nexus',
    installedByDefault: true,
    subjects: ['science', 'math', 'english'],
    permissions: ['files.read', 'files.write', 'clipboard'],
    window: { width: 640, height: 540, x: 72, y: 44 },
  },
  {
    id: 'files',
    name: 'Files',
    windowTitle: 'NEXUS Files',
    description: 'Everything you have made, organised by subject.',
    keywords: ['folders', 'documents'],
    icon: Folder,
    tint: ['#38bdf8', '#2f8fe0'],
    categories: ['utilities'],
    type: 'nexus',
    installedByDefault: true,
    subjects: ['science'],
    permissions: ['files.read', 'files.write'],
    window: { width: 660, height: 440, x: 28, y: 36 },
  },
  {
    id: 'notes',
    name: 'Notes',
    windowTitle: 'NEXUS Notes',
    description: 'Fast notes that stay with your classes.',
    icon: NotebookPen,
    tint: ['#34d399', '#12a594'],
    categories: ['productivity'],
    type: 'nexus',
    installedByDefault: true,
    subjects: ['science', 'english'],
    permissions: ['files.read', 'files.write'],
    window: { width: 620, height: 430, x: 88, y: 112 },
  },
  {
    id: 'calendar',
    name: 'Calendar',
    windowTitle: 'NEXUS Calendar',
    description: 'Your classes, due dates and school events.',
    keywords: ['schedule', 'timetable'],
    icon: CalendarDays,
    tint: ['#fb7185', '#e2507a'],
    categories: ['productivity'],
    type: 'nexus',
    installedByDefault: true,
    subjects: [],
    permissions: ['notifications'],
    window: { width: 700, height: 500, x: 52, y: 60 },
  },
  {
    id: 'calculator',
    name: 'Calculator',
    windowTitle: 'NEXUS Calculator',
    description: 'A quick calculator for everyday sums.',
    keywords: ['math', 'maths', 'sums'],
    icon: Calculator,
    tint: ['#fbbf24', '#f08c2e'],
    categories: ['utilities', 'education'],
    type: 'nexus',
    installedByDefault: true,
    subjects: ['math'],
    permissions: [],
    window: { width: 300, height: 452, x: 120, y: 150 },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    windowTitle: 'NEXUS Terminal',
    description: 'A command line for Software Development classes.',
    keywords: ['shell', 'command line', 'code'],
    icon: Terminal,
    tint: ['#5b6478', '#353c4d'],
    categories: ['development', 'utilities'],
    type: 'nexus',
    installedByDefault: true,
    subjects: ['software-dev'],
    permissions: ['files.read', 'files.write', 'system.launch', 'developer.tools'],
    window: { width: 600, height: 380, x: 60, y: 180 },
  },
  {
    id: 'nexus-ai',
    name: 'NEXUS AI',
    description: 'The built-in assistant for schoolwork and finding your way around NEXUS.',
    keywords: ['assistant', 'help', 'ai', 'chat', 'ask'],
    icon: Sparkles,
    tint: ['#a985ff', '#6f8dff'],
    categories: ['productivity', 'education'],
    type: 'nexus',
    installedByDefault: true,
    subjects: ['science', 'software-dev', 'english'],
    permissions: ['internet'],
    window: { width: 470, height: 580, x: 400, y: 30 },
  },

  /* ---------- System ---------- */
  {
    id: 'settings',
    name: 'Settings',
    windowTitle: 'NEXUS Settings',
    description: 'Appearance, notifications, apps and system information.',
    keywords: ['preferences', 'theme', 'network'],
    icon: Settings,
    tint: ['#8a93a8', '#596176'],
    categories: ['system'],
    type: 'system',
    installedByDefault: true,
    subjects: [],
    permissions: [],
    window: { width: 840, height: 580, x: 18, y: 22 },
  },
  {
    id: 'catalog',
    name: 'Applications',
    description: 'Find, install and manage the apps on this computer.',
    keywords: ['apps', 'library', 'store', 'install'],
    icon: LayoutGrid,
    tint: ['#5eb6ff', '#6f6bf2'],
    categories: ['system'],
    type: 'system',
    installedByDefault: true,
    subjects: [],
    permissions: [],
    window: { width: 780, height: 580, x: 40, y: 30 },
  },

  /* ---------- Native applications (started by the native NEXUS runtime) ---------- */
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    description: 'A source-code editor for software development.',
    keywords: ['vs code', 'vscode', 'editor', 'programming'],
    icon: Code,
    tint: ['#3ea6f2', '#1f7fd1'],
    categories: ['development'],
    type: 'native',
    installedByDefault: false,
    subjects: ['software-dev'],
    permissions: ['files.read', 'files.write', 'internet', 'system.launch', 'developer.tools'],
    command: 'code',
  },
  {
    id: 'git',
    name: 'Git',
    description: 'Version control for tracking changes to your code.',
    keywords: ['code', 'version control', 'repository'],
    icon: GitBranch,
    tint: ['#f4734a', '#d9512c'],
    categories: ['development'],
    type: 'native',
    installedByDefault: false,
    subjects: ['software-dev'],
    permissions: ['files.read', 'files.write', 'internet', 'developer.tools'],
    command: 'git',
  },
  {
    id: 'python',
    name: 'Python',
    description: 'The Python interpreter and its standard tools.',
    keywords: ['programming', 'script'],
    icon: FileCode,
    tint: ['#f6c945', '#3f7fbf'],
    categories: ['development', 'education'],
    type: 'native',
    installedByDefault: false,
    subjects: ['software-dev'],
    permissions: ['files.read', 'files.write', 'developer.tools'],
    command: 'python3',
  },
  {
    id: 'node',
    name: 'Node.js',
    description: 'Runs JavaScript projects outside the browser.',
    keywords: ['node', 'nodejs', 'javascript', 'programming'],
    icon: Hexagon,
    tint: ['#6cc24a', '#3c873a'],
    categories: ['development'],
    type: 'native',
    installedByDefault: false,
    subjects: ['software-dev'],
    permissions: ['files.read', 'files.write', 'internet', 'developer.tools'],
    command: 'node',
  },
  {
    id: 'android-studio',
    name: 'Android Studio',
    description: 'Build and test Android apps.',
    keywords: ['mobile', 'programming'],
    icon: Smartphone,
    tint: ['#4cd08a', '#2a9d6a'],
    categories: ['development'],
    type: 'native',
    installedByDefault: false,
    subjects: [],
    permissions: ['files.read', 'files.write', 'internet', 'system.launch', 'developer.tools'],
    command: 'studio',
  },
  {
    id: 'steam',
    name: 'Steam',
    description: 'A games store and library.',
    keywords: ['games', 'gaming'],
    icon: Gamepad2,
    tint: ['#5c7a99', '#1f3347'],
    categories: ['media'],
    type: 'native',
    installedByDefault: false,
    subjects: [],
    permissions: ['internet', 'files.write', 'notifications'],
    command: 'steam',
  },

  /* ---------- Web applications (opened in NEXUS Browser) ---------- */
  {
    id: 'canva',
    name: 'Canva',
    description: 'Design posters, slides and presentations.',
    keywords: ['design', 'poster', 'presentation'],
    icon: Palette,
    tint: ['#35c9d6', '#7d4fe0'],
    categories: ['design', 'education'],
    type: 'web',
    installedByDefault: false,
    subjects: ['english'],
    permissions: ['internet', 'files.read', 'clipboard'],
    url: 'https://www.canva.com',
  },
  {
    id: 'desmos',
    name: 'Desmos',
    description: 'An interactive graphing calculator.',
    keywords: ['math', 'maths', 'graph', 'graphing'],
    icon: Activity,
    tint: ['#2fbf8f', '#168a6b'],
    categories: ['education', 'utilities'],
    type: 'web',
    installedByDefault: true,
    subjects: ['math'],
    permissions: ['internet'],
    url: 'https://www.desmos.com/calculator',
  },
  {
    id: 'geogebra',
    name: 'GeoGebra',
    description: 'Geometry, algebra and graphing tools.',
    keywords: ['math', 'maths', 'geometry', 'algebra'],
    icon: Shapes,
    tint: ['#8f9bff', '#5f6bd6'],
    categories: ['education'],
    type: 'web',
    installedByDefault: true,
    subjects: ['math'],
    permissions: ['internet'],
    url: 'https://www.geogebra.org',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Host and share code projects.',
    keywords: ['code', 'repository', 'git'],
    icon: GitPullRequest,
    tint: ['#6e7687', '#2f3442'],
    categories: ['development'],
    type: 'web',
    installedByDefault: false,
    subjects: ['software-dev'],
    permissions: ['internet', 'clipboard'],
    url: 'https://github.com',
  },
  {
    id: 'school-portal',
    name: 'School Portal',
    description: 'Timetables, reports and school notices.',
    icon: School,
    tint: ['#5a8dee', '#3a5fc8'],
    categories: ['education', 'productivity'],
    type: 'web',
    installedByDefault: true,
    subjects: [],
    permissions: ['internet', 'notifications'],
    url: 'https://portal.example.school',
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Voice, video and text chat.',
    keywords: ['chat', 'messaging'],
    icon: MessagesSquare,
    tint: ['#7289da', '#4e5dc0'],
    categories: ['communication'],
    type: 'web',
    installedByDefault: false,
    subjects: [],
    permissions: ['internet', 'camera', 'microphone', 'notifications'],
    url: 'https://discord.com/app',
  },
]

export const getApp = (id: AppId) => apps.find((app) => app.id === id)!

/** Apps that are part of NEXUS and so can't be removed. */
export const isBuiltIn = (app: NexusApp) => app.type === 'nexus' || app.type === 'system'

/** Window size and position for apps that don't declare their own. */
const DEFAULT_WINDOW: AppWindowDefaults = { width: 520, height: 400, x: 120, y: 90 }

export const windowDefaults = (id: AppId) => getApp(id).window ?? DEFAULT_WINDOW

export const defaultInstalledApps = () => apps.filter((app) => app.installedByDefault).map((app) => app.id)

/** Every app that lists the subject, whether or not it is installed. */
export const recommendedAppsFor = (subjectId: string) => apps.filter((app) => app.subjects.includes(subjectId))

export const appCategories: { id: AppCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'development', label: 'Development' },
  { id: 'education', label: 'Education' },
  { id: 'design', label: 'Design' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'communication', label: 'Communication' },
  { id: 'media', label: 'Media' },
  { id: 'system', label: 'System' },
]

export const categoryLabel = (category: AppCategory) =>
  appCategories.find((c) => c.id === category)?.label ?? category

export const appTypeLabels: Record<AppType, string> = {
  nexus: 'NEXUS application',
  system: 'System application',
  web: 'Web application',
  native: 'Native Linux application',
}

/**
 * Registry search. Matches the name, description, keywords, categories and
 * the names of the subjects an app is recommended for.
 */
export function searchApps(query: string, subjectNames: Record<string, string> = {}) {
  const needle = query.trim().toLowerCase()
  if (!needle) return apps
  return apps.filter((app) =>
    [
      app.name,
      app.description,
      ...(app.keywords ?? []),
      ...app.categories.map(categoryLabel),
      ...app.subjects.map((id) => subjectNames[id] ?? ''),
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle),
  )
}
