import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ScrollText } from 'lucide-react'
import { useCampaignStore } from '@/stores/campaignStore'
import { CampaignCard } from '@/components/campaign/CampaignCard'
import { CreateCampaignModal } from '@/components/campaign/CreateCampaignModal'

export function DashboardPage() {
  const navigate = useNavigate()
  const { campaigns, loading, fetchCampaigns, deleteCampaign } = useCampaignStore()
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const handleDelete = async (id: string) => {
    if (window.confirm('Abandon this campaign forever?')) {
      await deleteCampaign(id)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-parchment">Your Campaigns</h1>
          <p className="text-sm text-gray-500">Choose your adventure or forge a new tale</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-dark-navy hover:bg-gold-light transition-colors active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-navy py-20">
          <ScrollText className="mb-4 h-12 w-12 text-gray-700" />
          <p className="text-lg text-gray-500">No campaigns yet</p>
          <p className="mb-6 text-sm text-gray-600">Create your first campaign to begin</p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-gold/10 px-4 py-2 text-sm font-medium text-gold ring-1 ring-gold/20 hover:bg-gold/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CreateCampaignModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(id) => navigate(`/campaign/${id}`)}
      />
    </div>
  )
}
