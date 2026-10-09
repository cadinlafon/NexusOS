import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

// The one place Firebase is set up. Everything else imports from here (or from
// auth.ts and firestore.ts beside it), so there is only ever one Firebase app.
//
//   Firebase App  →  Authentication  →  Firestore  →  Storage
//
// The values come from environment variables (.env.local). They identify the
// Firebase project; they are not secrets, and Firestore's security rules are
// what protect the data. They still never belong in a component.

const env = import.meta.env

// Each variable is named outright. Reading them in a loop would make the build
// copy the whole environment, and everything in it, into the page.
const values = {
  VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_USE_EMULATOR: env.VITE_FIREBASE_USE_EMULATOR,
  VITE_FIREBASE_AUTH_EMULATOR_URL: env.VITE_FIREBASE_AUTH_EMULATOR_URL,
  VITE_FIREBASE_FIRESTORE_EMULATOR_HOST: env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST,
} as const

const variables = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
} as const

const read = (name: keyof typeof values) => String(values[name] ?? '').trim()

/** The names (never the values) of the variables that are not set. */
export const missingFirebaseConfig: string[] = Object.values(variables).filter((name) => !read(name))

export const firebaseConfigured = missingFirebaseConfig.length === 0

export const FIREBASE_CONFIG_MESSAGE = 'NEXUS Firebase configuration is missing. Check your .env.local file.'

/** Development only: talk to the Firebase Local Emulator Suite instead of a real project. */
export const usingEmulator = env.DEV && read('VITE_FIREBASE_USE_EMULATOR') === 'true'

interface FirebaseServices {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

let services: FirebaseServices | null = null

/** The Firebase app and its services, created on first use and then reused. */
export function getFirebase(): FirebaseServices {
  if (services) return services
  if (!firebaseConfigured) throw new Error(FIREBASE_CONFIG_MESSAGE)

  const existing = getApps()[0]
  const app =
    existing ??
    initializeApp(
      Object.fromEntries(Object.entries(variables).map(([key, name]) => [key, read(name)])),
    )
  const auth = getAuth(app)
  const db = getFirestore(app)

  // Only when the app was just created: the emulators can be connected once.
  if (!existing && usingEmulator) {
    connectAuthEmulator(auth, read('VITE_FIREBASE_AUTH_EMULATOR_URL') || 'http://127.0.0.1:9099', {
      disableWarnings: true,
    })
    const [host, port] = (read('VITE_FIREBASE_FIRESTORE_EMULATOR_HOST') || '127.0.0.1:8085').split(':')
    connectFirestoreEmulator(db, host, Number(port))
  }

  services = { app, auth, db }
  return services
}

/** Cloud Storage. Nothing uses it yet; it is here so files have one way in later. */
export const getNexusStorage = (): FirebaseStorage => getStorage(getFirebase().app)
