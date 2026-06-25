import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type VoiceProfileKey = 'narrator' | 'villain' | 'elder' | 'warrior' | 'mystic' | 'merchant'
export type TtsLanguage = 'sv' | 'en'

export type TtsTemperature = 0.3 | 0.7 | 1.4

interface SpeechState {
  enabled: boolean
  autoRead: boolean
  defaultVoiceId: string | null
  ttsLanguage: TtsLanguage
  ttsTemperature: TtsTemperature
  ttsVolume: number
  setEnabled: (v: boolean) => void
  setAutoRead: (v: boolean) => void
  setDefaultVoiceId: (v: string | null) => void
  setTtsLanguage: (v: TtsLanguage) => void
  setTtsTemperature: (v: TtsTemperature) => void
  setTtsVolume: (v: number) => void
}

export const useSpeechStore = create<SpeechState>()(
  persist(
    (set) => ({
      enabled: false,
      autoRead: true,
      defaultVoiceId: null,
      ttsLanguage: 'sv',
      ttsTemperature: 0.7 as TtsTemperature,
      ttsVolume: 0.8,
      setEnabled: (v) => set({ enabled: v }),
      setAutoRead: (v) => set({ autoRead: v }),
      setDefaultVoiceId: (v) => set({ defaultVoiceId: v }),
      setTtsLanguage: (v) => set({ ttsLanguage: v }),
      setTtsTemperature: (v) => set({ ttsTemperature: v }),
      setTtsVolume: (v) => set({ ttsVolume: v }),
    }),
    { name: 'grimoire-speech' },
  ),
)
