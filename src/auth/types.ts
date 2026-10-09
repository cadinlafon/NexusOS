import { type Timestamp } from 'firebase/firestore'

/** Every role NEXUS knows. Use these, never a bare string. */
export const USER_ROLES = ['student', 'teacher', 'admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value)

/** The workspace each role lands in, and the only one it may open. */
export const roleHome: Record<UserRole, string> = {
  student: '/student',
  teacher: '/classroom',
  admin: '/admin',
}

export const roleLabels: Record<UserRole, string> = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Administrator',
}

/** The role a new account starts with. Anything else is assigned by an administrator. */
export const DEFAULT_ROLE: UserRole = 'student'

/** The only school until real schools exist. */
export const DEFAULT_SCHOOL_ID = 'demo-school'

/** The signed-in identity, from Firebase Authentication. */
export interface AuthUser {
  uid: string
  email: string
}

/** The NEXUS profile at users/{uid} in Firestore. It decides the role. */
export interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: UserRole
  schoolId: string
  /** Null for a moment after the profile is first written. */
  createdAt: Timestamp | null
}

export type AuthStatus =
  /** Firebase has not yet said whether someone is signed in, or their profile is still loading. */
  | 'loading'
  | 'signed_out'
  /** Signed in, with a valid profile. */
  | 'ready'
  /** Signed in, but the profile could not be loaded or is not valid. */
  | 'profile_error'

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?'
