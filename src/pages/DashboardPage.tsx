import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ScrollText } from 'lucide-react'
import { useCampaignStore } from '@/stores/campaignStore'
import { CampaignCard } from '@/components/campaign/CampaignCard'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { EditCampaignModal } from '@/components/campaign/EditCampaignModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonCampaignGrid } from '@/components/ui/Skeleton'
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
        <SkeletonCampaignGrid />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-12 w-12" />}
          title="Ingen saga har börjat ännu"
          description="Skapa din första kampanj och låt äventyret ta form."
          cta="Börja en ny kampanj"
          onAction={() => setShowCreate(true)}
        />
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

      {showCreate && (
        <OnboardingWizard
          onComplete={(id) => { setShowCreate(false); navigate(`/campaign/${id}`) }}
          onClose={() => setShowCreate(false)}
        />
      )}

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
