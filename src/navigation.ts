import {
  CalendarDays,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react'

import { type PageId, type View } from './types/nexus'

export type { PageId, View } from './types/nexus'

export interface NavItem {
  id: PageId
  label: string
  icon: LucideIcon
}

export const mainNav: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'assignments', label: 'Assignments', icon: ClipboardList },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'files', label: 'My Files', icon: FolderOpen },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
]

/** The name of whatever the workspace is showing, for the top bar and for NEXUS Classroom. */
export const viewTitle = (
  view: View,
  subjectName: (id: string) => string | undefined,
  assignmentTitle: (id: string) => string | undefined,
) =>
  view.kind === 'page'
    ? pageLabel(view.id)
    : view.kind === 'subject'
      ? (subjectName(view.id) ?? 'Subject')
      : (assignmentTitle(view.id) ?? 'Assignment')

export const pageLabel = (id: PageId) =>
  mainNav.find((item) => item.id === id)?.label ?? ''
