import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import logo from '@/assets/logo.png'
import { useBackgroundStore } from '@/stores/backgroundStore'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { backgroundSrc } = useBackgroundStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
      } else {
        navigate('/dashboard', { replace: true })
      }
    } finally {
      setSubmitting(false)
    }
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
          <h1 className="text-3xl font-display font-bold text-parchment tracking-wide">Nytt lösenord</h1>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              required
              minLength={6}
              placeholder="Nytt lösenord (minst 6 tecken)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm text-parchment font-ui placeholder:text-stone/60 ring-1 ring-gold/20 focus:outline-none focus:ring-gold/50"
            />

            {error && <p className="text-xs text-red-400 font-body">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-gold/20 px-4 py-2.5 text-sm font-medium text-gold font-ui ring-1 ring-gold/30 transition-all hover:bg-gold/30 active:scale-[0.98] disabled:opacity-50 focus-ring"
            >
              {submitting ? 'Vänta...' : 'Spara nytt lösenord'}
            </button>
          </form>
        </Card>
      </div>
    </main>
  )
}
