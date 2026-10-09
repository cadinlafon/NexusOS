import { type ReactNode } from 'react'
import { Redirect } from '../routing/router'
import { useAuth } from './AuthProvider'
import { ProfileProblem, Splash } from './screens'
import { roleHome, type UserRole } from './types'

/**
 * Shows a workspace only to the role it belongs to. Anyone else is sent away
 * before any of it renders: signed-out visitors to the login screen, and
 * signed-in accounts to their own workspace.
 *
 * This keeps people in the right place. It is not what protects data: that is
 * the job of the Firestore security rules and, later, the school's servers.
 */
export function ProtectedRoute({ role, children }: { role: UserRole; children: ReactNode }) {
  const { status, profile } = useAuth()

  if (status === 'loading') return <Splash />
  if (status === 'signed_out') return <Redirect to="/login" />
  if (status === 'profile_error' || !profile) return <ProfileProblem />
  if (profile.role !== role) return <Redirect to={roleHome[profile.role]} />

  return <>{children}</>
}
