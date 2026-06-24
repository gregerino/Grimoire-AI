import { useState } from 'react'
import {
  Plus, Trash2, X, CheckCircle, Circle, XCircle,
  MessageCircle, ChevronDown, ChevronRight, MapPin, User,
  Award, Coins, Star, Filter,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import type { Quest } from '@/types/database'

interface Props {
  campaignId: string
}

const statusConfig = {
  rumor: { icon: MessageCircle, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', label: 'Rumor', accent: 'border-l-amber-400' },
  active: { icon: Circle, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', label: 'Active', accent: 'border-l-blue-400' },
  completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', label: 'Completed', accent: 'border-l-green-400' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', label: 'Failed', accent: 'border-l-red-400' },
}

const priorityBadge = {
  main: { variant: 'gold' as const, label: 'Main' },
  side: { variant: 'default' as const, label: 'Side' },
  personal: { variant: 'mystic' as const, label: 'Personal' },
}

type StatusFilter = Quest['status'] | 'all'

export function QuestTab({ campaignId }: Props) {
  const { rows: quests, setRows, loading } = useRealtimeTable<Quest>({ table: 'quests', campaignId })
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'side' as Quest['priority'],
    status: 'rumor' as Quest['status'],
  })

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    await supabase.from('quests').insert({
      ...form,
      campaign_id: campaignId,
      updates: [],
    })
    setForm({ title: '', description: '', priority: 'side', status: 'rumor' })
    setShowForm(false)
  }

  const setStatus = async (quest: Quest, status: Quest['status']) => {
    const patch: Record<string, unknown> = { status }
    const prevUpdates = quest.updates || []
    patch.updates = [
      ...prevUpdates,
      { timestamp: new Date().toISOString(), text: `Status changed to ${status}` },
    ]
    if (status === 'completed' || status === 'failed') {
      patch.completed_at = new Date().toISOString()
    }
    setRows((prev) => prev.map((q) => (q.id === quest.id ? { ...q, ...patch } as Quest : q)))
    await supabase.from('quests').update(patch).eq('id', quest.id)
  }

  const setPriority = async (quest: Quest, priority: Quest['priority']) => {
    setRows((prev) => prev.map((q) => (q.id === quest.id ? { ...q, priority } : q)))
    await supabase.from('quests').update({ priority }).eq('id', quest.id)
  }

  const handleDelete = async (id: string) => {
    setRows((prev) => prev.filter((q) => q.id !== id))
    await supabase.from('quests').delete().eq('id', id)
  }

  const inputClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/40 transition-colors'

  if (loading) return <SkeletonList rows={4} />

  const rumors = quests.filter((q) => q.status === 'rumor')
  const active = quests.filter((q) => q.status === 'active')
  const completed = quests.filter((q) => q.status === 'completed')
  const failed = quests.filter((q) => q.status === 'failed')

  const sections = [
    { key: 'active', title: 'Active Quests', quests: active, icon: Circle },
    { key: 'rumor', title: 'Rumors & Whispers', quests: rumors, icon: MessageCircle },
    { key: 'completed', title: 'Completed', quests: completed, icon: CheckCircle },
    { key: 'failed', title: 'Failed', quests: failed, icon: XCircle },
  ].filter((s) => statusFilter === 'all' || s.key === statusFilter)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-500">
            {active.length} active · {rumors.length} rumors
          </h3>
          {quests.length > 0 && (
            <div className="flex items-center gap-1">
              <Filter className="h-3 w-3 text-gray-600" />
              {(['all', 'active', 'rumor', 'completed', 'failed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                    statusFilter === s ? 'bg-navy text-parchment' : 'text-gray-600 hover:text-gray-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 rounded-lg bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
        >
          {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showForm ? 'Cancel' : 'Add'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-navy bg-dark-navy p-4">
          <input className={inputClass} placeholder="Quest title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <textarea className={inputClass + ' resize-none'} rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex items-center gap-3">
            <select className={inputClass + ' w-auto'} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Quest['status'] })}>
              <option value="rumor">Rumor</option>
              <option value="active">Active</option>
            </select>
            <select className={inputClass + ' w-auto'} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Quest['priority'] })}>
              <option value="main">Main</option>
              <option value="side">Side</option>
              <option value="personal">Personal</option>
            </select>
            <button type="submit" className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-dark-navy hover:bg-gold-light transition-colors">Add</button>
          </div>
        </form>
      )}

      {/* Quest sections */}
      {quests.length === 0 ? (
        <EmptyState
          icon={<ScrollIcon className="h-10 w-10" />}
          title="No Quests Yet"
          description="Rumors will appear as NPCs share whispers and secrets. You can also add quests manually."
          cta="Add First Quest"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-6">
          {sections.map(({ key, title, quests: sectionQuests, icon: SectionIcon }) => {
            if (sectionQuests.length === 0) return null
            return (
              <div key={key}>
                <div className="mb-2.5 flex items-center gap-2">
                  <SectionIcon className={`h-3.5 w-3.5 ${statusConfig[key as Quest['status']]?.color ?? 'text-gray-500'}`} />
                  <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500">{title}</h4>
                  <span className="text-[10px] text-gray-600">({sectionQuests.length})</span>
                </div>
                <div className="space-y-2">
                  {sectionQuests.map((quest) => (
                    <QuestCard
                      key={quest.id}
                      quest={quest}
                      expanded={expandedId === quest.id}
                      onToggle={() => setExpandedId(expandedId === quest.id ? null : quest.id)}
                      onSetStatus={setStatus}
                      onSetPriority={setPriority}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ScrollIcon({ className }: { className?: string }) {
  return <MessageCircle className={className} />
}

function QuestCard({
  quest,
  expanded,
  onToggle,
  onSetStatus,
  onSetPriority,
  onDelete,
}: {
  quest: Quest
  expanded: boolean
  onToggle: () => void
  onSetStatus: (q: Quest, s: Quest['status']) => void
  onSetPriority: (q: Quest, p: Quest['priority']) => void
  onDelete: (id: string) => void
}) {
  const config = statusConfig[quest.status]
  const Icon = config.icon
  const isDone = quest.status === 'completed' || quest.status === 'failed'
  const pBadge = priorityBadge[quest.priority]

  return (
    <div className={`rounded-xl border border-l-4 ${config.bg} ${config.accent} ${isDone ? 'opacity-60' : ''} transition-all`}>
      <div className="flex items-start justify-between p-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <button onClick={onToggle} className="mt-0.5 text-gray-500 hover:text-parchment transition-colors focus-ring" aria-label={expanded ? 'Dölj detaljer' : 'Visa detaljer'} aria-expanded={expanded}>
            {expanded ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.color}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium text-sm ${isDone ? 'text-gray-500 line-through' : 'text-parchment'}`}>
                {quest.title}
              </span>
              <Badge variant={pBadge.variant} size="sm">{pBadge.label}</Badge>
            </div>
            {quest.description && !expanded && (
              <p className={`mt-0.5 text-xs truncate ${quest.status === 'rumor' ? 'text-gray-500 italic' : 'text-gray-500'}`}>
                {quest.status === 'rumor' ? `"${quest.description}"` : quest.description}
              </p>
            )}
          </div>
        </div>
        <button onClick={() => onDelete(quest.id)} className="rounded p-1 text-gray-600 hover:text-red-400 transition-colors focus-ring" aria-label={`Radera uppdrag: ${quest.title}`}>
          <Trash2 className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-navy/50 px-4 pb-3 pt-2 space-y-3">
          {quest.description && (
            <p className={`text-sm leading-relaxed ${quest.status === 'rumor' ? 'text-gray-400 italic' : 'text-gray-400'}`}>
              {quest.status === 'rumor' ? `"${quest.description}"` : quest.description}
            </p>
          )}

          {quest.reward && (
            <div className="flex flex-wrap gap-2">
              {quest.reward.gp != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-xs text-gold">
                  <Coins className="h-3 w-3" /> {quest.reward.gp} gp
                </span>
              )}
              {quest.reward.items?.map((item) => (
                <span key={item} className="inline-flex items-center gap-1 rounded-full bg-purple-400/10 px-2 py-0.5 text-xs text-purple-300">
                  <Award className="h-3 w-3" /> {item}
                </span>
              ))}
              {quest.reward.narrative && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-400/10 px-2 py-0.5 text-xs text-green-300">
                  <Star className="h-3 w-3" /> {quest.reward.narrative}
                </span>
              )}
            </div>
          )}

          {quest.source_npc_id && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <User className="h-3 w-3" /> Source NPC linked
            </div>
          )}
          {quest.target_location_id && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="h-3 w-3" /> Target location linked
            </div>
          )}

          {/* Quest timeline */}
          {quest.updates && quest.updates.length > 0 && (
            <div className="space-y-1.5">
              <h5 className="text-xs font-medium text-gray-500">Quest Log</h5>
              <div className="relative space-y-2 pl-4">
                <div className="absolute left-[5px] top-1 bottom-1 w-px bg-navy" />
                {quest.updates.map((u, i) => (
                  <div key={i} className="relative text-xs">
                    <div className="absolute -left-[11px] top-1.5 h-2 w-2 rounded-full bg-navy border border-gray-600" />
                    <span className="text-gray-600">{new Date(u.timestamp).toLocaleDateString()}</span>
                    <span className="ml-2 text-gray-400">{u.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <select
              value={quest.priority}
              onChange={(e) => onSetPriority(quest, e.target.value as Quest['priority'])}
              className="rounded-lg border border-navy bg-midnight px-2 py-1 text-xs text-parchment outline-none focus:border-gold/40 transition-colors"
            >
              <option value="main">Main</option>
              <option value="side">Side</option>
              <option value="personal">Personal</option>
            </select>
            {quest.status === 'rumor' && (
              <button
                onClick={() => onSetStatus(quest, 'active')}
                className="rounded-lg bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                Accept Quest
              </button>
            )}
            {quest.status === 'active' && (
              <>
                <button
                  onClick={() => onSetStatus(quest, 'completed')}
                  className="rounded-lg bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400 hover:bg-green-500/30 transition-colors"
                >
                  Complete
                </button>
                <button
                  onClick={() => onSetStatus(quest, 'failed')}
                  className="rounded-lg bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  Failed
                </button>
              </>
            )}
            {isDone && (
              <button
                onClick={() => onSetStatus(quest, 'active')}
                className="rounded-lg bg-gray-500/20 px-3 py-1 text-xs font-medium text-gray-400 hover:bg-gray-500/30 transition-colors"
              >
                Reopen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
