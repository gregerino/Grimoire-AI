import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Campaign } from '@/types/database'

type CampaignEditable = Partial<Pick<Campaign, 'name' | 'description' | 'setting' | 'character_name' | 'character_class' | 'status'>>

interface CampaignState {
  campaigns: Campaign[]
  loading: boolean
  fetchCampaigns: () => Promise<void>
  createCampaign: (campaign: Pick<Campaign, 'name' | 'description' | 'setting' | 'character_name' | 'character_class'>) => Promise<Campaign | null>
  updateCampaign: (id: string, updates: CampaignEditable) => Promise<Campaign | null>
  deleteCampaign: (id: string) => Promise<void>
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  campaigns: [],
  loading: false,

  fetchCampaigns: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('updated_at', { ascending: false })

    if (!error && data) {
      set({ campaigns: data as Campaign[] })
    }
    set({ loading: false })
  },

  createCampaign: async (campaign) => {
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        ...campaign,
        character_level: 1,
        status: 'active',
      })
      .select()
      .single()

    if (!error && data) {
      const typed = data as Campaign
      set({ campaigns: [typed, ...get().campaigns] })
      return typed
    }
    return null
  },

  updateCampaign: async (id, updates) => {
    const { data, error } = await supabase
      .from('campaigns')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      const typed = data as Campaign
      set({ campaigns: get().campaigns.map((c) => (c.id === id ? typed : c)) })
      return typed
    }
    return null
  },

  deleteCampaign: async (id) => {
    const { error } = await supabase.from('campaigns').delete().eq('id', id)
    if (!error) {
      set({ campaigns: get().campaigns.filter((c) => c.id !== id) })
    }
  },
}))
