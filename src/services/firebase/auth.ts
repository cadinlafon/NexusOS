import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { getFirebase } from './firebase'

// Email and password sign-in, done entirely by Firebase Authentication.
// NEXUS never sees, stores or checks a password itself, and Firebase keeps the
// session across restarts (its normal, local persistence).

export type { User }

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(getFirebase().auth, email.trim(), password)

export const signOut = () => firebaseSignOut(getFirebase().auth)

/** Creates the sign-in account only. The NEXUS profile and role are separate (see firestore.ts). */
export async function createAccount(email: string, password: string, displayName?: string) {
  const { user } = await createUserWithEmailAndPassword(getFirebase().auth, email.trim(), password)
  if (displayName) await updateProfile(user, { displayName }).catch(() => {})
  return user
}

export const sendPasswordReset = (email: string) => sendPasswordResetEmail(getFirebase().auth, email.trim())

/** Calls back now and whenever someone signs in or out. Returns a function that stops it. */
export const subscribeToAuthState = (callback: (user: User | null) => void) =>
  onAuthStateChanged(getFirebase().auth, callback)

const messages: Record<string, string> = {
  'auth/invalid-credential': 'That email or password isn’t right.',
  'auth/wrong-password': 'That email or password isn’t right.',
  'auth/user-not-found': 'That email or password isn’t right.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-email': 'Enter your email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/user-disabled': 'This account has been turned off. Ask your school administrator.',
  'auth/email-already-in-use': 'There is already an account with that email. Sign in instead.',
  'auth/weak-password': 'Choose a password with at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'NEXUS couldn’t reach the sign-in service. Check your connection and try again.',
  'auth/operation-not-allowed': 'Email sign-in isn’t switched on for this NEXUS project yet.',
  'auth/configuration-not-found': 'Email sign-in isn’t switched on for this NEXUS project yet.',
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'NEXUS Firebase configuration isn’t valid. Check your .env.local file.',
  'auth/invalid-api-key': 'NEXUS Firebase configuration isn’t valid. Check your .env.local file.',
}

/** A plain sentence for a Firebase sign-in error. Never shows a raw error or a key. */
export function describeAuthError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? ''
  return messages[code] ?? 'Something went wrong signing in. Try again.'
}
