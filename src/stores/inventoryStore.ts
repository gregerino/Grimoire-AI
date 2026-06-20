import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { InventoryItem, CampaignCurrency } from '@/types/database'

interface InventoryState {
  currency: CampaignCurrency | null
  encumbranceEnabled: boolean

  setEncumbranceEnabled: (enabled: boolean) => void
  fetchCurrency: (campaignId: string) => Promise<void>
  updateCurrency: (campaignId: string, gp: number, sp: number, cp: number) => Promise<void>
  addCurrency: (campaignId: string, delta: { gp?: number; sp?: number; cp?: number }) => Promise<void>
  reorderItems: (campaignId: string, itemIds: string[]) => Promise<void>
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  currency: null,
  encumbranceEnabled: false,

  setEncumbranceEnabled: (enabled) => set({ encumbranceEnabled: enabled }),

  fetchCurrency: async (campaignId) => {
    const { data } = await supabase
      .from('campaign_currency')
      .select('*')
      .eq('campaign_id', campaignId)
      .single()

    if (data) {
      set({ currency: data })
    } else {
      const { data: created } = await supabase
        .from('campaign_currency')
        .insert({ campaign_id: campaignId })
        .select()
        .single()
      set({ currency: created })
    }
  },

  updateCurrency: async (campaignId, gp, sp, cp) => {
    const { data } = await supabase
      .from('campaign_currency')
      .update({ gp, sp, cp, updated_at: new Date().toISOString() })
      .eq('campaign_id', campaignId)
      .select()
      .single()
    if (data) set({ currency: data })
  },

  addCurrency: async (campaignId, delta) => {
    const curr = get().currency
    if (!curr) return
    const gp = curr.gp + (delta.gp ?? 0)
    const sp = curr.sp + (delta.sp ?? 0)
    const cp = curr.cp + (delta.cp ?? 0)
    await get().updateCurrency(campaignId, gp, sp, cp)
  },

  reorderItems: async (_campaignId, itemIds) => {
    const updates = itemIds.map((id, i) =>
      supabase.from('inventory_items').update({ sort_order: i }).eq('id', id)
    )
    await Promise.all(updates)
  },
}))

export function calculateTotalWeight(items: InventoryItem[]): number {
  return items.reduce((sum, item) => sum + item.weight * item.quantity, 0)
}

export function getEncumbranceThreshold(strengthScore: number): { normal: number; heavy: number; max: number } {
  return {
    normal: strengthScore * 5,
    heavy: strengthScore * 10,
    max: strengthScore * 15,
  }
}

export function totalValueInGp(currency: CampaignCurrency): number {
  return currency.gp + currency.sp / 10 + currency.cp / 100
}
