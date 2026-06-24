import { Link } from 'react-router-dom'
import { Sword, Clock, Trash2, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Campaign } from '@/types/database'

interface Props {
  campaign: Campaign
  onEdit: (campaign: Campaign) => void
  onDelete: (id: string) => void
}

const statusVariant = {
  active: 'success' as const,
  paused: 'warning' as const,
  completed: 'default' as const,
}

export function CampaignCard({ campaign, onEdit, onDelete }: Props) {
  return (
    <Card hoverable padding="none" className="group relative">
      <Link to={`/campaign/${campaign.id}`} className="absolute inset-0 rounded-xl" aria-label={`Öppna kampanj: ${campaign.name}`} />

      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sword className="h-4 w-4 text-gold" aria-hidden="true" />
            <h3 className="font-display font-semibold text-parchment group-hover:text-gold transition-colors">
              {campaign.name}
            </h3>
          </div>
          <Badge variant={statusVariant[campaign.status]} size="sm" dot>
            {campaign.status}
          </Badge>
        </div>

        {campaign.description && (
          <p className="mt-2 line-clamp-2 text-sm text-stone font-body">{campaign.description}</p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-mist font-ui">
            {campaign.character_name && (
              <span>{campaign.character_name} &middot; {campaign.character_class} Lvl {campaign.character_level}</span>
            )}
            {campaign.setting && <span>{campaign.setting}</span>}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-mist font-ui">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {new Date(campaign.updated_at).toLocaleDateString()}
            </div>
            <button
              onClick={(e) => {
                e.preventDefault()
                onEdit(campaign)
              }}
              className="relative z-10 rounded-md p-1 text-mist opacity-0 hover:bg-navy hover:text-gold group-hover:opacity-100 transition-all focus-ring focus:opacity-100"
              aria-label={`Redigera ${campaign.name}`}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                onDelete(campaign.id)
              }}
              className="relative z-10 rounded-md p-1 text-mist opacity-0 hover:bg-blood/20 hover:text-blood-light group-hover:opacity-100 transition-all focus-ring focus:opacity-100"
              aria-label={`Radera ${campaign.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}
