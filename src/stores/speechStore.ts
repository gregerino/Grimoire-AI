import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type VoiceProfileKey = 'narrator' | 'villain' | 'elder' | 'warrior' | 'mystic' | 'merchant'
export type TtsLanguage = 'sv' | 'en'

interface SpeechState {
  enabled: boolean
  autoRead: boolean
  defaultVoiceId: string | null
  ttsLanguage: TtsLanguage
  setEnabled: (v: boolean) => void
  setAutoRead: (v: boolean) => void
  setDefaultVoiceId: (v: string | null) => void
  setTtsLanguage: (v: TtsLanguage) => void
}

export const useSpeechStore = create<SpeechState>()(
  persist(
    (set) => ({
      enabled: false,
      autoRead: true,
      defaultVoiceId: null,
      ttsLanguage: 'sv',
      setEnabled: (v) => set({ enabled: v }),
      setAutoRead: (v) => set({ autoRead: v }),
      setDefaultVoiceId: (v) => set({ defaultVoiceId: v }),
      setTtsLanguage: (v) => set({ ttsLanguage: v }),
    }),
    { name: 'grimoire-speech' },
  ),
)
