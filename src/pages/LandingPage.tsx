import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import logo from '@/assets/logo.png'

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

/* ── Inline chat mockup shown in hero ─────────────────────────────────── */
function ChatMockup() {
  return (
    <div className="relative w-full max-w-lg mx-auto rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7)] border border-gold/20">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#0d1124] border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blood/70" />
          <div className="w-3 h-3 rounded-full bg-gold/40" />
          <div className="w-3 h-3 rounded-full bg-mystic/40" />
        </div>
        <span className="ml-2 text-xs font-ui text-mist/50 tracking-wide">Grimoire: The Ashwood Forest</span>
      </div>

      {/* Chat area */}
      <div className="bg-[#0f1629] p-5 space-y-4 font-body text-sm">
        {/* DM message */}
        <div className="space-y-1">
          <p className="text-xs font-ui text-gold/50 uppercase tracking-wider">Dungeon Master</p>
          <div className="rounded-lg bg-[#1a1a2e] p-3 text-parchment-dark leading-relaxed">
            The forest closes in around you. Ancient oaks stretch their branches like claws against the pale moon. Suddenly you hear a rustling from the bushes to your left;{' '}
            <span className="text-gold">three pairs of eyes gleam red in the darkness.</span>
          </div>
        </div>

        {/* Player message */}
        <div className="flex justify-end">
          <div className="rounded-lg bg-mystic/20 border border-mystic/20 px-3 py-2 text-parchment/90 max-w-xs leading-relaxed">
            I draw my sword and shout: "Who are you? Show yourselves!"
          </div>
        </div>

        {/* DM response */}
        <div className="space-y-1">
          <p className="text-xs font-ui text-gold/50 uppercase tracking-wider">Dungeon Master</p>
          <div className="rounded-lg bg-[#1a1a2e] p-3 text-parchment-dark leading-relaxed">
            Three werewolves step from the shadows. Their leader, a massive beast with a scarred face, lets out a low growl.{' '}
            <span className="text-blood-light font-semibold">Roll initiative.</span>
          </div>
        </div>

        {/* Typing indicator */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs text-mist/40 font-ui">DM is typing…</span>
        </div>
      </div>

      {/* Input bar */}
      <div className="bg-[#0d1124] px-4 py-3 flex items-center gap-3 border-t border-white/5">
        <div className="flex-1 rounded-lg bg-[#1a1a2e] px-3 py-2 text-xs text-mist/40 font-ui">
          Write your next move...
        </div>
        <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gold">
            <path d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
          </svg>
        </div>
      </div>
    </div>
  )
}

/* ── Combat tracker mockup ────────────────────────────────────────────── */
function CombatMockup() {
  const combatants = [
    { name: 'Aelindra',    hp: 32, maxHp: 45, init: 18, ac: 16, isPlayer: true,  conditions: [],            dead: false },
    { name: 'Werewolf (α)', hp: 18, maxHp: 40, init: 14, ac: 13, isPlayer: false, conditions: ['poisoned'],  dead: false },
    { name: 'Werewolf (β)', hp: 40, maxHp: 40, init: 9,  ac: 13, isPlayer: false, conditions: [],            dead: false },
    { name: 'Werewolf (γ)', hp: 0,  maxHp: 35, init: 6,  ac: 13, isPlayer: false, conditions: [],            dead: true  },
  ]

  function hpColor(pct: number) {
    if (pct > 50) return 'bg-green-500'
    if (pct > 25) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7)] border border-gold/20 bg-[#0f1629]">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0d1124] border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Animated swords icon */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-red-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 2l7.5 7.5-10 10-1.5-1.5 8.5-8.5-6-6L14.5 2zM9.5 22L2 14.5l1.5-1.5 7.5 7.5-1.5 1.5zM5 19l-3 3M19 5l3-3" />
          </svg>
          <span className="text-xs font-ui text-stone/60 uppercase tracking-wider">Combat</span>
        </div>
        <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-bold font-ui text-red-400">
          Round 3
        </span>
      </div>

      {/* Initiative list */}
      <div className="p-3 space-y-1.5">
        {combatants.map((c, i) => {
          const pct = c.maxHp > 0 ? (c.hp / c.maxHp) * 100 : 0
          const isCurrent = i === 0
          return (
            <div
              key={c.name}
              className={`relative rounded-lg border px-3 py-2.5 transition-colors ${
                isCurrent
                  ? 'border-gold/50 bg-gold/5 shadow-[0_0_12px_rgba(201,168,76,0.15)]'
                  : c.dead
                  ? 'border-white/5 bg-[#1a1a2e] opacity-50'
                  : 'border-white/5 bg-[#1a1a2e]'
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Chevron for current turn */}
                {isCurrent && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 shrink-0 text-gold">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                )}
                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-ui font-medium ${
                        c.isPlayer ? 'text-gold' : c.dead ? 'text-stone/50 line-through' : 'text-parchment'
                      }`}>
                        {c.name}
                      </span>
                      {c.dead && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3 text-stone/50">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z" />
                        </svg>
                      )}
                      <span className="text-[10px] font-ui text-stone/40">Init {c.init}</span>
                    </div>
                    {/* AC */}
                    <div className="flex items-center gap-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3 text-blue-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span className="text-[10px] font-medium font-ui text-blue-400">{c.ac}</span>
                    </div>
                  </div>

                  {/* HP bar */}
                  <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${hpColor(pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-0.5 text-right">
                    <span className="text-[10px] tabular-nums font-ui text-stone/40">{c.hp}/{c.maxHp}</span>
                  </div>

                  {/* Conditions */}
                  {c.conditions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {c.conditions.map((cond) => (
                        <span key={cond} className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-medium font-ui text-yellow-400 capitalize">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                          </svg>
                          {cond}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Audio mockup ─────────────────────────────────────────────────────── */
function AudioMockup() {
  const channels = [
    { label: 'Dungeon Master', sub: 'Text-to-speech narration', pct: 78, color: 'bg-gold', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-gold">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
      </svg>
    )},
    { label: 'Ambient', sub: 'Dungeon: torchlight & drips', pct: 45, color: 'bg-mystic-light', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-mystic-light">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
      </svg>
    )},
    { label: 'Music', sub: 'Combat: tense strings', pct: 60, color: 'bg-blood-light', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-blood-light">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    )},
    { label: 'Sound Effects', sub: 'Sword hits, spell casts, dice', pct: 55, color: 'bg-emerald-400', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-emerald-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
      </svg>
    )},
  ]

  const waveHeights = [3,6,10,14,10,16,8,12,6,10,14,8,12,6,10,14,10,8,12,16,10,6,8,12]

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7)] border border-gold/20 bg-[#0f1629]">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0d1124] border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-gold">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
          </svg>
          <span className="text-xs font-ui text-stone/60 uppercase tracking-wider">Audio</span>
        </div>
        <span className="text-[10px] font-ui text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          Live
        </span>
      </div>

      {/* DM speaking: waveform */}
      <div className="px-4 pt-4 pb-2">
        <div className="rounded-xl bg-gold/5 border border-gold/15 px-4 py-3 flex items-center gap-4">
          <div className="shrink-0 w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-gold">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-ui text-gold/60 uppercase tracking-wider mb-1.5">DM Speaking</p>
            {/* Waveform bars */}
            <div className="flex items-center gap-[3px] h-5">
              {waveHeights.map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-gold"
                  style={{
                    height: `${h}px`,
                    opacity: 0.4 + (h / 16) * 0.6,
                    animation: `wave-bar ${0.8 + (i % 5) * 0.15}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.04}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Volume channels */}
      <div className="px-4 pb-4 space-y-3 mt-1">
        {channels.map((ch) => (
          <div key={ch.label} className="flex items-center gap-3">
            <div className="shrink-0">{ch.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-ui text-parchment/80 truncate">{ch.label}</span>
                <span className="text-[10px] font-ui text-stone/40 ml-2 shrink-0">{ch.sub}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                <div className={`h-full rounded-full ${ch.color} opacity-70`} style={{ width: `${ch.pct}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes wave-bar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}

/* ── DnD Beyond mockup ────────────────────────────────────────────────── */
function DndBeyondMockup() {
  return (
    <div className="relative w-full max-w-lg mx-auto rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7)] border border-white/10">
      <img
        src="/dndbeyond-sheet.png"
        alt="D&D Beyond character sheet"
        className="w-full block"
      />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 pointer-events-none" />
    </div>
  )
}

function DndBeyondMockup_UNUSED() {
  const abilities = [
    { label: 'STRENGTH',     abbr: 'STR', score: 12, mod: '+1' },
    { label: 'DEXTERITY',    abbr: 'DEX', score: 17, mod: '+3' },
    { label: 'CONSTITUTION', abbr: 'CON', score: 14, mod: '+2' },
    { label: 'INTELLIGENCE', abbr: 'INT', score: 14, mod: '+2' },
    { label: 'WISDOM',       abbr: 'WIS', score: 10, mod: '+0' },
    { label: 'CHARISMA',     abbr: 'CHA', score: 8,  mod: '-1' },
  ]
  const skills = [
    { abbr: 'DEX', name: 'Acrobatics',     bonus: '+5', prof: true },
    { abbr: 'INT', name: 'Investigation',  bonus: '+4', prof: true },
    { abbr: 'WIS', name: 'Perception',     bonus: '+2', prof: true },
    { abbr: 'DEX', name: 'Sleight of Hand',bonus: '+7', prof: true },
    { abbr: 'DEX', name: 'Stealth',        bonus: '+7', prof: true },
    { abbr: 'CHA', name: 'Deception',      bonus: '-1', prof: false },
    { abbr: 'STR', name: 'Athletics',      bonus: '+1', prof: false },
  ]
  const attacks = [
    { name: 'Dagger',     type: 'Melee · Finesse', range: '20/60', hit: '+5', dmg: '1d4+3' },
    { name: 'Shortbow',   type: 'Ranged',           range: '80/320', hit: '+5', dmg: '1d6+3' },
    { name: 'Shortsword', type: 'Melee · Finesse',  range: '5 ft.',  hit: '+5', dmg: '1d6+3' },
  ]

  return (
    <div className="w-full max-w-lg mx-auto rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7)] border border-white/10 bg-[#1c1c1e] font-ui select-none">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#111113] border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-red-700 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
              <path d="M10 2L3 7v6c0 3.87 2.99 7.49 7 8.93C14.01 20.49 17 16.87 17 13V7l-7-5z"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-white tracking-wide">Aelindra Nightwhisper</p>
            <p className="text-[9px] text-white/40 uppercase tracking-wider">Human · Rogue · Level 5</p>
          </div>
        </div>
        <span className="text-[9px] text-emerald-400 flex items-center gap-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          Synced
        </span>
      </div>

      {/* ── Ability scores ── */}
      <div className="px-3 pt-3 pb-2">
        <div className="grid grid-cols-6 gap-1.5">
          {abilities.map((a) => (
            <div key={a.abbr} className="flex flex-col items-center rounded-lg border-2 border-red-800/60 bg-[#111113] py-1.5 px-0.5">
              <span className="text-[7px] font-bold uppercase tracking-wider text-white/40 leading-none mb-1">{a.abbr}</span>
              <span className="text-sm font-bold text-white leading-none">{a.mod}</span>
              <span className="mt-1 text-[8px] text-white/30 leading-none">{a.score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Key stats row ── */}
      <div className="mx-3 mb-2 grid grid-cols-4 gap-1.5">
        {[
          { label: 'PROFICIENCY', value: '+3', sub: 'BONUS' },
          { label: 'INITIATIVE',  value: '+3', sub: '' },
          { label: 'ARMOR',       value: '14', sub: 'CLASS' },
          { label: 'HIT POINTS',  value: '32', sub: '/ 45' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-white/8 bg-[#111113] py-1.5 text-center">
            <p className="text-[7px] uppercase tracking-wide text-white/30 leading-none mb-0.5">{s.label}</p>
            <p className="text-sm font-bold text-white leading-none">{s.value}</p>
            {s.sub && <p className="text-[7px] text-white/30 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Body: skills + attacks ── */}
      <div className="grid grid-cols-2 gap-0 border-t border-white/8">
        {/* Skills */}
        <div className="border-r border-white/8 px-3 py-2.5">
          <p className="text-[8px] uppercase tracking-widest text-white/30 mb-2 font-bold">Skills</p>
          <div className="space-y-1.5">
            {skills.map((sk) => (
              <div key={sk.name} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 border ${
                  sk.prof ? 'bg-red-600 border-red-500' : 'bg-transparent border-white/20'
                }`} />
                <span className="text-[9px] text-white/30 w-6 shrink-0">{sk.abbr}</span>
                <span className="text-[9px] text-white/70 flex-1 truncate">{sk.name}</span>
                <span className={`text-[9px] font-bold tabular-nums ${sk.prof ? 'text-white' : 'text-white/40'}`}>{sk.bonus}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Attacks */}
        <div className="px-3 py-2.5">
          <p className="text-[8px] uppercase tracking-widest text-white/30 mb-2 font-bold">Actions</p>
          <div className="space-y-1.5">
            {attacks.map((atk) => (
              <div key={atk.name} className="rounded border border-white/8 bg-[#111113] px-2 py-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-bold text-white">{atk.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-red-400">{atk.hit}</span>
                    <span className="text-[8px] text-white/20">·</span>
                    <span className="text-[9px] text-white/60">{atk.dmg}</span>
                  </div>
                </div>
                <p className="text-[8px] text-white/30">{atk.type} · {atk.range}</p>
              </div>
            ))}
          </div>

          {/* Dice roller */}
          <div className="mt-2.5 pt-2.5 border-t border-white/8">
            <p className="text-[8px] uppercase tracking-widest text-white/30 mb-1.5 font-bold">Roll Dice</p>
            <div className="grid grid-cols-4 gap-1 mb-1.5">
              {['d20','d12','d8','d6'].map((die) => (
                <div key={die} className={`rounded border text-center py-1 text-[9px] font-bold cursor-default ${
                  die === 'd20'
                    ? 'border-red-600 bg-red-700/20 text-red-400'
                    : 'border-white/10 bg-transparent text-white/30'
                }`}>{die}</div>
              ))}
            </div>
            <div className="rounded border border-white/8 bg-[#111113] px-2 py-1 flex items-center justify-between">
              <span className="text-[8px] text-white/30 uppercase">Last roll</span>
              <span className="text-xs font-bold text-white">18 <span className="text-[8px] text-white/30 font-normal">d20+3 = 21</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Inventory mockup ─────────────────────────────────────────────────── */
function InventoryMockup() {
  const items = [
    { name: 'Sword +1', type: 'Weapon', rarity: 'Uncommon', icon: '⚔️' },
    { name: 'Leather Armor', type: 'Armor', rarity: 'Common', icon: '🛡️' },
    { name: 'Healing Potion ×3', type: 'Item', rarity: 'Common', icon: '🧪' },
    { name: 'Fireball Scroll', type: 'Scroll', rarity: 'Rare', icon: '📜' },
  ]
  const rarityColor: Record<string, string> = {
    Common: 'text-stone',
    Uncommon: 'text-emerald-400',
    Rare: 'text-blue-400',
  }
  return (
    <div className="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7)] border border-gold/20 bg-[#0f1629]">
      <div className="px-4 py-3 bg-[#0d1124] border-b border-white/5 flex items-center justify-between">
        <span className="text-xs font-ui text-gold uppercase tracking-widest font-semibold">🎒 Inventory</span>
        <div className="flex items-center gap-3 text-xs font-ui">
          <span className="text-stone/60">Weight: 28/75 lb</span>
          <span className="text-gold/80">💰 340 gp</span>
        </div>
      </div>
      <div className="p-4 space-y-2">
        {items.map((item) => (
          <div key={item.name} className="flex items-center gap-3 rounded-lg p-3 bg-[#1a1a2e] border border-white/5 hover:border-gold/20 transition-colors">
            <span className="text-xl">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-ui text-parchment font-medium truncate">{item.name}</p>
              <p className="text-xs text-stone/60 font-body">{item.type}</p>
            </div>
            <span className={`text-xs font-ui ${rarityColor[item.rarity] ?? 'text-stone'}`}>{item.rarity}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const features: {
  icon: React.ReactNode
  title: string
  desc: string
  mockup: React.ReactNode
  flip?: boolean
}[] = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    title: 'AI Dungeon Master',
    desc: 'A narrative AI that understands the world, your NPCs, and your character\'s history. Type or speak; the DM responds with vivid storytelling and dramatic choices.',
    mockup: <ChatMockup />,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
      </svg>
    ),
    title: 'Real-Time Combat',
    desc: 'Full D&D 5.5e combat with initiative tracking, conditions, and HP. The DM runs the enemies; you make the decisions.',
    mockup: <CombatMockup />,
    flip: true,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
      </svg>
    ),
    title: 'Inventory & Loot',
    desc: 'Everything you carry is tracked automatically. The DM hands out level-appropriate loot, and the currency system handles gold, silver, and copper.',
    mockup: <InventoryMockup />,
    flip: true,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
      </svg>
    ),
    title: 'Narrated by Your DM',
    desc: 'Every word the DM writes is spoken aloud in a rich, cinematic voice, powered by text-to-speech. Pair it with adaptive ambient sound, mood music, and real-time SFX for a tabletop experience that feels like a film.',
    mockup: <AudioMockup />,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
      </svg>
    ),
    title: 'D&D Beyond Integration',
    desc: 'Paste your D&D Beyond shareable character link and your sheet appears instantly inside Grimoire: stats, skills, spells, and equipment, always up to date. And if you don\'t have physical dice, roll straight from your character sheet.',
    mockup: <DndBeyondMockup />,
    flip: true,
  },
]

const pills = [
  'AI Dungeon Master', 'Solo D&D 5.5e', 'Voice Control', 'Combat Tracker',
  'Inventory & Loot', 'Time & Calendar', 'Factions & Reputation', 'Campaign Memory',
  'Text-to-Speech DM', 'Ambient Sound', 'Combat Music', 'Sound Effects',
  'D&D Beyond Link', 'Digital Dice Roller', 'Live Character Sheet',
]

export function LandingPage() {
  const { user, loading, signInWithGoogle } = useAuthStore()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-midnight" role="status">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    )
  }

  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-midnight text-parchment overflow-x-hidden">
      {/* ── Injected styles ──────────────────────────────────────────── */}
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes orb { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.05)} 66%{transform:translate(-20px,15px) scale(0.97)} }
        @keyframes pill-scroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }

        .float { animation: float 6s ease-in-out infinite; }
        .shimmer-text {
          background: linear-gradient(90deg, #C9A84C 0%, #E8C97A 30%, #fff8e0 50%, #E8C97A 70%, #C9A84C 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .fade-up { animation: fadeUp 0.7s ease both; }
        .fade-up-2 { animation: fadeUp 0.7s 0.15s ease both; }
        .fade-up-3 { animation: fadeUp 0.7s 0.3s ease both; }

        .orb-1 { animation: orb 12s ease-in-out infinite; }
        .orb-2 { animation: orb 16s ease-in-out infinite reverse; }
        .orb-3 { animation: orb 10s ease-in-out infinite 4s; }

        .pill-track { animation: pill-scroll 28s linear infinite; }
        .pill-track:hover { animation-play-state: paused; }

        .hero-bg {
          background-image:
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(107,63,160,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(139,26,26,0.12) 0%, transparent 50%),
            radial-gradient(ellipse 50% 50% at 20% 60%, rgba(201,168,76,0.08) 0%, transparent 50%),
            url('/bg-2.jpg');
          background-size: cover;
          background-position: center top;
        }
        .hero-overlay {
          background: linear-gradient(to bottom,
            rgba(15,22,41,0.7) 0%,
            rgba(15,22,41,0.55) 40%,
            rgba(15,22,41,0.85) 80%,
            rgba(15,22,41,1) 100%);
        }
        .card-glow:hover {
          box-shadow: 0 0 0 1px rgba(201,168,76,0.3), 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(201,168,76,0.06);
        }
        .btn-primary {
          background: linear-gradient(135deg, #C9A84C 0%, #E8C97A 50%, #C9A84C 100%);
          background-size: 200% auto;
          transition: background-position 0.4s, transform 0.15s, box-shadow 0.3s;
        }
        .btn-primary:hover {
          background-position: right center;
          box-shadow: 0 0 40px rgba(201,168,76,0.45), 0 8px 24px rgba(0,0,0,0.4);
          transform: translateY(-1px);
        }
        .btn-primary:active { transform: scale(0.97); }

        .section-divider {
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.3) 30%, rgba(201,168,76,0.3) 70%, transparent);
          height: 1px;
        }
      `}</style>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-midnight/70 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Grimoire" className="h-8 w-8 drop-shadow-[0_0_10px_rgba(201,168,76,0.5)]" />
          <span className="font-display font-bold text-lg tracking-wide text-parchment">Grimoire</span>
        </div>
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-2 px-5 py-2 rounded-full border border-gold/30 bg-gold/5 text-sm font-ui font-medium text-gold hover:bg-gold/15 hover:border-gold/50 transition-all"
        >
          Sign in
        </button>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-32 text-center hero-bg">
        <div className="hero-overlay absolute inset-0" />

        {/* Atmospheric orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="orb-1 absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-mystic/10 blur-[100px]" />
          <div className="orb-2 absolute top-1/2 right-1/4 w-80 h-80 rounded-full bg-gold/8 blur-[80px]" />
          <div className="orb-3 absolute bottom-1/4 left-1/2 w-64 h-64 rounded-full bg-blood/8 blur-[80px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/5 px-4 py-1.5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
            <span className="text-xs font-ui uppercase tracking-[0.2em] text-gold/80">AI-Powered Solo D&D 5.5e</span>
          </div>

          <h1 className="fade-up-2 mb-6 font-display font-bold leading-[1.05] text-parchment" style={{ fontSize: 'clamp(2.8rem,8vw,5.5rem)' }}>
            Your adventure.<br />
            <span className="shimmer-text">Your story.</span>
          </h1>

          <p className="fade-up-3 mb-10 mx-auto max-w-xl text-lg font-body text-stone/90 leading-relaxed">
            Grimoire is your AI-powered dungeon master, always ready, always immersive.
            Experience solo D&D as if you were sitting at a real table.
          </p>

          <div className="fade-up-3 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={signInWithGoogle}
              className="btn-primary flex items-center gap-3 px-7 py-3.5 rounded-full text-dark-navy font-ui font-bold text-sm"
            >
              <GoogleIcon />
              Start playing for free
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 px-7 py-3.5 rounded-full border border-parchment/15 bg-white/5 text-parchment/70 font-ui text-sm hover:bg-white/10 hover:text-parchment hover:border-parchment/30 transition-all"
            >
              See features
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>

          <p className="mt-5 text-xs text-mist/50 font-body italic">
            Free to get started &middot; No credit card required
          </p>
        </div>

        {/* Hero mockup */}
        <div className="relative z-10 mt-16 w-full max-w-lg mx-auto float">
          <div className="absolute -inset-8 rounded-3xl bg-gradient-to-b from-mystic/10 via-gold/5 to-transparent blur-2xl pointer-events-none" />
          <ChatMockup />
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-mist/30 animate-bounce">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </section>

      {/* ── Pill ticker ──────────────────────────────────────────────── */}
      <div className="py-5 border-y border-gold/10 overflow-hidden bg-dark-navy/60 backdrop-blur-sm">
        <div className="pill-track flex gap-4 w-max">
          {[...pills, ...pills].map((p, i) => (
            <span
              key={i}
              className="shrink-0 px-5 py-2 rounded-full border border-gold/15 bg-gold/5 text-sm font-ui text-gold/70 whitespace-nowrap"
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="relative py-32 px-4 overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: "url('/bg-4.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(15,22,41,0.92) 0%, rgba(15,22,41,0.82) 50%, rgba(15,22,41,0.92) 100%)' }} />
        <div className="relative z-10 max-w-6xl mx-auto space-y-32">
          {features.map((f) => (
            <div
              key={f.title}
              className={`flex flex-col ${f.flip ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-20`}
            >
              {/* Text side */}
              <div className="flex-1 space-y-5">
                <div className="inline-flex items-center gap-3 rounded-xl border border-gold/20 bg-gold/5 px-4 py-2">
                  <span className="text-gold">{f.icon}</span>
                  <span className="text-xs font-ui uppercase tracking-widest text-gold/70">{f.title}</span>
                </div>
                <h2 className="font-display font-bold text-3xl sm:text-4xl text-parchment leading-tight">
                  {f.title}
                </h2>
                <p className="text-base font-body text-stone leading-relaxed max-w-md">{f.desc}</p>
              </div>

              {/* Mockup side */}
              <div className="flex-1 w-full">
                <div className="relative">
                  <div className={`absolute -inset-6 rounded-3xl blur-2xl pointer-events-none opacity-60 ${
                    f.flip ? 'bg-blood/10' : 'bg-mystic/10'
                  }`} />
                  {f.mockup}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="section-divider mx-8 sm:mx-24" />

      {/* ── More features grid ───────────────────────────────────────── */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: "url('/bg-village.jpg')", backgroundSize: 'cover', backgroundPosition: 'center top' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(15,22,41,0.93) 0%, rgba(15,22,41,0.85) 50%, rgba(15,22,41,0.93) 100%)' }} />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-ui uppercase tracking-[0.25em] text-gold/60 mb-3">And more</p>
            <h2 className="font-display font-bold text-3xl text-parchment">Everything you need at the table</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: '🎙️', title: 'Voice Control',
                desc: 'Speak to your DM as if you were at the table. Voice input with real-time response.',
                color: 'border-mystic/20 hover:border-mystic/40',
                glow: 'group-hover:bg-mystic/5',
              },
              {
                icon: '🕐', title: 'Time & Calendar',
                desc: 'The world lives. Track days, seasons, and events in a living fantasy calendar.',
                color: 'border-gold/15 hover:border-gold/30',
                glow: 'group-hover:bg-gold/3',
              },
              {
                icon: '👥', title: 'Factions & Reputation',
                desc: 'Your choices shape the world. Earn trust with allies or make powerful enemies.',
                color: 'border-blood/20 hover:border-blood/40',
                glow: 'group-hover:bg-blood/5',
              },
              {
                icon: '🗺️', title: 'Campaign Memory',
                desc: 'The AI remembers everything: every NPC, event, and secret in your campaign.',
                color: 'border-gold/15 hover:border-gold/30',
                glow: 'group-hover:bg-gold/3',
              },
              {
                icon: '📖', title: 'Rulebooks',
                desc: 'Upload your own rulebooks and Grimoire learns your system.',
                color: 'border-mystic/20 hover:border-mystic/40',
                glow: 'group-hover:bg-mystic/5',
              },
              {
                icon: '🎲', title: 'Fate Oracle',
                desc: 'The Myth & Magic Fate Chart resolves events, with probability-based answers to anything.',
                color: 'border-blood/20 hover:border-blood/40',
                glow: 'group-hover:bg-blood/5',
              },
            ].map((item) => (
              <div
                key={item.title}
                className={`group relative rounded-2xl border bg-dark-navy p-6 transition-all duration-300 card-glow ${item.color}`}
              >
                <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${item.glow}`} />
                <div className="relative">
                  <span className="text-3xl mb-4 block">{item.icon}</span>
                  <h3 className="font-display font-semibold text-lg text-parchment mb-2">{item.title}</h3>
                  <p className="text-sm font-body text-stone leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider mx-8 sm:mx-24" />

      {/* ── Testimonial ──────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-6 flex justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <svg key={i} viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gold">
                <path d="M12 2l2.5 7H22l-6 4.4 2.3 7-6.3-4.6L5.7 20.4 8 13.4 2 9h7.5z" />
              </svg>
            ))}
          </div>
          <blockquote className="font-body italic text-xl text-parchment/90 leading-relaxed mb-6">
            "Finally I can enjoy D&D when my friends aren't available. Grimoire understands my playstyle and tells stories that actually draw me in."
          </blockquote>
          <p className="text-sm font-ui text-mist/50">- Solo Adventurer</p>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="relative py-32 px-4 overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/bg-6.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-midnight via-midnight/70 to-midnight" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(107,63,160,0.2), transparent)' }} />

        <div className="relative z-10 max-w-xl mx-auto text-center">
          <img src={logo} alt="Grimoire" className="mx-auto mb-6 h-20 w-20 float drop-shadow-[0_0_30px_rgba(201,168,76,0.5)]" />
          <h2 className="mb-4 font-display font-bold text-4xl sm:text-5xl text-parchment leading-tight">
            Ready to begin<br />your adventure?
          </h2>
          <p className="mb-8 font-body text-lg text-stone/90">
            Join thousands of solo adventurers and let Grimoire be your personal dungeon master.
          </p>
          <button
            onClick={signInWithGoogle}
            className="btn-primary flex items-center gap-3 mx-auto px-8 py-4 rounded-full text-dark-navy font-ui font-bold text-base"
          >
            <GoogleIcon />
            Get started for free
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-gold/8 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Grimoire" className="h-6 w-6 opacity-50" />
            <span className="font-display text-sm text-mist/60">Grimoire</span>
          </div>
          <p className="text-xs font-body text-mist/40 italic">Your adventures await beyond the gate...</p>
          <p className="text-xs font-ui text-mist/30">© {new Date().getFullYear()} Grimoire</p>
        </div>
      </footer>
    </div>
  )
}
