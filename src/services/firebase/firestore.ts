import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc, type Timestamp } from 'firebase/firestore'
import { DEFAULT_ROLE, DEFAULT_SCHOOL_ID, isUserRole, type UserProfile } from '../../auth/types'
import { getFirebase } from './firebase'

// Firestore holds one thing so far: users/{uid}, the NEXUS profile.
//
// Firebase Authentication says who someone is. This document says what they
// are in NEXUS (student, teacher or admin). The security rules let an account
// read its own profile, create it as a student, and change its display name.
// They do not let it change its role.

const userDoc = (uid: string) => doc(getFirebase().db, 'users', uid)

function toProfile(uid: string, data: Record<string, unknown>): UserProfile | null {
  if (!isUserRole(data.role)) return null
  return {
    uid,
    email: String(data.email ?? ''),
    displayName: String(data.displayName ?? '') || String(data.email ?? '').split('@')[0] || 'NEXUS user',
    role: data.role,
    schoolId: String(data.schoolId ?? DEFAULT_SCHOOL_ID),
    createdAt: (data.createdAt as Timestamp | undefined) ?? null,
  }
}

export type ProfileUpdate =
  | { kind: 'profile'; profile: UserProfile }
  /** There is no users/{uid} document yet. */
  | { kind: 'missing' }
  /** The document exists but does not hold a role NEXUS knows. */
  | { kind: 'invalid' }

/** Watches a profile, so a role changed by an administrator takes effect without signing in again. */
export function subscribeToProfile(uid: string, onUpdate: (update: ProfileUpdate) => void, onError: (error: Error) => void) {
  return onSnapshot(
    userDoc(uid),
    (snapshot) => {
      if (!snapshot.exists()) return onUpdate({ kind: 'missing' })
      const profile = toProfile(uid, snapshot.data())
      onUpdate(profile ? { kind: 'profile', profile } : { kind: 'invalid' })
    },
    onError,
  )
}

/**
 * Writes the first profile for an account. It is always a student profile:
 * the security rules refuse any other role from a client.
 */
export function createStudentProfile(account: { uid: string; email: string }, displayName: string) {
  return setDoc(userDoc(account.uid), {
    uid: account.uid,
    email: account.email,
    displayName: displayName.trim().slice(0, 80) || account.email.split('@')[0],
    role: DEFAULT_ROLE,
    schoolId: DEFAULT_SCHOOL_ID,
    createdAt: serverTimestamp(),
  })
}

/** The one profile field an account may change for itself. */
export const updateDisplayName = (uid: string, displayName: string) =>
  updateDoc(userDoc(uid), { displayName: displayName.trim().slice(0, 80) })
