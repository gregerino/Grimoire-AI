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
  backgroundSrc: string
  setBackground: (id: string) => void
}

export const useBackgroundStore = create<BackgroundState>()(
  persist(
    (set) => ({
      backgroundId: 'village',
      backgroundSrc: '/bg-village.jpg',
      setBackground: (id) => {
        const bg = BACKGROUNDS.find((b) => b.id === id)
        set({ backgroundId: id, backgroundSrc: bg?.src ?? '' })
      },
    }),
    { name: 'grimoire-background' },
  ),
)
