import { create } from 'zustand'
import type { Faction, FactionReputation, ReputationTier } from '@/types/database'
import { getReputationTier } from '@/lib/reputation'

interface ReputationState {
  factions: Faction[]
  reputations: FactionReputation[]
  loading: boolean

  setFactions: (factions: Faction[]) => void
  setReputations: (reputations: FactionReputation[]) => void
  addFaction: (faction: Faction) => void
  updateReputation: (factionId: string, newScore: number) => void
  getReputationForFaction: (factionId: string) => { score: number; tier: ReputationTier } | null
}

export const useReputationStore = create<ReputationState>((set, get) => ({
  factions: [],
  reputations: [],
  loading: false,

  setFactions: (factions) => set({ factions }),
  setReputations: (reputations) => set({ reputations }),

  addFaction: (faction) =>
    set((state) => ({ factions: [...state.factions, faction] })),

  updateReputation: (factionId, newScore) =>
    set((state) => ({
      reputations: state.reputations.map((r) =>
        r.faction_id === factionId ? { ...r, score: newScore } : r,
      ),
    })),

  getReputationForFaction: (factionId) => {
    const rep = get().reputations.find((r) => r.faction_id === factionId)
    if (!rep) return null
    return { score: rep.score, tier: getReputationTier(rep.score) }
  },
}))
