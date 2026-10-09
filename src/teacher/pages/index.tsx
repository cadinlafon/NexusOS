import { type TeacherView } from '../TeacherContext'
import { AIPage } from './AIPage'
import { ApplicationsPage, SettingsPage } from './AdminPages'
import { ClassesPage } from './ClassesPage'
import { ClassPage } from './ClassPage'
import { DashboardPage } from './DashboardPage'
import { SchedulePage } from './SchedulePage'
import { StudentsPage } from './StudentsPage'
import { SubjectPage, SubjectsPage } from './SubjectsPage'
import { AssignmentsPage, MessagesPage } from './WorkPages'

/** Renders the page for the current view. */
export function TeacherPages({ view }: { view: TeacherView }) {
  switch (view.page) {
    case 'dashboard':
      return <DashboardPage />
    case 'classes':
      return <ClassesPage />
    case 'class':
      return <ClassPage classId={view.classId} />
    case 'subjects':
      return <SubjectsPage />
    case 'subject':
      return <SubjectPage subjectId={view.subjectId} />
    case 'students':
      return <StudentsPage />
    case 'schedule':
      return <SchedulePage />
    case 'assignments':
      return <AssignmentsPage />
    case 'messages':
      return <MessagesPage />
    case 'ai':
      return <AIPage />
    case 'applications':
      return <ApplicationsPage />
    case 'settings':
      return <SettingsPage />
  }
}
