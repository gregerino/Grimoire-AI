import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface BackgroundOption {
  id: string
  label: string
  src: string
}

export const BACKGROUNDS: BackgroundOption[] = [
  { id: 'village', label: 'Village', src: '/bg-village.jpg' },
  { id: 'windmill', label: 'Windmill Sunset', src: '/bg-1.jpg' },
  { id: 'forest-city', label: 'Forest City', src: '/bg-2.jpg' },
  { id: 'ruins', label: 'Ancient Ruins', src: '/bg-3.jpg' },
  { id: 'dragons', label: 'Dragons', src: '/bg-4.jpg' },
  { id: 'valley', label: 'Valley', src: '/bg-5.webp' },
  { id: 'hilltop', label: 'Hilltop Chapel', src: '/bg-6.jpg' },
  { id: 'crystal-castle', label: 'Crystal Castle', src: '/bg-7.webp' },
  { id: 'none', label: 'None', src: '' },
]

interface BackgroundState {
  backgroundId: string
  setBackground: (id: string) => void
  getBackgroundSrc: () => string
}

export const useBackgroundStore = create<BackgroundState>()(
  persist(
    (set, get) => ({
      backgroundId: 'village',
      setBackground: (id) => set({ backgroundId: id }),
      getBackgroundSrc: () => {
        const bg = BACKGROUNDS.find((b) => b.id === get().backgroundId)
        return bg?.src ?? ''
      },
    }),
    { name: 'grimoire-background' },
  ),
)
