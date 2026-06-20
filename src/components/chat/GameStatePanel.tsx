import { useState, useEffect, useCallback } from 'react'
import { Heart, Flame, MapPin, AlertTriangle, Brain, ChevronDown, ChevronUp, Swords, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCombatStore } from '@/stores/combatStore'
import { useTimeStore, TIME_ICONS, TIME_LABELS } from '@/stores/timeStore'
import type { Campaign } from '@/types/database'

interface Memory {
  id: string
  content: string
  created_at: string
}

interface Props {
  campaign: Campaign
}

export function GameStatePanel({ campaign }: Props) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [showAllMemories, setShowAllMemories] = useState(false)
  const [liveCampaign, setLiveCampaign] = useState(campaign)
  const { worldTime, fetchTime } = useTimeStore()

  useEffect(() => { fetchTime(campaign.id) }, [campaign.id, fetchTime])

  const fetchLiveData = useCallback(async () => {
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase
        .from('campaigns')
        .select('chaos_factor, current_hp, max_hp')
        .eq('id', campaign.id)
        .single(),
      supabase
        .from('campaign_memories')
        .select('id, content, created_at')
        .eq('campaign_id', campaign.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])
    if (c) {
      setLiveCampaign((prev) => ({ ...prev, ...c }))
    }
    if (m) setMemories(m as Memory[])
  }, [campaign.id])

  useEffect(() => {
    fetchLiveData()

    const campaignChannel = supabase
      .channel(`campaign:${campaign.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'campaigns', filter: `id=eq.${campaign.id}` },
        (payload) => {
          setLiveCampaign((prev) => ({ ...prev, ...payload.new }))
        },
      )
      .subscribe()

    const memoriesChannel = supabase
      .channel(`memories:${campaign.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'campaign_memories', filter: `campaign_id=eq.${campaign.id}` },
        (payload) => {
          setMemories((prev) => [payload.new as Memory, ...prev].slice(0, 20))
        },
      )
      .subscribe()

    return () => {
      campaignChannel.unsubscribe()
      memoriesChannel.unsubscribe()
    }
  }, [fetchLiveData, campaign.id])

  const hp = liveCampaign.current_hp
  const maxHp = liveCampaign.max_hp
  const chaos = liveCampaign.chaos_factor ?? 5
  const hpPercent = hp != null && maxHp ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : null

  const hpColor =
    hpPercent != null
      ? hpPercent > 50
        ? 'bg-green-500'
        : hpPercent > 25
          ? 'bg-yellow-500'
          : 'bg-red-500'
      : ''

  const chaosColor =
    chaos <= 3 ? 'text-blue-400' : chaos <= 6 ? 'text-yellow-400' : 'text-red-400'

  const chaosLabel =
    chaos <= 2 ? 'Calm' : chaos <= 4 ? 'Stable' : chaos <= 6 ? 'Volatile' : chaos <= 8 ? 'Wild' : 'Unhinged'

  const displayMemories = showAllMemories ? memories : memories.slice(0, 5)

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
        Game State
      </h3>

      {/* Combat Status */}
      <CombatStatusBadge />

      {/* HP Bar */}
      {hp != null && maxHp != null ? (
        <div className="rounded-xl border border-navy bg-dark-navy p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-400" />
              <span className="text-xs font-medium text-gray-400">Hit Points</span>
            </div>
            <span className="text-sm font-bold text-parchment">
              {hp} / {maxHp}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-navy">
            <div
              className={`h-full rounded-full transition-all duration-500 ${hpColor}`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-navy bg-dark-navy/50 p-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Heart className="h-4 w-4" />
            <span className="text-xs">HP not set — the DM will track it once combat begins</span>
          </div>
        </div>
      )}

      {/* Time of Day */}
      <div className="rounded-xl border border-navy bg-dark-navy p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-medium text-gray-400">Time</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">{TIME_ICONS[worldTime.timeOfDay]}</span>
            <span className="text-sm font-medium text-parchment">{TIME_LABELS[worldTime.timeOfDay]}</span>
            <span className="text-[10px] text-gray-500">Day {worldTime.day}</span>
          </div>
        </div>
      </div>

      {/* Chaos Factor */}
      <div className="rounded-xl border border-navy bg-dark-navy p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className={`h-4 w-4 ${chaosColor}`} />
            <span className="text-xs font-medium text-gray-400">Chaos Factor</span>
          </div>
          <span className={`text-sm font-bold ${chaosColor}`}>{chaos} / 9</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 9 }, (_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                i < chaos
                  ? i < 3
                    ? 'bg-blue-500'
                    : i < 6
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  : 'bg-navy'
              }`}
            />
          ))}
        </div>
        <div className={`mt-1.5 text-right text-[10px] font-medium uppercase tracking-wider ${chaosColor}`}>
          {chaosLabel}
        </div>
      </div>

      {/* Character Info */}
      <div className="rounded-xl border border-navy bg-dark-navy p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-600">Character</div>
            <div className="text-sm font-medium text-parchment">
              {campaign.character_name || '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-600">Class</div>
            <div className="text-sm font-medium text-parchment">
              Lvl {campaign.character_level} {campaign.character_class || '—'}
            </div>
          </div>
          <div className="col-span-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-gray-600" />
              <span className="text-[10px] uppercase tracking-wider text-gray-600">Setting</span>
            </div>
            <div className="text-sm text-gray-400">{campaign.setting || 'Unknown'}</div>
          </div>
        </div>
      </div>

      {/* Campaign Memories */}
      {memories.length > 0 && (
        <div className="rounded-xl border border-navy bg-dark-navy p-4">
          <div className="mb-3 flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-medium text-gray-400">Campaign Memory</span>
            <span className="ml-auto text-[10px] text-gray-600">{memories.length}</span>
          </div>
          <div className="space-y-2">
            {displayMemories.map((m) => (
              <div key={m.id} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-gold/40" />
                <p className="text-xs leading-relaxed text-gray-400">{m.content}</p>
              </div>
            ))}
          </div>
          {memories.length > 5 && (
            <button
              onClick={() => setShowAllMemories(!showAllMemories)}
              className="mt-2 flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-400 transition-colors"
            >
              {showAllMemories ? (
                <>
                  <ChevronUp className="h-3 w-3" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" /> Show {memories.length - 5} more
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function CombatStatusBadge() {
  const inCombat = useCombatStore((s) => s.inCombat)
  const round = useCombatStore((s) => s.round)

  if (!inCombat) return null

  return (
    <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
      <Swords className="h-4 w-4 text-red-400" />
      <span className="text-xs font-medium text-red-400">In Combat</span>
      <span className="ml-auto rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
        Round {round}
      </span>
    </div>
  )
}
