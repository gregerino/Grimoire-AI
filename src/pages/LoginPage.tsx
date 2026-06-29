import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import logo from '@/assets/logo.png'
import { useBackgroundStore } from '@/stores/backgroundStore'

type Mode = 'login' | 'signup' | 'forgot'

export function LoginPage() {
  const { user, loading, signInWithGoogle, signUp, signInWithEmail, resetPassword } = useAuthStore()
  const { backgroundSrc } = useBackgroundStore()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-midnight" role="status" aria-label="Laddar">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)

    try {
      if (mode === 'forgot') {
        const result = await resetPassword(email)
        if (result.error) setError(result.error)
        else setMessage('Återställningslänk skickad — kolla din inkorg.')
      } else if (mode === 'signup') {
        const result = await signUp(email, password)
        if (result.error) setError(result.error)
        else if (result.needsVerification) setMessage('Konto skapat! Verifiera din e-post för att logga in.')
      } else {
        const result = await signInWithEmail(email, password)
        if (result.error) setError(result.error)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setMessage(null)
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center px-4"
      style={backgroundSrc ? { backgroundImage: `url(${backgroundSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: 'var(--color-midnight)' }}
    >
      {backgroundSrc && <div className="absolute inset-0 bg-black/70" />}
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src={logo} alt="Grimoire" className="mx-auto mb-4 h-28 w-28 drop-shadow-[0_0_15px_rgba(201,168,76,0.3)]" />
          <h1 className="text-3xl font-display font-bold text-parchment tracking-wide">Grimoire</h1>
          <p className="mt-2 text-sm text-stone font-body">AI Dungeon Master &middot; Solo D&D 5.5e</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="E-post"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm text-parchment font-ui placeholder:text-stone/60 ring-1 ring-gold/20 focus:outline-none focus:ring-gold/50"
            />
            {mode !== 'forgot' && (
              <input
                type="password"
                required
                minLength={6}
                placeholder="Lösenord (minst 6 tecken)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm text-parchment font-ui placeholder:text-stone/60 ring-1 ring-gold/20 focus:outline-none focus:ring-gold/50"
              />
            )}

            {error && <p className="text-xs text-red-400 font-body">{error}</p>}
            {message && <p className="text-xs text-emerald-400 font-body">{message}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-gold/20 px-4 py-2.5 text-sm font-medium text-gold font-ui ring-1 ring-gold/30 transition-all hover:bg-gold/30 active:scale-[0.98] disabled:opacity-50 focus-ring"
            >
              {submitting
                ? 'Vänta...'
                : mode === 'login'
                  ? 'Logga in'
                  : mode === 'signup'
                    ? 'Skapa konto'
                    : 'Skicka återställningslänk'}
            </button>
          </form>

          <div className="mt-3 flex justify-between text-xs font-body">
            {mode === 'login' && (
              <>
                <button onClick={() => switchMode('signup')} className="text-mist hover:text-gold transition-colors">Skapa konto</button>
                <button onClick={() => switchMode('forgot')} className="text-mist hover:text-gold transition-colors">Glömt lösenord?</button>
              </>
            )}
            {mode === 'signup' && (
              <button onClick={() => switchMode('login')} className="text-mist hover:text-gold transition-colors">Har redan ett konto? Logga in</button>
            )}
            {mode === 'forgot' && (
              <button onClick={() => switchMode('login')} className="text-mist hover:text-gold transition-colors">&larr; Tillbaka till inloggning</button>
            )}
          </div>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-gold/10" />
            <span className="text-xs text-stone/60 font-body">eller</span>
            <div className="h-px flex-1 bg-gold/10" />
          </div>

          <button
            onClick={signInWithGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-navy px-4 py-3 text-sm font-medium text-parchment font-ui ring-1 ring-gold/20 transition-all hover:bg-gold/10 hover:ring-gold/40 active:scale-[0.98] focus-ring"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Fortsätt med Google
          </button>

          <p className="mt-4 text-center text-xs text-mist font-body italic">
            Your adventures await beyond the gate...
          </p>
        </Card>
      </div>
    </main>
  )
}
