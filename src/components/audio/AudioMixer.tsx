import { Volume2, VolumeX, Music, TreePine, Zap, VolumeOff, Mic } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAudioStore } from '@/stores/audioStore'
import { useSpeechStore } from '@/stores/speechStore'

function VolumeSlider({
  label,
  icon: Icon,
  value,
  muted,
  onChange,
  onToggleMute,
  disabled,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  value: number
  muted: boolean
  onChange: (v: number) => void
  onToggleMute: () => void
  disabled?: boolean
}) {
  return (
    <div className={`flex items-center gap-2 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      <button
        onClick={onToggleMute}
        className={`shrink-0 rounded p-1 transition-colors focus-ring ${
          muted ? 'text-gray-600' : 'text-gold'
        } hover:bg-navy`}
        aria-label={`${muted ? 'Slå på' : 'Tysta'} ${label}`}
        aria-pressed={!muted}
      >
        {muted ? <VolumeX className="h-3.5 w-3.5" aria-hidden="true" /> : <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
          <span className="text-[10px] text-gray-600">{Math.round(value * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={`${label} volym`}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-navy accent-gold [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold"
        />
      </div>
    </div>
  )
}

export function AudioMixer() {
  const store = useAudioStore()
  const speechEnabled = useSpeechStore((s) => s.enabled)
  const ttsVolume = useSpeechStore((s) => s.ttsVolume)
  const setTtsVolume = useSpeechStore((s) => s.setTtsVolume)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gold">Ljudmixer</h3>
        <button
          onClick={store.toggleQuietMode}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-all ${
            store.quietMode
              ? 'bg-red-500/15 text-red-400 border border-red-500/20'
              : 'bg-gold/10 text-gold/70 border border-gold/15 hover:text-gold'
          }`}
          title="Tyst läge (M)"
        >
          {store.quietMode ? (
            <VolumeOff className="h-3 w-3" />
          ) : (
            <Volume2 className="h-3 w-3" />
          )}
          <span>{store.quietMode ? 'Tyst' : 'Ljud på'}</span>
          <kbd className="ml-1 rounded bg-navy/50 px-1 py-0.5 font-ui text-[9px] text-mist">M</kbd>
        </button>
      </div>

      {store.quietMode && (
        <motion.div
          className="rounded-lg border border-red-500/15 bg-red-500/5 px-3 py-2 text-xs text-red-300/70"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          Tyst läge aktivt — allt ljud är avstängt. Tryck <kbd className="rounded bg-navy/50 px-1 py-0.5 font-ui text-[9px]">M</kbd> för att slå på igen.
        </motion.div>
      )}

      <VolumeSlider
        label="Master"
        icon={Volume2}
        value={store.masterVolume}
        muted={store.quietMode}
        onChange={store.setMasterVolume}
        onToggleMute={store.toggleQuietMode}
        disabled={store.quietMode}
      />

      <div className="h-px bg-navy" />

      <VolumeSlider
        label="Ambient"
        icon={TreePine}
        value={store.ambientVolume}
        muted={store.ambientMuted || store.quietMode}
        onChange={store.setAmbientVolume}
        onToggleMute={store.toggleAmbientMute}
        disabled={store.quietMode}
      />

      <VolumeSlider
        label="Musik"
        icon={Music}
        value={store.musicVolume}
        muted={store.musicMuted || store.quietMode}
        onChange={store.setMusicVolume}
        onToggleMute={store.toggleMusicMute}
        disabled={store.quietMode}
      />

      <VolumeSlider
        label="Effekter"
        icon={Zap}
        value={store.sfxVolume}
        muted={store.sfxMuted || store.quietMode}
        onChange={store.setSfxVolume}
        onToggleMute={store.toggleSfxMute}
        disabled={store.quietMode}
      />

      {speechEnabled && (
        <VolumeSlider
          label="Röst (TTS)"
          icon={Mic}
          value={ttsVolume}
          muted={store.quietMode}
          onChange={setTtsVolume}
          onToggleMute={store.toggleQuietMode}
          disabled={store.quietMode}
        />
      )}

      {(store.currentAmbient || store.currentMusic) && (
        <div className="rounded-lg bg-navy/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Spelas nu</p>
          <p className="text-xs text-parchment">
            {store.currentAmbient && (
              <>
                <TreePine className="mr-1 inline h-3 w-3 text-green-400" />
                {store.currentAmbient}
              </>
            )}
            {store.currentAmbient && store.currentMusic && (
              <span className="mx-1.5 text-gray-600">·</span>
            )}
            {store.currentMusic && (
              <>
                <Music className="mr-1 inline h-3 w-3 text-purple-400" />
                {store.currentMusic}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
