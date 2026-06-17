import { useEffect, useState } from 'react'
import { Volume2, VolumeX, Loader2 } from 'lucide-react'
import { useSpeechStore, type TtsLanguage } from '@/stores/speechStore'
import { fetchTtsAudio, fetchTtsVoices, type TtsVoice } from '@/lib/api'

const VOICE_PREVIEWS: Record<string, { label: string; sample: string }> = {
  narrator: { label: 'Berättare', sample: 'Dimman sveper in över den tysta dalen. Någonting rör sig i skuggorna.' },
  villain: { label: 'Skurk — Smoky Sam', sample: 'Ni borde inte ha kommit hit. Nu är det för sent att vända om.' },
  elder: { label: 'Äldste — Bill', sample: 'Lyssna noga, unge. Denna kunskap är urgammal och farlig.' },
  warrior: { label: 'Krigare — Harry', sample: 'Vi slåss! Till seger eller undergång!' },
  mystic: { label: 'Mystiker — Lily', sample: 'Stjärnorna viskar om vad som komma skall.' },
  merchant: { label: 'Köpman — Callum', sample: 'Välkommen! Jag har precis vad ni söker, till rätt pris förstås.' },
}

export function SpeechSettingsPanel() {
  const { enabled, autoRead, defaultVoiceId, ttsLanguage, setEnabled, setAutoRead, setDefaultVoiceId, setTtsLanguage } = useSpeechStore()
  const [playing, setPlaying] = useState<string | null>(null)
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

  const playPreview = async (speaker: string, text: string) => {
    if (playing) return
    setPlaying(speaker)
    try {
      const voiceId = speaker === 'narrator' ? defaultVoiceId : undefined
      const blob = await fetchTtsAudio(text, speaker, voiceId)
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => {
        URL.revokeObjectURL(url)
        setPlaying(null)
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        setPlaying(null)
      }
      await audio.play()
    } catch {
      setPlaying(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-parchment">Röst (ElevenLabs)</span>
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
            <label className="text-xs text-gray-400">Berättarröst (default)</label>
            {loadingVoices ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Laddar röster...
              </div>
            ) : (
              <select
                value={defaultVoiceId ?? ''}
                onChange={(e) => setDefaultVoiceId(e.target.value || null)}
                className="w-full rounded border border-navy bg-dark-navy px-2 py-1.5 text-xs text-parchment focus:border-gold/50 focus:outline-none"
              >
                <option value="">George — Warm Storyteller (standard)</option>
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.description ? `— ${v.description}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-xs text-gray-400">Röstprofiler — klicka för att lyssna</span>
            {Object.entries(VOICE_PREVIEWS).map(([key, { label, sample }]) => (
              <button
                key={key}
                onClick={() => playPreview(key, sample)}
                disabled={playing !== null}
                className="flex w-full items-center gap-2 rounded border border-navy px-2 py-1.5 text-left text-xs text-parchment hover:border-gold/30 hover:bg-gold/5 disabled:opacity-50 transition-colors"
              >
                {playing === key ? (
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin text-gold" />
                ) : (
                  <Volume2 className="h-3 w-3 shrink-0 text-gold/60" />
                )}
                <div>
                  <div className="font-medium">{label}</div>
                  <div className="text-gray-500">{sample}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
