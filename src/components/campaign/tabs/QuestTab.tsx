import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, X, CheckCircle, Circle, XCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Quest } from '@/types/database'

interface Props {
  campaignId: string
  refreshKey?: number
}

const statusIcons = {
  active: Circle,
  completed: CheckCircle,
  failed: XCircle,
  abandoned: AlertTriangle,
}

const statusColors = {
  active: 'text-blue-400',
  completed: 'text-green-400',
  failed: 'text-red-400',
  abandoned: 'text-gray-500',
}

const priorityBadge = {
  main: 'bg-gold/20 text-gold',
  side: 'bg-blue-400/20 text-blue-400',
  personal: 'bg-purple-400/20 text-purple-400',
}

export function QuestTab({ campaignId, refreshKey }: Props) {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', priority: 'side' as Quest['priority'] })

  const fetchQuests = useCallback(async () => {
    const { data } = await supabase
      .from('quests')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (data) setQuests(data as Quest[])
    setLoading(false)
  }, [campaignId])

  useEffect(() => { fetchQuests() }, [fetchQuests, refreshKey])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    await supabase.from('quests').insert({ ...form, campaign_id: campaignId })
    setForm({ title: '', description: '', priority: 'side' })
    setShowForm(false)
    fetchQuests()
  }

  const cycleStatus = async (quest: Quest) => {
    const order: Quest['status'][] = ['active', 'completed', 'failed', 'abandoned']
    const next = order[(order.indexOf(quest.status) + 1) % order.length]
    await supabase.from('quests').update({ status: next }).eq('id', quest.id)
    fetchQuests()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('quests').delete().eq('id', id)
    setQuests((prev) => prev.filter((q) => q.id !== id))
  }

  const inputClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/40 transition-colors'

  if (loading) return <div className="py-8 text-center text-sm text-gray-500">Loading...</div>

  const active = quests.filter((q) => q.status === 'active')
  const done = quests.filter((q) => q.status !== 'active')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">
          {active.length} active · {done.length} completed/failed
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 rounded-lg bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
        >
          {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showForm ? 'Cancel' : 'Add Quest'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-navy bg-dark-navy p-4">
          <input className={inputClass} placeholder="Quest title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <textarea className={inputClass + ' resize-none'} rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex items-center gap-4">
            <select className={inputClass + ' w-auto'} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Quest['priority'] })}>
              <option value="main">Main Quest</option>
              <option value="side">Side Quest</option>
              <option value="personal">Personal</option>
            </select>
            <button type="submit" className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-dark-navy hover:bg-gold-light transition-colors">Add</button>
          </div>
        </form>
      )}

      {quests.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-600">No quests yet.</p>
      ) : (
        <div className="space-y-2">
          {[...active, ...done].map((quest) => {
            const Icon = statusIcons[quest.status]
            return (
              <div key={quest.id} className={`rounded-xl border border-navy bg-dark-navy p-4 ${quest.status !== 'active' ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <button onClick={() => cycleStatus(quest)} className={`mt-0.5 ${statusColors[quest.status]}`} title="Cycle status">
                      <Icon className="h-4 w-4" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${quest.status === 'active' ? 'text-parchment' : 'text-gray-500 line-through'}`}>
                          {quest.title}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${priorityBadge[quest.priority]}`}>
                          {quest.priority}
                        </span>
                      </div>
                      {quest.description && (
                        <p className="mt-1 text-sm text-gray-400">{quest.description}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(quest.id)} className="rounded p-1.5 text-gray-500 hover:bg-navy hover:text-red-400 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
