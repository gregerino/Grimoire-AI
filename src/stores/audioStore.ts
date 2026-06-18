import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AmbientType = 'tavern' | 'forest' | 'dungeon' | 'city' | 'cave' | 'field' | 'sea'
export type MusicMood = 'exploration' | 'combat' | 'tension' | 'mystery' | 'rest' | 'triumph'
export type SfxType =
  | 'sword_hit' | 'spell_cast' | 'door_creak' | 'loot_pickup'
  | 'level_up' | 'footsteps_stone' | 'dice_roll' | 'death'

interface AudioState {
  masterVolume: number
  ambientVolume: number
  musicVolume: number
  sfxVolume: number
  ambientMuted: boolean
  musicMuted: boolean
  sfxMuted: boolean
  currentAmbient: AmbientType | null
  currentMusic: MusicMood | null
  unlocked: boolean

  setMasterVolume: (v: number) => void
  setAmbientVolume: (v: number) => void
  setMusicVolume: (v: number) => void
  setSfxVolume: (v: number) => void
  toggleAmbientMute: () => void
  toggleMusicMute: () => void
  toggleSfxMute: () => void
  setCurrentAmbient: (a: AmbientType | null) => void
  setCurrentMusic: (m: MusicMood | null) => void
  setUnlocked: () => void
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      masterVolume: 0.7,
      ambientVolume: 0.5,
      musicVolume: 0.4,
      sfxVolume: 0.6,
      ambientMuted: false,
      musicMuted: false,
      sfxMuted: false,
      currentAmbient: null,
      currentMusic: null,
      unlocked: false,

      setMasterVolume: (v) => set({ masterVolume: v }),
      setAmbientVolume: (v) => set({ ambientVolume: v }),
      setMusicVolume: (v) => set({ musicVolume: v }),
      setSfxVolume: (v) => set({ sfxVolume: v }),
      toggleAmbientMute: () => set((s) => ({ ambientMuted: !s.ambientMuted })),
      toggleMusicMute: () => set((s) => ({ musicMuted: !s.musicMuted })),
      toggleSfxMute: () => set((s) => ({ sfxMuted: !s.sfxMuted })),
      setCurrentAmbient: (a) => set({ currentAmbient: a }),
      setCurrentMusic: (m) => set({ currentMusic: m }),
      setUnlocked: () => set({ unlocked: true }),
    }),
    {
      name: 'grimoire-audio',
      partialize: (s) => ({
        masterVolume: s.masterVolume,
        ambientVolume: s.ambientVolume,
        musicVolume: s.musicVolume,
        sfxVolume: s.sfxVolume,
        ambientMuted: s.ambientMuted,
        musicMuted: s.musicMuted,
        sfxMuted: s.sfxMuted,
      }),
    },
  ),
)
