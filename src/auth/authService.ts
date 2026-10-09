import * as firebaseAuth from '../services/firebase/auth'
import { createStudentProfile, subscribeToProfile } from '../services/firebase/firestore'
import { type AuthStatus, type AuthUser, type UserProfile } from './types'

// The NEXUS session: a Firebase sign-in joined with its NEXUS profile.
// The interface uses this (through AuthProvider), not Firebase directly.

export const { signIn, signOut, sendPasswordReset, describeAuthError } = firebaseAuth

/** The name typed on the Create Account form, kept until that account's profile is written. */
let pendingName: string | null = null

/** Creates a sign-in account. Its profile is then created as a student by `watchSession`. */
export async function createAccount(email: string, password: string, displayName: string) {
  pendingName = displayName.trim() || null
  try {
    return await firebaseAuth.createAccount(email, password, pendingName ?? undefined)
  } catch (error) {
    pendingName = null
    throw error
  }
}

export interface Session {
  status: AuthStatus
  user: AuthUser | null
  profile: UserProfile | null
}

/** Profiles being created right now, so one account never gets two writes. */
const creating = new Map<string, Promise<void>>()

/**
 * Reports the session now and whenever it changes: sign-in, sign-out, or the
 * profile changing in Firestore. Returns a function that stops watching.
 */
export function watchSession(onChange: (session: Session) => void) {
  let stopProfile = () => {}

  const stopAuth = firebaseAuth.subscribeToAuthState((firebaseUser) => {
    stopProfile()
    stopProfile = () => {}

    if (!firebaseUser) return onChange({ status: 'signed_out', user: null, profile: null })

    const user: AuthUser = { uid: firebaseUser.uid, email: firebaseUser.email ?? '' }
    onChange({ status: 'loading', user, profile: null })
    const failed = () => onChange({ status: 'profile_error', user, profile: null })

    stopProfile = subscribeToProfile(
      user.uid,
      (update) => {
        if (update.kind === 'profile') return onChange({ status: 'ready', user, profile: update.profile })
        if (update.kind === 'invalid') return failed()

        // A new account, or one made in the Firebase console: give it its
        // student profile. The watcher above then reports it.
        if (!creating.has(user.uid)) {
          const name = pendingName ?? firebaseUser.displayName ?? ''
          pendingName = null
          creating.set(
            user.uid,
            createStudentProfile(user, name)
              .catch(failed)
              .finally(() => creating.delete(user.uid)),
          )
        }
      },
      failed,
    )
  })

  return () => {
    stopProfile()
    stopAuth()
  }
}
