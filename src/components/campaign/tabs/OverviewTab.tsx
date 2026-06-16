import { Shield, Swords, MapPin, ScrollText } from 'lucide-react'
import type { Campaign } from '@/types/database'

interface Props {
  campaign: Campaign
}

export function OverviewTab({ campaign }: Props) {
  return (
    <div className="space-y-6">
      {/* Character card */}
      <div className="rounded-xl border border-navy bg-dark-navy p-5">
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-gold">Character</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            icon={<Shield className="h-4 w-4 text-gold" />}
            label="Name"
            value={campaign.character_name || '—'}
          />
          <Stat
            icon={<Swords className="h-4 w-4 text-gold" />}
            label="Class"
            value={campaign.character_class || '—'}
          />
          <Stat
            icon={<ScrollText className="h-4 w-4 text-gold" />}
            label="Level"
            value={String(campaign.character_level)}
          />
          <Stat
            icon={<MapPin className="h-4 w-4 text-gold" />}
            label="Setting"
            value={campaign.setting || '—'}
          />
        </div>
      </div>

      {/* Description */}
      {campaign.description && (
        <div className="rounded-xl border border-navy bg-dark-navy p-5">
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wider text-gold">
            Description
          </h3>
          <p className="text-sm leading-relaxed text-gray-400">{campaign.description}</p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-navy bg-dark-navy p-4 text-center">
          <div className="text-2xl font-bold text-parchment">{campaign.character_level}</div>
          <div className="text-xs text-gray-500">Level</div>
        </div>
        <div className="rounded-xl border border-navy bg-dark-navy p-4 text-center">
          <div className="text-2xl font-bold text-parchment capitalize">{campaign.status}</div>
          <div className="text-xs text-gray-500">Status</div>
        </div>
        <div className="rounded-xl border border-navy bg-dark-navy p-4 text-center">
          <div className="text-2xl font-bold text-parchment">
            {new Date(campaign.created_at).toLocaleDateString()}
          </div>
          <div className="text-xs text-gray-500">Started</div>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm font-medium text-parchment">{value}</div>
      </div>
    </div>
  )
}
