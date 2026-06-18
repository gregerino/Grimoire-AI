import { useEffect } from 'react'
import { Flag } from 'lucide-react'
import { useReputationStore } from '@/stores/reputationStore'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { getReputationTier, getReputationColor, getReputationLabel } from '@/lib/reputation'
import type { Faction, FactionReputation } from '@/types/database'

interface Props {
  campaignId: string
}

export function ReputationPanel({ campaignId }: Props) {
  const { factions, reputations, setFactions, setReputations } = useReputationStore()
  const { rows: factionRows, loading: fLoading } = useRealtimeTable<Faction>({ table: 'factions', campaignId })
  const { rows: repRows, loading: rLoading } = useRealtimeTable<FactionReputation>({ table: 'faction_reputation', campaignId })

  useEffect(() => {
    setFactions(factionRows)
  }, [factionRows, setFactions])

  useEffect(() => {
    setReputations(repRows)
  }, [repRows, setReputations])

  if (fLoading || rLoading) {
    return <div className="p-4 text-stone-500 text-sm">Loading factions...</div>
  }

  if (factions.length === 0) {
    return (
      <div className="p-4 text-center text-stone-500">
        <Flag className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No factions encountered yet.</p>
        <p className="text-xs mt-1 opacity-60">Factions will appear as you explore the world.</p>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-3">
      <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wide flex items-center gap-2">
        <Flag className="w-4 h-4" />
        Faction Standings
      </h3>
      {factions.map((faction) => {
        const rep = reputations.find((r) => r.faction_id === faction.id)
        const score = rep?.score ?? 50
        const tier = getReputationTier(score)
        const color = getReputationColor(tier)
        const label = getReputationLabel(tier)

        return (
          <div key={faction.id} className="bg-stone-800/50 rounded-lg p-3 border border-stone-700/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-stone-200">{faction.name}</span>
              <span className={`text-xs font-semibold ${color}`}>{label}</span>
            </div>
            {faction.description && (
              <p className="text-xs text-stone-500 mb-2">{faction.description}</p>
            )}
            {faction.alignment && (
              <p className="text-xs text-stone-600 mb-2 italic">{faction.alignment}</p>
            )}
            <div className="relative h-2 bg-stone-700 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{
                  width: `${score}%`,
                  backgroundColor: score <= 10 ? '#ef4444'
                    : score <= 25 ? '#fb923c'
                    : score <= 50 ? '#9ca3af'
                    : score <= 70 ? '#4ade80'
                    : score <= 90 ? '#60a5fa'
                    : '#c084fc',
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-stone-600">0</span>
              <span className="text-[10px] text-stone-500">{score}/100</span>
              <span className="text-[10px] text-stone-600">100</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
