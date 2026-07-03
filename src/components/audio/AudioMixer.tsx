import { useState } from 'react'
import { Volume2, VolumeX, VolumeOff, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAudioStore } from '@/stores/audioStore'
import { useSpeechStore, type TtsLanguage } from '@/stores/speechStore'
import type { TtsTemperature } from '@/stores/speechStore'
import { fetchTtsAudio } from '@/lib/api'

const NARRATOR_PREVIEW = 'Hello there! I am your narrator for this campaign. Lets go on an adventure together.'

interface ChannelProps {
  label: string
  sub: string
  icon: React.ReactNode
  value: number
  muted: boolean
  onChange: (v: number) => void
  onToggleMute: () => void
  accentClass: string
  disabled?: boolean
}

function Channel({ label, sub, icon, value, muted, onChange, onToggleMute, accentClass, disabled }: ChannelProps) {
  return (
    <div className={`flex items-center gap-3 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      <button
        onClick={onToggleMute}
        className={`shrink-0 transition-colors focus-ring ${muted ? 'text-gray-600' : ''}`}
        aria-label={`${muted ? 'Unmute' : 'Mute'} ${label}`}
        aria-pressed={!muted}
      >
        {muted ? <VolumeX className="h-4 w-4 text-gray-600" /> : icon}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs font-ui text-parchment/80">{label}</span>
          <span className="text-[10px] font-ui text-stone/40 ml-2 shrink-0 truncate max-w-[120px] text-right">{sub}</span>
        </div>

        {/* Track */}
        <div className="relative h-1.5 rounded-full bg-white/8">
          {/* Filled portion */}
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${accentClass} opacity-70 pointer-events-none`}
            style={{ width: muted ? '0%' : `${value * 100}%` }}
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label={`${label} volume`}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md pointer-events-none"
            style={{ left: muted ? '0%' : `${value * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function AudioMixer() {
  const store = useAudioStore()
  const {
    enabled: speechEnabled,
    autoRead,
    defaultVoiceId,
    ttsLanguage,
    ttsVolume,
    ttsTemperature,
    setEnabled,
    setAutoRead,
    setTtsLanguage,
    setTtsVolume,
    setTtsTemperature,
  } = useSpeechStore()
  const [playing, setPlaying] = useState(false)

  const playNarratorPreview = async () => {
    if (playing) return
    setPlaying(true)
    try {
      const blob = await fetchTtsAudio(NARRATOR_PREVIEW, 'narrator', defaultVoiceId)
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => { URL.revokeObjectURL(url); setPlaying(false) }
      audio.onerror = () => { URL.revokeObjectURL(url); setPlaying(false) }
      await audio.play()
    } catch {
      setPlaying(false)
    }
  }

  const channels = [
    {
      label: 'Ambient',
      sub: store.currentAmbient ? store.currentAmbient : 'No ambient playing',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-mystic-light">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
        </svg>
      ),
      value: store.ambientVolume,
      muted: store.ambientMuted || store.quietMode,
      onChange: store.setAmbientVolume,
      onToggleMute: store.toggleAmbientMute,
      accentClass: 'bg-mystic-light',
    },
    {
      label: 'Music',
      sub: store.currentMusic ? store.currentMusic : 'No music playing',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-blood-light">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
      value: store.musicVolume,
      muted: store.musicMuted || store.quietMode,
      onChange: store.setMusicVolume,
      onToggleMute: store.toggleMusicMute,
      accentClass: 'bg-blood-light',
    },
    {
      label: 'Sound Effects',
      sub: 'Sword hits, spells, dice',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-emerald-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
        </svg>
      ),
      value: store.sfxVolume,
      muted: store.sfxMuted || store.quietMode,
      onChange: store.setSfxVolume,
      onToggleMute: store.toggleSfxMute,
      accentClass: 'bg-emerald-400',
    },
  ] as const

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gold">Audio</h3>
        <button
          onClick={store.toggleQuietMode}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-all ${
            store.quietMode
              ? 'bg-red-500/15 text-red-400 border border-red-500/20'
              : 'bg-gold/10 text-gold/70 border border-gold/15 hover:text-gold'
          }`}
          title="Quiet mode (M)"
        >
          {store.quietMode ? <VolumeOff className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          <span>{store.quietMode ? 'Muted' : 'Sound on'}</span>
          <kbd className="ml-1 rounded bg-navy/50 px-1 py-0.5 font-ui text-[9px] text-mist">M</kbd>
        </button>
      </div>

      {store.quietMode && (
        <motion.div
          className="rounded-lg border border-red-500/15 bg-red-500/5 px-3 py-2 text-xs text-red-300/70 mb-3"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          Quiet mode active — all audio is off. Press <kbd className="rounded bg-navy/50 px-1 py-0.5 font-ui text-[9px]">M</kbd> to enable.
        </motion.div>
      )}

      {/* Channels */}
      <div className="space-y-4">
        {channels.map((ch) => (
          <Channel key={ch.label} {...ch} disabled={store.quietMode} />
        ))}

      </div>

      {/* DM Voice section */}
      <div className="h-px bg-navy my-4" />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gold">DM Voice</h3>
          <button
            onClick={() => setEnabled(!speechEnabled)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
              speechEnabled
                ? 'bg-gold/20 text-gold'
                : 'bg-navy text-gray-500 hover:text-gray-400'
            }`}
          >
            {speechEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            {speechEnabled ? 'On' : 'Off'}
          </button>
        </div>

        {speechEnabled && (
          <>
            {/* TTS volume channel */}
            <Channel
              label="Voice Volume"
              sub="Text-to-speech narration"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-gold">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              }
              value={ttsVolume}
              muted={store.quietMode}
              onChange={setTtsVolume}
              onToggleMute={store.toggleQuietMode}
              accentClass="bg-gold"
              disabled={store.quietMode}
            />

            <label className="flex items-center justify-between text-xs text-gray-400">
              Auto-read aloud
              <input
                type="checkbox"
                checked={autoRead}
                onChange={(e) => setAutoRead(e.target.checked)}
                className="accent-gold"
              />
            </label>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Language</label>
              <select
                value={ttsLanguage}
                onChange={(e) => setTtsLanguage(e.target.value as TtsLanguage)}
                className="w-full rounded border border-navy bg-dark-navy px-2 py-1.5 text-xs text-parchment focus:border-gold/50 focus:outline-none"
              >
                <option value="sv">Svenska</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Narrator voice</label>
              <div className="flex items-center justify-between rounded border border-navy bg-dark-navy px-2 py-1.5">
                <span className="text-xs text-parchment">Amelia Tyler / BG3</span>
                <button
                  onClick={playNarratorPreview}
                  disabled={playing}
                  className="flex items-center gap-1.5 text-xs text-gold/60 hover:text-gold disabled:opacity-50 transition-colors"
                >
                  {playing ? (
                    <Loader2 className="h-3 w-3 animate-spin text-gold" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                  <span>Preview</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-stone/60">Expressiveness</label>
              <div className="relative h-1.5 rounded-full bg-white/8 mt-2">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gold opacity-70 pointer-events-none"
                  style={{ width: ttsTemperature === 0.3 ? '0%' : ttsTemperature === 0.7 ? '50%' : '100%' }}
                />
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={ttsTemperature === 0.3 ? 0 : ttsTemperature === 0.7 ? 1 : 2}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setTtsTemperature((v === 0 ? 0.3 : v === 1 ? 0.7 : 1.4) as TtsTemperature)
                  }}
                  aria-label="Expressiveness"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md pointer-events-none"
                  style={{ left: ttsTemperature === 0.3 ? '0%' : ttsTemperature === 0.7 ? '50%' : '100%' }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-stone/40 mt-1">
                <span>Calm</span>
                <span>Normal</span>
                <span>Dramatic</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
