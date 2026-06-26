import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import logo from '@/assets/logo.png'

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    title: 'AI Dungeon Master',
    description: 'En kraftfull AI leder ditt äventyr — berättar historien, spelar NPCs och svarar på allt du gör. Helt solo, alltid tillgänglig.',
    color: 'gold',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
      </svg>
    ),
    title: 'Röststyrd spel',
    description: 'Tala med din DM som om du vore vid spelbordet. Röststyrning med realtidsåterkoppling gör att du kan fokusera på äventyret.',
    color: 'mystic',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6.75v6.75" />
      </svg>
    ),
    title: 'Stridssystem',
    description: 'Fullständigt D&D 5.5e-stridsystem med initiativ, conditions, handlingstyper och automatiska beräkningar — direkt i spelet.',
    color: 'blood',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
      </svg>
    ),
    title: 'Inventarie & Loot',
    description: 'Håll koll på utrustning, guld, silver och koppar. Automatisk viktberäkning och smarta loot-tabeller som DM:n delar ut.',
    color: 'gold',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    title: 'Tid & Kalender',
    description: 'Världen lever i realtid. Spåra dagar, årstider och händelser i en fantasy-kalender som AI:n använder för att forma berättelsen.',
    color: 'mystic',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
    title: 'Rykten & Fraktioner',
    description: 'Dina handlingar påverkar världen. Bygg relationer, tjäna tillit eller förtjäna fiender hos fraktioner spridda över riket.',
    color: 'blood',
  },
]

const steps = [
  {
    number: '01',
    title: 'Logga in',
    description: 'Skapa ett konto med Google och kom igång på sekunder.',
  },
  {
    number: '02',
    title: 'Skapa en kampanj',
    description: 'Välj setting, karaktär och starta din historia med ett enda klick.',
  },
  {
    number: '03',
    title: 'Spela',
    description: 'Skriv eller tala med din AI-DM och låt äventyret börja.',
  },
]

export function LandingPage() {
  const { user, loading, signInWithGoogle } = useAuthStore()

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

  return (
    <div className="min-h-screen bg-midnight text-parchment overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-gold/10 bg-midnight/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Grimoire" className="h-8 w-8 drop-shadow-[0_0_8px_rgba(201,168,76,0.4)]" />
          <span className="font-display font-bold text-lg text-parchment tracking-wide">Grimoire</span>
        </div>
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold/10 ring-1 ring-gold/30 text-sm font-ui font-medium text-gold hover:bg-gold/20 hover:ring-gold/50 transition-all active:scale-[0.97]"
        >
          Logga in
        </button>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-20 pb-16 text-center overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gold/5 blur-[120px]" />
          <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-mystic/5 blur-[100px]" />
          <div className="absolute bottom-1/4 left-1/4 w-[200px] h-[200px] rounded-full bg-blood/5 blur-[80px]" />
        </div>

        {/* Decorative divider top */}
        <div className="relative mb-8">
          <div className="flex items-center gap-3">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/40" />
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gold/60">
              <path d="M12 2l2.5 7H22l-6 4.4 2.3 7-6.3-4.6L5.7 20.4 8 13.4 2 9h7.5z" />
            </svg>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/40" />
          </div>
        </div>

        <img
          src={logo}
          alt="Grimoire"
          className="mb-6 h-24 w-24 drop-shadow-[0_0_30px_rgba(201,168,76,0.4)] animate-[pulse_4s_ease-in-out_infinite]"
        />

        <p className="mb-3 text-xs font-ui uppercase tracking-[0.25em] text-gold/70">AI-driven Solo D&D 5.5e</p>

        <h1 className="mb-6 font-display font-bold text-5xl sm:text-6xl md:text-7xl text-parchment leading-tight max-w-3xl">
          Ditt äventyr.<br />
          <span className="text-gold">Din berättelse.</span>
        </h1>

        <p className="mb-10 max-w-xl text-lg font-body text-stone leading-relaxed">
          Grimoire är en AI-driven dungeon master som tar dig med på episka D&D-äventyr — helt solo, dygnet runt. Tala, skriv och spela precis som vid ett riktigt spelbord.
        </p>

        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-3 px-8 py-4 rounded-xl bg-gold text-dark-navy font-ui font-bold text-base hover:bg-gold-light transition-all shadow-[0_0_30px_rgba(201,168,76,0.3)] hover:shadow-[0_0_40px_rgba(201,168,76,0.5)] active:scale-[0.97]"
        >
          <GoogleIcon />
          Börja spela med Google
        </button>

        <p className="mt-4 text-xs text-mist font-body italic">Gratis att komma igång &middot; Inga kreditkort</p>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-mist/50 animate-bounce">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4" id="features">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-ui uppercase tracking-[0.25em] text-gold/70 mb-3">Vad Grimoire erbjuder</p>
            <h2 className="font-display font-bold text-4xl text-parchment">Allt du behöver vid spelbordet</h2>
            <div className="mt-4 mx-auto w-24 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative p-6 rounded-xl bg-dark-navy border border-gold/10 hover:border-gold/25 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              >
                <div
                  className={`mb-4 inline-flex p-3 rounded-lg ${
                    f.color === 'gold'
                      ? 'bg-gold/10 text-gold'
                      : f.color === 'mystic'
                      ? 'bg-mystic/10 text-mystic-light'
                      : 'bg-blood/10 text-blood-light'
                  }`}
                >
                  {f.icon}
                </div>
                <h3 className="mb-2 font-display font-semibold text-lg text-parchment">{f.title}</h3>
                <p className="text-sm font-body text-stone leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 bg-dark-navy/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-ui uppercase tracking-[0.25em] text-gold/70 mb-3">Kom igång</p>
            <h2 className="font-display font-bold text-4xl text-parchment">Tre steg till äventyret</h2>
            <div className="mt-4 mx-auto w-24 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {steps.map((step) => (
                <div key={step.number} className="flex flex-col items-center text-center">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold/30 bg-midnight text-gold font-display font-bold text-2xl shadow-[0_0_20px_rgba(201,168,76,0.1)]">
                    {step.number}
                  </div>
                  <h3 className="mb-2 font-display font-semibold text-xl text-parchment">{step.title}</h3>
                  <p className="text-sm font-body text-stone leading-relaxed max-w-xs">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Showcase quote */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex items-center gap-2">
              {[...Array(5)].map((_, i) => (
                <svg key={i} viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gold">
                  <path d="M12 2l2.5 7H22l-6 4.4 2.3 7-6.3-4.6L5.7 20.4 8 13.4 2 9h7.5z" />
                </svg>
              ))}
            </div>
          </div>
          <blockquote className="mb-6 font-body italic text-xl text-parchment-dark leading-relaxed">
            "Äntligen kan jag njuta av D&D när mina vänner inte har tid. Grimoire förstår min spelstil och berättar historier som faktiskt engagerar."
          </blockquote>
          <p className="text-sm font-ui text-mist">— Solo-äventyrare, Stockholms fantasyförening</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-dark-navy/50">
        <div className="max-w-2xl mx-auto text-center">
          <img src={logo} alt="Grimoire" className="mx-auto mb-6 h-16 w-16 drop-shadow-[0_0_15px_rgba(201,168,76,0.4)]" />
          <h2 className="mb-4 font-display font-bold text-4xl text-parchment">Redo att börja äventyra?</h2>
          <p className="mb-8 font-body text-lg text-stone">
            Gå med tusentals solo-äventyrare och låt Grimoire bli din personliga dungeon master.
          </p>
          <button
            onClick={signInWithGoogle}
            className="flex items-center gap-3 mx-auto px-8 py-4 rounded-xl bg-gold text-dark-navy font-ui font-bold text-base hover:bg-gold-light transition-all shadow-[0_0_30px_rgba(201,168,76,0.3)] hover:shadow-[0_0_40px_rgba(201,168,76,0.5)] active:scale-[0.97]"
          >
            <GoogleIcon />
            Kom igång gratis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gold/10 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Grimoire" className="h-6 w-6 opacity-60" />
            <span className="font-display text-sm text-mist">Grimoire</span>
          </div>
          <p className="text-xs font-body text-mist/60 italic">
            Your adventures await beyond the gate...
          </p>
          <p className="text-xs font-ui text-mist/40">
            © {new Date().getFullYear()} Grimoire. AI-driven D&D 5.5e.
          </p>
        </div>
      </footer>
    </div>
  )
}
