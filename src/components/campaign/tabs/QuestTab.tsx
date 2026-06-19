import { useState } from 'react'
import {
  Plus, Trash2, X, CheckCircle, Circle, XCircle,
  MessageCircle, ChevronDown, ChevronRight, MapPin, User,
  Award, Coins, Star,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import type { Quest } from '@/types/database'

interface Props {
  campaignId: string
}

const statusConfig = {
  rumor: { icon: MessageCircle, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', label: 'Rumor' },
  active: { icon: Circle, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', label: 'Active' },
  completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', label: 'Failed' },
}

const priorityBadge = {
  main: 'bg-gold/20 text-gold',
  side: 'bg-blue-400/20 text-blue-400',
  personal: 'bg-purple-400/20 text-purple-400',
}

export function QuestTab({ campaignId }: Props) {
  const { rows: quests, loading } = useRealtimeTable<Quest>({ table: 'quests', campaignId })
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
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
    await supabase.from('quests').update(patch).eq('id', quest.id)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('quests').delete().eq('id', id)
  }

  const inputClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/40 transition-colors'

  if (loading) return <div className="py-8 text-center text-sm text-gray-500">Loading...</div>

  const rumors = quests.filter((q) => q.status === 'rumor')
  const active = quests.filter((q) => q.status === 'active')
  const done = quests.filter((q) => q.status === 'completed' || q.status === 'failed')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">
          {rumors.length} rumors · {active.length} active · {done.length} done
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 rounded-lg bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
        >
          {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showForm ? 'Cancel' : 'Add'}
        </button>
      </div>

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

      {quests.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-600">No quests yet. Rumors will appear as NPCs share whispers and secrets.</p>
      ) : (
        <div className="space-y-3">
          <QuestSection title="Rumors" quests={rumors} expandedId={expandedId} onToggle={setExpandedId} onSetStatus={setStatus} onDelete={handleDelete} />
          <QuestSection title="Active Quests" quests={active} expandedId={expandedId} onToggle={setExpandedId} onSetStatus={setStatus} onDelete={handleDelete} />
          {done.length > 0 && (
            <QuestSection title="Completed / Failed" quests={done} expandedId={expandedId} onToggle={setExpandedId} onSetStatus={setStatus} onDelete={handleDelete} />
          )}
        </div>
      )}
    </div>
  )
}

function QuestSection({
  title,
  quests,
  expandedId,
  onToggle,
  onSetStatus,
  onDelete,
}: {
  title: string
  quests: Quest[]
  expandedId: string | null
  onToggle: (id: string | null) => void
  onSetStatus: (q: Quest, s: Quest['status']) => void
  onDelete: (id: string) => void
}) {
  if (quests.length === 0) return null

  return (
    <div>
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">{title}</h4>
      <div className="space-y-2">
        {quests.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            expanded={expandedId === quest.id}
            onToggle={() => onToggle(expandedId === quest.id ? null : quest.id)}
            onSetStatus={onSetStatus}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}

function QuestCard({
  quest,
  expanded,
  onToggle,
  onSetStatus,
  onDelete,
}: {
  quest: Quest
  expanded: boolean
  onToggle: () => void
  onSetStatus: (q: Quest, s: Quest['status']) => void
  onDelete: (id: string) => void
}) {
  const config = statusConfig[quest.status]
  const Icon = config.icon
  const isDone = quest.status === 'completed' || quest.status === 'failed'

  return (
    <div className={`rounded-xl border ${config.bg} ${isDone ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between p-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <button onClick={onToggle} className="mt-0.5 text-gray-500 hover:text-parchment">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.color}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium text-sm ${isDone ? 'text-gray-500 line-through' : 'text-parchment'}`}>
                {quest.title}
              </span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${priorityBadge[quest.priority]}`}>
                {quest.priority}
              </span>
            </div>
            {quest.description && !expanded && (
              <p className="mt-0.5 text-xs text-gray-500 truncate">{quest.description}</p>
            )}
          </div>
        </div>
        <button onClick={() => onDelete(quest.id)} className="rounded p-1 text-gray-600 hover:text-red-400 transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-navy/50 px-4 pb-3 pt-2 space-y-3">
          {quest.description && (
            <p className="text-sm text-gray-400 leading-relaxed">{quest.description}</p>
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

          {quest.updates && quest.updates.length > 0 && (
            <div className="space-y-1.5">
              <h5 className="text-xs font-medium text-gray-500">Quest Log</h5>
              <div className="space-y-1 border-l-2 border-navy pl-3">
                {quest.updates.map((u, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-gray-600">{new Date(u.timestamp).toLocaleDateString()}</span>
                    <span className="ml-2 text-gray-400">{u.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
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

