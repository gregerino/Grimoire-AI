import { useParams, Link } from 'react-router-dom'
import { Play, ArrowLeft } from 'lucide-react'

export function CampaignPage() {
  const { id } = useParams()

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gold transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to campaigns
      </Link>

      <div className="rounded-xl border border-navy bg-dark-navy p-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-parchment">Campaign Overview</h1>
        <p className="mb-6 text-sm text-gray-500">
          Campaign details, NPCs, quests, and inventory will appear here in Sprint 2.
        </p>
        <Link
          to={`/campaign/${id}/play`}
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-medium text-dark-navy hover:bg-gold-light transition-colors"
        >
          <Play className="h-4 w-4" />
          Enter Session
        </Link>
      </div>
    </div>
  )
}
