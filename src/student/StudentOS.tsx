import { AppMenuProvider } from '../components/AppContextMenu'
import { AppDock } from '../components/AppDock'
import { LaunchNoticeDialog } from '../components/LaunchNoticeDialog'
import { NotificationToast } from '../components/NotificationToast'
import { RestrictionDialog } from '../components/RestrictionDialog'
import { Sidebar } from '../components/Sidebar'
import { TopBar } from '../components/TopBar'
import { WindowManager } from '../components/WindowManager'
import { Announcements } from '../pages/Announcements'
import { AssignmentPage } from '../pages/AssignmentPage'
import { Assignments } from '../pages/Assignments'
import { Calendar } from '../pages/Calendar'
import { Dashboard } from '../pages/Dashboard'
import { Messages } from '../pages/Messages'
import { MyFiles } from '../pages/MyFiles'
import { SubjectPage } from '../pages/SubjectPage'
import { NexusProvider, useNexus } from '../state/NexusContext'
import { WindowManagerProvider } from '../windows/WindowManagerContext'

function Desktop() {
  const { view } = useNexus()

  const renderView = () => {
    if (view.kind === 'subject') return <SubjectPage subjectId={view.id} />
    if (view.kind === 'assignment') return <AssignmentPage assignmentId={view.id} />
    switch (view.id) {
      case 'dashboard':
        return <Dashboard />
      case 'announcements':
        return <Announcements />
      case 'assignments':
        return <Assignments />
      case 'messages':
        return <Messages />
      case 'files':
        return <MyFiles />
      case 'calendar':
        return <Calendar />
    }
  }

  return (
    <div className="desktop">
      <div className="wallpaper" aria-hidden="true">
        <span className="wallpaper__orb wallpaper__orb--a" />
        <span className="wallpaper__orb wallpaper__orb--b" />
        <span className="wallpaper__orb wallpaper__orb--c" />
      </div>

      <TopBar />

      <div className="desktop__body">
        <Sidebar />

        {/* The main desktop: the current page, with app windows floating above it. */}
        <div className="desktop-area">
          <main className="workspace">
            <div className="workspace__page" key={`${view.kind}:${view.id}`}>
              {renderView()}
            </div>
          </main>
          <WindowManager />
        </div>

        <AppDock />
      </div>

      <NotificationToast />
      <RestrictionDialog />
      <LaunchNoticeDialog />
    </div>
  )
}

/** The student workspace: the NEXUS desktop. Only reachable through a ProtectedRoute. */
export default function StudentOS() {
  return (
    <WindowManagerProvider>
      <NexusProvider>
        <AppMenuProvider>
          <Desktop />
        </AppMenuProvider>
      </NexusProvider>
    </WindowManagerProvider>
  )
}
