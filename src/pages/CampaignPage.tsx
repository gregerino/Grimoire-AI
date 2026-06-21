import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Play, ArrowLeft, User, Swords, ScrollText, Package, FileText, Pencil, Trash2, BookOpen, Brain, Shield, StickyNote } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useCampaignStore } from '@/stores/campaignStore'
import { supabase } from '@/lib/supabase'
import { OverviewTab } from '@/components/campaign/tabs/OverviewTab'
import { NpcTab } from '@/components/campaign/tabs/NpcTab'
import { QuestTab } from '@/components/campaign/tabs/QuestTab'
import { InventoryTab } from '@/components/campaign/tabs/InventoryTab'
import { PdfLibrary } from '@/components/pdf/PdfLibrary'
import { MemoryTab } from '@/components/campaign/tabs/MemoryTab'
import { NotesTab } from '@/components/campaign/tabs/NotesTab'
import { CharacterPanel } from '@/components/character/CharacterPanel'
import { EditCampaignModal } from '@/components/campaign/EditCampaignModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SessionHistory } from '@/components/session/SessionHistory'
import { SessionReader } from '@/components/session/SessionReader'
import { listSessions } from '@/lib/api'
import type { Campaign, Session } from '@/types/database'

type Tab = 'overview' | 'character' | 'npcs' | 'quests' | 'inventory' | 'library' | 'sessions' | 'memory' | 'notes'

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <User className="h-4 w-4" /> },
  { id: 'character', label: 'Character', icon: <Shield className="h-4 w-4" /> },
  { id: 'sessions', label: 'Sessions', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'npcs', label: 'NPCs', icon: <Swords className="h-4 w-4" /> },
  { id: 'quests', label: 'Quests', icon: <ScrollText className="h-4 w-4" /> },
  { id: 'inventory', label: 'Inventory', icon: <Package className="h-4 w-4" /> },
  { id: 'notes', label: 'Notes', icon: <StickyNote className="h-4 w-4" /> },
  { id: 'memory', label: 'DM Memory', icon: <Brain className="h-4 w-4" /> },
  { id: 'library', label: 'PDF Library', icon: <FileText className="h-4 w-4" /> },
]

export function CampaignPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { deleteCampaign } = useCampaignStore()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [readingSession, setReadingSession] = useState<Session | null>(null)

  const fetchSessions = useCallback(async () => {
    if (!id) return
    const { sessions: data } = await listSessions(id)
    setSessions(data)
  }, [id])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

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

  const handleDelete = async () => {
    if (!id) return
    await deleteCampaign(id)
    navigate('/dashboard')
  }

  if (!id || !user) return null
  if (loading) return <div className="flex h-64 items-center justify-center text-gray-500">Loading...</div>
  if (!campaign) return <div className="flex h-64 items-center justify-center text-gray-500">Campaign not found</div>

  const statusColors = {
    active: 'text-green-400 bg-green-400/10',
    paused: 'text-yellow-400 bg-yellow-400/10',
    completed: 'text-gray-400 bg-gray-400/10',
  }

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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-parchment">{campaign.name}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[campaign.status]}`}>
              {campaign.status}
            </span>
          </div>
          {campaign.character_name && (
            <p className="mt-1 text-sm text-gray-500">
              {campaign.character_name} · Level {campaign.character_level} {campaign.character_class}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-navy hover:text-gold transition-colors"
            title="Edit campaign"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-blood/20 hover:text-red-400 transition-colors"
            title="Delete campaign"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <Link
            to={`/campaign/${id}/play`}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-medium text-dark-navy hover:bg-gold-light transition-colors"
          >
            <Play className="h-4 w-4" />
            Enter Session
          </Link>
        </div>
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
        {activeTab === 'character' && <CharacterPanel campaignId={id} />}
        {activeTab === 'npcs' && <NpcTab campaignId={id} />}
        {activeTab === 'quests' && <QuestTab campaignId={id} />}
        {activeTab === 'inventory' && <InventoryTab campaignId={id} />}
        {activeTab === 'sessions' && (
          <SessionHistory
            sessions={sessions}
            onLoadSession={() => navigate(`/campaign/${id}/play`)}
            onReadSession={(s) => setReadingSession(s)}
          />
        )}
        {activeTab === 'notes' && <NotesTab campaignId={id} />}
        {activeTab === 'memory' && <MemoryTab campaignId={id} />}
        {activeTab === 'library' && <PdfLibrary campaignId={id} userId={user.id} />}
      </div>

      {readingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-navy bg-dark-navy">
            <SessionReader
              session={readingSession}
              onClose={() => setReadingSession(null)}
            />
          </div>
        </div>
      )}

      <EditCampaignModal
        open={showEdit}
        campaign={campaign}
        onClose={() => setShowEdit(false)}
        onUpdated={setCampaign}
      />

      <ConfirmDialog
        open={showDelete}
        title="Abandon Campaign"
        message="This campaign and all its data (sessions, NPCs, quests, inventory) will be permanently lost. This cannot be undone."
        confirmLabel="Abandon Forever"
        danger
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  )
}
