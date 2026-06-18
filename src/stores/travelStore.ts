import { create } from 'zustand'
import type { WorldLocation } from '@/types/database'

interface TravelEncounter {
  type: string
  action: string
  subject: string
}

interface TravelState {
  isTraveling: boolean
  fromLocation: WorldLocation | null
  toLocation: WorldLocation | null
  encounterPending: boolean
  encounter: TravelEncounter | null
  duration: number | null

  startTravel: (from: WorldLocation, to: WorldLocation) => void
  setEncounter: (encounter: TravelEncounter | null) => void
  setDuration: (hours: number) => void
  endTravel: () => void
}

export const useTravelStore = create<TravelState>((set) => ({
  isTraveling: false,
  fromLocation: null,
  toLocation: null,
  encounterPending: false,
  encounter: null,
  duration: null,

  startTravel: (from, to) =>
    set({
      isTraveling: true,
      fromLocation: from,
      toLocation: to,
      encounterPending: false,
      encounter: null,
      duration: null,
    }),

  setEncounter: (encounter) =>
    set({ encounter, encounterPending: !!encounter }),

  setDuration: (hours) => set({ duration: hours }),

  endTravel: () =>
    set({
      isTraveling: false,
      fromLocation: null,
      toLocation: null,
      encounterPending: false,
      encounter: null,
      duration: null,
    }),
}))
