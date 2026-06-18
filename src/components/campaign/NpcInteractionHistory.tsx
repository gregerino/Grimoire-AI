import { MessageSquare, Swords, ShoppingBag, ScrollText, HelpCircle } from 'lucide-react'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import type { NpcInteractionLog } from '@/types/database'

interface Props {
  npcId: string
  campaignId: string
}

const TYPE_ICONS = {
  conversation: MessageSquare,
  combat: Swords,
  trade: ShoppingBag,
  quest: ScrollText,
  other: HelpCircle,
}

const SENTIMENT_COLORS = {
  positive: 'text-green-400',
  negative: 'text-red-400',
  neutral: 'text-stone-400',
}

export function NpcInteractionHistory({ npcId, campaignId }: Props) {
  const { rows: allInteractions, loading } = useRealtimeTable<NpcInteractionLog>({
    table: 'npc_interaction_logs',
    campaignId,
    orderBy: 'created_at',
    ascending: false,
  })

  const interactions = allInteractions.filter((i) => i.npc_id === npcId)

  if (loading) {
    return <div className="text-stone-500 text-xs py-2">Loading history...</div>
  }

  if (interactions.length === 0) {
    return (
      <div className="text-stone-500 text-xs py-2 text-center">
        No recorded interactions yet.
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {interactions.map((interaction) => {
        const Icon = TYPE_ICONS[interaction.interaction_type] || HelpCircle
        const sentimentColor = interaction.sentiment
          ? SENTIMENT_COLORS[interaction.sentiment]
          : 'text-stone-500'

        return (
          <div
            key={interaction.id}
            className="flex gap-2 p-2 bg-stone-800/30 rounded border border-stone-700/30"
          >
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${sentimentColor}`} />
            <div className="min-w-0">
              <p className="text-xs text-stone-300 leading-relaxed">{interaction.summary}</p>
              <p className="text-[10px] text-stone-600 mt-1">
                {new Date(interaction.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
                {interaction.interaction_type !== 'conversation' && (
                  <span className="ml-2 capitalize">{interaction.interaction_type}</span>
                )}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
