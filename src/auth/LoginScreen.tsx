import { ArrowLeft } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { NexusMark } from '../components/NexusMark'
import { usingEmulator } from '../services/firebase/firebase'
import { useAuth } from './AuthProvider'
import { describeAuthError } from './authService'
import { AuthStage } from './screens'

type Mode = 'sign_in' | 'create' | 'reset'

const titles: Record<Mode, { title: string; subtitle: string; submit: string }> = {
  sign_in: { title: 'Sign in to NEXUS', subtitle: 'Use your school account.', submit: 'Sign In' },
  create: { title: 'Create your account', subtitle: 'New accounts start as students.', submit: 'Create Account' },
  reset: { title: 'Reset your password', subtitle: 'We’ll email you a link to choose a new one.', submit: 'Send Reset Link' },
}

/** NEXUS Login. Sign in, create an account or ask for a password reset. */
export function LoginScreen() {
  const { signIn, createAccount, sendPasswordReset } = useAuth()
  const [mode, setMode] = useState<Mode>('sign_in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const change = (next: Mode) => {
    setMode(next)
    setError(null)
    setNotice(null)
    setPassword('')
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'sign_in') await signIn(email, password)
      else if (mode === 'create') await createAccount(email, password, name)
      else {
        await sendPasswordReset(email)
        setNotice('If there is an account for that email, a reset link is on its way.')
      }
      // On success the session changes and NEXUS leaves this screen by itself.
    } catch (problem) {
      // Don't reveal whether an email has an account when asking for a reset.
      if (mode === 'reset' && (problem as { code?: string })?.code === 'auth/user-not-found') {
        setNotice('If there is an account for that email, a reset link is on its way.')
      } else setError(describeAuthError(problem))
    } finally {
      setBusy(false)
    }
  }

  const { title, subtitle, submit } = titles[mode]

  return (
    <AuthStage>
      <form className="auth-card glass" onSubmit={onSubmit} noValidate>
        {mode !== 'sign_in' && (
          <button type="button" className="back-link auth-card__back" onClick={() => change('sign_in')}>
            <ArrowLeft size={14} /> Sign in
          </button>
        )}
        <NexusMark size={52} />
        <h1 className="auth-card__title">{title}</h1>
        <p className="auth-card__subtitle">{subtitle}</p>

        {mode === 'create' && (
          <label className="auth-field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} required />
          </label>
        )}
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            required
          />
        </label>
        {mode !== 'reset' && (
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
              required
            />
          </label>
        )}

        {error && (
          <p className="auth-card__error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="auth-card__notice" role="status">
            {notice}
          </p>
        )}

        <button type="submit" className="button button--primary button--wide auth-card__submit" disabled={busy}>
          {busy ? 'One moment…' : submit}
        </button>

        {mode === 'sign_in' && (
          <div className="auth-card__links">
            <button type="button" onClick={() => change('reset')}>
              Forgot password?
            </button>
            <button type="button" onClick={() => change('create')}>
              Create account
            </button>
          </div>
        )}
        {mode === 'create' && (
          <p className="auth-card__footnote">
            Teacher access is given by a school administrator. It can’t be chosen here.
          </p>
        )}
      </form>

      {usingEmulator && (
        <p className="auth-dev" role="note">
          <span className="dev-panel__badge">Development</span>
          Running on the local Firebase emulator. Accounts here are test accounts on this computer only.
        </p>
      )}
    </AuthStage>
  )
}
