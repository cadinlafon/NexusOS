import { type ComponentType } from 'react'
import { type AppId } from '../types/nexus'
import { BrowserApp } from './BrowserApp'
import { CalculatorApp } from './CalculatorApp'
import { CalendarApp } from './CalendarApp'
import { CatalogApp } from './CatalogApp'
import { DocsApp } from './DocsApp'
import { FilesApp } from './FilesApp'
import { NexusAIApp } from './NexusAIApp'
import { NotesApp } from './NotesApp'
import { SettingsApp } from './SettingsApp'
import { TerminalApp } from './TerminalApp'

/**
 * The React component for each app that runs inside NEXUS itself. App
 * definitions live in data/apps.ts; this only maps an id to what renders in
 * its window. Native and web apps have no entry here: the launch service
 * decides what happens to those.
 */
export const appComponents: Partial<Record<AppId, ComponentType>> = {
  browser: BrowserApp,
  docs: DocsApp,
  files: FilesApp,
  notes: NotesApp,
  calendar: CalendarApp,
  calculator: CalculatorApp,
  terminal: TerminalApp,
  'nexus-ai': NexusAIApp,
  settings: SettingsApp,
  catalog: CatalogApp,
}
