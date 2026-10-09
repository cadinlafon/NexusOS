import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { LoginScreen } from './auth/LoginScreen'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { ConfigMissing, ProfileProblem, Splash } from './auth/screens'
import { roleHome } from './auth/types'
import { Redirect, sectionOf, usePath } from './routing/router'
import { firebaseConfigured } from './services/firebase/firebase'
import { SettingsProvider } from './state/SettingsContext'

// Each workspace is loaded only when its role opens it.
const StudentOS = lazy(() => import('./student/StudentOS'))
const ClassroomOS = lazy(() => import('./teacher/TeacherApp'))
const AdminOS = lazy(() => import('./admin/AdminOS'))

//   /            → the signed-in role's workspace, or /login
//   /login       → NEXUS Login
//   /student/*   → StudentOS    (students)
//   /classroom/* → ClassroomOS  (teachers)
//   /admin/*     → AdminOS      (admins; a placeholder for now)
function Routes() {
  const { status, profile } = useAuth()
  const section = sectionOf(usePath())

  if (!firebaseConfigured) return <ConfigMissing />

  // Each workspace is wrapped in the guard for its role. The guard, not this
  // switch, decides whether it may render.
  switch (section) {
    case 'student':
      return (
        <ProtectedRoute role="student">
          <StudentOS />
        </ProtectedRoute>
      )
    case 'classroom':
      return (
        <ProtectedRoute role="teacher">
          <ClassroomOS />
        </ProtectedRoute>
      )
    case 'admin':
      return (
        <ProtectedRoute role="admin">
          <AdminOS />
        </ProtectedRoute>
      )
  }

  // "/", "/login" and anything unknown.
  if (status === 'loading') return <Splash />
  if (status === 'profile_error') return <ProfileProblem />
  if (status === 'ready' && profile) return <Redirect to={roleHome[profile.role]} />
  return section === 'login' ? <LoginScreen /> : <Redirect to="/login" />
}

/** NEXUS OS: one application. Who is signed in decides which workspace opens. */
export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <Suspense fallback={<Splash />}>
          <Routes />
        </Suspense>
      </AuthProvider>
    </SettingsProvider>
  )
}
