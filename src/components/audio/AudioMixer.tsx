import { Volume2, VolumeX, Music, TreePine, Zap } from 'lucide-react'
import { useAudioStore } from '@/stores/audioStore'

function VolumeSlider({
  label,
  icon: Icon,
  value,
  muted,
  onChange,
  onToggleMute,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  value: number
  muted: boolean
  onChange: (v: number) => void
  onToggleMute: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggleMute}
        className={`shrink-0 rounded p-1 transition-colors ${
          muted ? 'text-gray-600' : 'text-gold'
        } hover:bg-navy`}
        title={`${muted ? 'Unmute' : 'Mute'} ${label}`}
      >
        {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
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
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-navy accent-gold [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold"
        />
      </div>
    </div>
  )
}

export function AudioMixer() {
  const store = useAudioStore()

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gold">Audio Mixer</h3>

      <VolumeSlider
        label="Master"
        icon={Volume2}
        value={store.masterVolume}
        muted={false}
        onChange={store.setMasterVolume}
        onToggleMute={() => {}}
      />

      <div className="h-px bg-navy" />

      <VolumeSlider
        label="Ambient"
        icon={TreePine}
        value={store.ambientVolume}
        muted={store.ambientMuted}
        onChange={store.setAmbientVolume}
        onToggleMute={store.toggleAmbientMute}
      />

      <VolumeSlider
        label="Music"
        icon={Music}
        value={store.musicVolume}
        muted={store.musicMuted}
        onChange={store.setMusicVolume}
        onToggleMute={store.toggleMusicMute}
      />

      <VolumeSlider
        label="SFX"
        icon={Zap}
        value={store.sfxVolume}
        muted={store.sfxMuted}
        onChange={store.setSfxVolume}
        onToggleMute={store.toggleSfxMute}
      />

      {store.currentAmbient && (
        <div className="rounded-lg bg-navy/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Now playing</p>
          <p className="text-xs text-parchment">
            <TreePine className="mr-1 inline h-3 w-3 text-green-400" />
            {store.currentAmbient}
            {store.currentMusic && (
              <>
                <span className="mx-1.5 text-gray-600">·</span>
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
