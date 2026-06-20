import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { TimeOfDay, WorldTime } from '@/types/database'

function resolveTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 10) return 'morning'
  if (hour >= 10 && hour < 14) return 'midday'
  if (hour >= 14 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 19) return 'dusk'
  if (hour >= 19 && hour < 21) return 'evening'
  if (hour >= 21 || hour < 1) return 'night'
  return 'midnight'
}

export function getWorldTime(day: number, hour: number): WorldTime {
  return { day, hour, timeOfDay: resolveTimeOfDay(hour) }
}

interface TimeState {
  worldTime: WorldTime
  fetchTime: (campaignId: string) => Promise<void>
  advanceTime: (campaignId: string, hours: number) => Promise<void>
  setTime: (campaignId: string, day: number, hour: number) => Promise<void>
}

export const useTimeStore = create<TimeState>((set) => ({
  worldTime: { day: 1, hour: 8, timeOfDay: 'morning' },

  fetchTime: async (campaignId) => {
    const { data } = await supabase
      .from('campaigns')
      .select('world_day, world_hour')
      .eq('id', campaignId)
      .single()
    if (data) {
      set({ worldTime: getWorldTime(data.world_day, data.world_hour) })
    }
  },

  advanceTime: async (campaignId, hours) => {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('world_day, world_hour')
      .eq('id', campaignId)
      .single()
    if (!campaign) return

    let totalHours = campaign.world_hour + hours
    let day = campaign.world_day
    while (totalHours >= 24) {
      totalHours -= 24
      day++
    }
    while (totalHours < 0) {
      totalHours += 24
      day = Math.max(1, day - 1)
    }

    const { data } = await supabase
      .from('campaigns')
      .update({ world_day: day, world_hour: totalHours })
      .eq('id', campaignId)
      .select('world_day, world_hour')
      .single()

    if (data) {
      set({ worldTime: getWorldTime(data.world_day, data.world_hour) })
    }
  },

  setTime: async (campaignId, day, hour) => {
    const { data } = await supabase
      .from('campaigns')
      .update({ world_day: day, world_hour: hour })
      .eq('id', campaignId)
      .select('world_day, world_hour')
      .single()

    if (data) {
      set({ worldTime: getWorldTime(data.world_day, data.world_hour) })
    }
  },
}))

export const TIME_ICONS: Record<TimeOfDay, string> = {
  dawn: '🌅',
  morning: '☀️',
  midday: '🌞',
  afternoon: '⛅',
  dusk: '🌇',
  evening: '🌆',
  night: '🌙',
  midnight: '🌑',
}

export const TIME_LABELS: Record<TimeOfDay, string> = {
  dawn: 'Dawn',
  morning: 'Morning',
  midday: 'Midday',
  afternoon: 'Afternoon',
  dusk: 'Dusk',
  evening: 'Evening',
  night: 'Night',
  midnight: 'Midnight',
}
