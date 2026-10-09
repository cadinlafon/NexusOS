import { LogOut, ShieldCheck } from 'lucide-react'
import { useAuth, useProfile } from '../auth/AuthProvider'
import { AuthStage } from '../auth/screens'

/** A placeholder. School administration is a later milestone. */
export default function AdminOS() {
  const { signOut } = useAuth()
  const profile = useProfile()
  return (
    <AuthStage>
      <div className="auth-card glass">
        <span className="auth-card__warning auth-card__warning--calm">
          <ShieldCheck size={22} />
        </span>
        <h1 className="auth-card__title">NEXUS Admin</h1>
        <p className="auth-card__text">
          Signed in as {profile.displayName} ({profile.email}). School administration isn’t built yet, so there is
          nothing to manage here.
        </p>
        <div className="auth-card__actions">
          <button type="button" className="button" onClick={() => void signOut()}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    </AuthStage>
  )
}
