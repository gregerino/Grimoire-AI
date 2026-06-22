import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ScrollText } from 'lucide-react'
import { useCampaignStore } from '@/stores/campaignStore'
import { CampaignCard } from '@/components/campaign/CampaignCard'
import { CreateCampaignModal } from '@/components/campaign/CreateCampaignModal'
import { EditCampaignModal } from '@/components/campaign/EditCampaignModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import type { Campaign } from '@/types/database'

export function DashboardPage() {
  const navigate = useNavigate()
  const { campaigns, loading, fetchCampaigns, deleteCampaign } = useCampaignStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Campaign | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteCampaign(deleteTarget)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-parchment">Your Campaigns</h1>
          <p className="text-sm text-stone font-body">Choose your adventure or forge a new tale</p>
        </div>
        <Button onClick={() => setShowCreate(true)} icon={<Plus className="h-4 w-4" />}>
          New Campaign
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-navy py-20">
          <ScrollText className="mb-4 h-12 w-12 text-mist" />
          <p className="text-lg text-stone font-display">No campaigns yet</p>
          <p className="mb-6 text-sm text-mist font-body">Create your first campaign to begin</p>
          <Button variant="outline" onClick={() => setShowCreate(true)} icon={<Plus className="h-4 w-4" />}>
            New Campaign
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <CreateCampaignModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(id) => navigate(`/campaign/${id}`)}
      />

      {editTarget && (
        <EditCampaignModal
          open={!!editTarget}
          campaign={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Abandon Campaign"
        message="This campaign and all its data (sessions, NPCs, quests, inventory) will be permanently lost. This cannot be undone."
        confirmLabel="Abandon Forever"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
