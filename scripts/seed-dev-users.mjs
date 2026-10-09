// DEVELOPMENT ONLY — makes the two test accounts in the Firebase emulator.
//
//   npm run dev:local     (in one terminal: NEXUS + the emulator)
//   npm run dev:users     (in another, once)
//
// It talks only to the emulator on this computer and refuses to do anything
// else. It writes the teacher's role the way an administrator would: from
// outside the app, where the security rules that stop a student promoting
// themselves do not apply. There is no equivalent of this inside NEXUS.
//
// For a real Firebase project, follow "Test accounts" in the README instead.

import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.emulator', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]),
)

const project = env.VITE_FIREBASE_PROJECT_ID
const authUrl = env.VITE_FIREBASE_AUTH_EMULATOR_URL
const firestoreHost = env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST
const password = env.NEXUS_DEV_PASSWORD

const local = (host) => /^(127\.0\.0\.1|localhost)$/.test(host)
if (!project?.startsWith('demo-') || !local(new URL(authUrl).hostname) || !local(firestoreHost.split(':')[0])) {
  console.error('Refusing to run: this script only works against the local Firebase emulator.')
  process.exit(1)
}

const accounts = [
  { email: 'student@nexus.local', displayName: 'Sam Student', role: 'student' },
  { email: 'teacher@nexus.local', displayName: 'Taylor Teacher', role: 'teacher' },
]

const post = async (url, body, headers = {}) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  return { ok: response.ok, data: await response.json().catch(() => ({})) }
}

const identity = `${authUrl}/identitytoolkit.googleapis.com/v1/accounts`

for (const account of accounts) {
  let result = await post(`${identity}:signUp?key=emulator`, { email: account.email, password, returnSecureToken: true })
  if (!result.ok && result.data?.error?.message === 'EMAIL_EXISTS') {
    result = await post(`${identity}:signInWithPassword?key=emulator`, { email: account.email, password, returnSecureToken: true })
  }
  if (!result.ok) {
    console.error(`Could not create ${account.email}. Is \`npm run dev:local\` running?`, result.data?.error?.message ?? '')
    process.exit(1)
  }
  const uid = result.data.localId

  // "Bearer owner" is the emulator's administrator: it is not bound by firestore.rules.
  const profile = await fetch(
    `http://${firestoreHost}/v1/projects/${project}/databases/(default)/documents/users/${uid}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({
        fields: {
          uid: { stringValue: uid },
          email: { stringValue: account.email },
          displayName: { stringValue: account.displayName },
          role: { stringValue: account.role },
          schoolId: { stringValue: 'demo-school' },
          createdAt: { timestampValue: new Date().toISOString() },
        },
      }),
    },
  )
  if (!profile.ok) {
    console.error(`Could not write the profile for ${account.email}.`)
    process.exit(1)
  }
  console.log(`${account.role.padEnd(8)} ${account.email}`)
}

console.log('\nBoth use the password NEXUS_DEV_PASSWORD from .env.emulator. Emulator only.')
