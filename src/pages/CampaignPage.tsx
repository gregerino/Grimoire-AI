import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Play, ArrowLeft, User, Swords, ScrollText, Package, FileText } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { OverviewTab } from '@/components/campaign/tabs/OverviewTab'
import { NpcTab } from '@/components/campaign/tabs/NpcTab'
import { QuestTab } from '@/components/campaign/tabs/QuestTab'
import { InventoryTab } from '@/components/campaign/tabs/InventoryTab'
import { PdfLibrary } from '@/components/pdf/PdfLibrary'
import type { Campaign } from '@/types/database'

type Tab = 'overview' | 'npcs' | 'quests' | 'inventory' | 'library'

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <User className="h-4 w-4" /> },
  { id: 'npcs', label: 'NPCs', icon: <Swords className="h-4 w-4" /> },
  { id: 'quests', label: 'Quests', icon: <ScrollText className="h-4 w-4" /> },
  { id: 'inventory', label: 'Inventory', icon: <Package className="h-4 w-4" /> },
  { id: 'library', label: 'PDF Library', icon: <FileText className="h-4 w-4" /> },
]

export function CampaignPage() {
  const { id } = useParams()
  const user = useAuthStore((s) => s.user)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) setCampaign(data as Campaign)
        setLoading(false)
      })
  }, [id])

  if (!id || !user) return null
  if (loading) return <div className="flex h-64 items-center justify-center text-gray-500">Loading...</div>
  if (!campaign) return <div className="flex h-64 items-center justify-center text-gray-500">Campaign not found</div>

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gold transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to campaigns
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-parchment">{campaign.name}</h1>
          {campaign.character_name && (
            <p className="mt-1 text-sm text-gray-500">
              {campaign.character_name} · Level {campaign.character_level} {campaign.character_class}
            </p>
          )}
        </div>
        <Link
          to={`/campaign/${id}/play`}
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-medium text-dark-navy hover:bg-gold-light transition-colors"
        >
          <Play className="h-4 w-4" />
          Enter Session
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-navy bg-dark-navy/50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-navy text-gold'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-xl border border-navy bg-dark-navy p-6">
        {activeTab === 'overview' && <OverviewTab campaign={campaign} />}
        {activeTab === 'npcs' && <NpcTab campaignId={id} />}
        {activeTab === 'quests' && <QuestTab campaignId={id} />}
        {activeTab === 'inventory' && <InventoryTab campaignId={id} />}
        {activeTab === 'library' && <PdfLibrary campaignId={id} userId={user.id} />}
      </div>
    </div>
  )
}
