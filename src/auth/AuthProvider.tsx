import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { firebaseConfigured } from '../services/firebase/firebase'
import { createAccount, sendPasswordReset, signIn, signOut, watchSession, type Session } from './authService'
import { type AuthStatus, type AuthUser, type UserProfile } from './types'

interface AuthValue {
  status: AuthStatus
  /** True while Firebase is still working out who, if anyone, is signed in. */
  loading: boolean
  isAuthenticated: boolean
  user: AuthUser | null
  profile: UserProfile | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  createAccount: (email: string, password: string, displayName: string) => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

const signedOut: Session = { status: 'signed_out', user: null, profile: null }

/** Makes the signed-in account and its NEXUS profile available to all of NEXUS. */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Without configuration there is nothing to wait for; the app shows a setup message instead.
  const [session, setSession] = useState<Session>(
    firebaseConfigured ? { status: 'loading', user: null, profile: null } : signedOut,
  )

  useEffect(() => {
    if (!firebaseConfigured) return
    return watchSession(setSession)
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      ...session,
      loading: session.status === 'loading',
      isAuthenticated: session.status === 'ready',
      signIn: async (email, password) => {
        await signIn(email, password)
      },
      signOut: async () => {
        await signOut()
      },
      createAccount: async (email, password, displayName) => {
        await createAccount(email, password, displayName)
      },
      sendPasswordReset,
    }),
    [session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside an AuthProvider')
  return value
}

/** The signed-in profile, for code that only ever runs inside a workspace. */
export function useProfile(): UserProfile {
  const { profile } = useAuth()
  if (!profile) throw new Error('useProfile must be used inside a ProtectedRoute')
  return profile
}
