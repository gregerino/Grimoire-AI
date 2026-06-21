import { useEffect, useState } from 'react'
import { Volume2, VolumeX, Loader2 } from 'lucide-react'
import { useSpeechStore, type TtsLanguage, type TtsTemperature } from '@/stores/speechStore'
import { fetchTtsAudio, fetchTtsVoices, type TtsVoice } from '@/lib/api'

const NARRATOR_PREVIEW = 'Hello there! I am your narrator for this campaign. Lets go on an adventure together.'

export function SpeechSettingsPanel() {
  const { enabled, autoRead, defaultVoiceId, ttsLanguage, ttsTemperature, setEnabled, setAutoRead, setDefaultVoiceId, setTtsLanguage, setTtsTemperature } = useSpeechStore()
  const [playing, setPlaying] = useState(false)
  const [voices, setVoices] = useState<TtsVoice[]>([])
  const [loadingVoices, setLoadingVoices] = useState(false)

  useEffect(() => {
    if (!enabled) return
    setLoadingVoices(true)
    fetchTtsVoices()
      .then(setVoices)
      .catch(() => {})
      .finally(() => setLoadingVoices(false))
  }, [enabled])

  const playNarratorPreview = async () => {
    if (playing) return
    setPlaying(true)
    try {
      const blob = await fetchTtsAudio(NARRATOR_PREVIEW, 'narrator', defaultVoiceId)
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => {
        URL.revokeObjectURL(url)
        setPlaying(false)
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        setPlaying(false)
      }
      await audio.play()
    } catch {
      setPlaying(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-parchment">Röst (Inworld)</span>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
            enabled
              ? 'bg-gold/20 text-gold'
              : 'bg-navy text-gray-500 hover:text-gray-400'
          }`}
        >
          {enabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
          {enabled ? 'På' : 'Av'}
        </button>
      </div>

      {enabled && (
        <>
          <label className="flex items-center justify-between text-xs text-gray-400">
            Läs upp automatiskt
            <input
              type="checkbox"
              checked={autoRead}
              onChange={(e) => setAutoRead(e.target.checked)}
              className="accent-gold"
            />
          </label>

          <div className="space-y-1">
            <label className="text-xs text-gray-400">Språk för uppläsning</label>
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
            <label className="text-xs text-gray-400">Berättarröst</label>
            {loadingVoices ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Laddar röster...
              </div>
            ) : (
              <>
                <select
                  value={defaultVoiceId ?? ''}
                  onChange={(e) => setDefaultVoiceId(e.target.value || null)}
                  className="w-full rounded border border-navy bg-dark-navy px-2 py-1.5 text-xs text-parchment focus:border-gold/50 focus:outline-none"
                >
                  <option value="">Amelia Tyler / BG3 (standard)</option>
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.description ? `— ${v.description}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={playNarratorPreview}
                  disabled={playing}
                  className="mt-1.5 flex w-full items-center justify-center gap-2 rounded border border-navy px-2 py-2 text-xs text-gold/60 hover:border-gold/30 hover:bg-gold/5 hover:text-gold disabled:opacity-50 transition-colors"
                >
                  {playing ? (
                    <Loader2 className="h-3 w-3 animate-spin text-gold" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                  <span>Lyssna på rösten</span>
                </button>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-gray-400">Uttrycksfullhet</label>
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
              className="w-full accent-gold"
            />
            <div className="flex justify-between text-[10px] text-gray-600">
              <span>Lugn</span>
              <span>Normal</span>
              <span>Dramatisk</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
