import { Link } from 'react-router-dom'
import { Sword, Clock, Trash2 } from 'lucide-react'
import type { Campaign } from '@/types/database'

interface Props {
  campaign: Campaign
  onDelete: (id: string) => void
}

export function CampaignCard({ campaign, onDelete }: Props) {
  const statusColors = {
    active: 'text-green-400 bg-green-400/10',
    paused: 'text-yellow-400 bg-yellow-400/10',
    completed: 'text-gray-400 bg-gray-400/10',
  }

  return (
    <div className="group relative rounded-xl border border-navy bg-dark-navy p-5 transition-all hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5">
      <Link to={`/campaign/${campaign.id}`} className="absolute inset-0 rounded-xl" />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Sword className="h-4 w-4 text-gold" />
          <h3 className="font-bold text-parchment group-hover:text-gold transition-colors">
            {campaign.name}
          </h3>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[campaign.status]}`}>
          {campaign.status}
        </span>
      </div>

      {campaign.description && (
        <p className="mt-2 line-clamp-2 text-sm text-gray-500">{campaign.description}</p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-600">
          {campaign.character_name && (
            <span>{campaign.character_name} &middot; {campaign.character_class} Lvl {campaign.character_level}</span>
          )}
          {campaign.setting && <span>{campaign.setting}</span>}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Clock className="h-3 w-3" />
            {new Date(campaign.updated_at).toLocaleDateString()}
          </div>
          <button
            onClick={(e) => {
              e.preventDefault()
              onDelete(campaign.id)
            }}
            className="relative z-10 rounded p-1 text-gray-600 opacity-0 hover:bg-blood/20 hover:text-red-400 group-hover:opacity-100 transition-all"
            title="Delete campaign"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
