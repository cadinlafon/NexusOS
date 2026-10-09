import { LogOut, RotateCw, TriangleAlert } from 'lucide-react'
import { type ReactNode } from 'react'
import { NexusMark } from '../components/NexusMark'
import { FIREBASE_CONFIG_MESSAGE, missingFirebaseConfig } from '../services/firebase/firebase'
import { useAuth } from './AuthProvider'

/** The backdrop every screen outside a workspace shares, so NEXUS never changes character. */
export function AuthStage({ children }: { children: ReactNode }) {
  return (
    <div className="desktop auth">
      <div className="wallpaper" aria-hidden="true">
        <span className="wallpaper__orb wallpaper__orb--a" />
        <span className="wallpaper__orb wallpaper__orb--b" />
        <span className="wallpaper__orb wallpaper__orb--c" />
      </div>
      {children}
    </div>
  )
}

/** Shown while NEXUS finds out who is signed in, so the login screen never flashes past. */
export function Splash({ message = 'Loading your workspace…' }: { message?: string }) {
  return (
    <AuthStage>
      <div className="splash" role="status">
        <NexusMark size={56} />
        <div className="splash__name">NEXUS</div>
        <div className="splash__message">{message}</div>
        <span className="splash__bar" aria-hidden="true" />
      </div>
    </AuthStage>
  )
}

/** A centred glass card with a title, for the few full-screen notices. */
function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AuthStage>
      <div className="auth-card glass" role="alert">
        <span className="auth-card__warning">
          <TriangleAlert size={22} />
        </span>
        <h1 className="auth-card__title">{title}</h1>
        {children}
      </div>
    </AuthStage>
  )
}

/** Development help when .env.local has not been filled in. Lists names only, never values. */
export function ConfigMissing() {
  return (
    <Notice title="NEXUS isn’t connected to Firebase">
      <p className="auth-card__text">{FIREBASE_CONFIG_MESSAGE}</p>
      <ul className="auth-card__list">
        {missingFirebaseConfig.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <p className="auth-card__text">
        Copy the values from your Firebase project into <code>.env.local</code> and NEXUS will restart by itself. To
        try NEXUS without a Firebase project, run <code>npm run dev:local</code>. The README has both sets of steps.
      </p>
    </Notice>
  )
}

/** Signed in, but there is no usable NEXUS profile behind the account. */
export function ProfileProblem() {
  const { signOut, user } = useAuth()
  return (
    <Notice title="NEXUS couldn’t load your profile">
      <p className="auth-card__text">
        You are signed in{user?.email ? ` as ${user.email}` : ''}, but your NEXUS profile couldn’t be read. Check your
        connection and try again. If it keeps happening, ask your school administrator.
      </p>
      <div className="auth-card__actions">
        <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
          <RotateCw size={14} /> Try again
        </button>
        <button type="button" className="button" onClick={() => void signOut()}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </Notice>
  )
}
