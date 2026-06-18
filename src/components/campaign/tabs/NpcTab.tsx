import { useState } from 'react'
import { Plus, Trash2, Skull, Heart, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { NpcDetailModal } from '@/components/campaign/NpcDetailModal'
import type { Npc } from '@/types/database'

interface Props {
  campaignId: string
}

const dispositionColors = {
  friendly: 'text-green-400',
  neutral: 'text-gray-400',
  hostile: 'text-red-400',
}

export function NpcTab({ campaignId }: Props) {
  const { rows: npcs, setRows: setNpcs, loading } = useRealtimeTable<Npc>({ table: 'npcs', campaignId })
  const [showForm, setShowForm] = useState(false)
  const [selectedNpc, setSelectedNpc] = useState<Npc | null>(null)
  const [form, setForm] = useState({ name: '', description: '', race: '', occupation: '', disposition: 'neutral' as const })

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    await supabase.from('npcs').insert({ ...form, campaign_id: campaignId })
    setForm({ name: '', description: '', race: '', occupation: '', disposition: 'neutral' })
    setShowForm(false)
  }

  const toggleAlive = async (npc: Npc) => {
    await supabase.from('npcs').update({ is_alive: !npc.is_alive }).eq('id', npc.id)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('npcs').delete().eq('id', id)
  }

  const inputClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/40 transition-colors'

  if (loading) return <div className="py-8 text-center text-sm text-gray-500">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{npcs.length} NPCs</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 rounded-lg bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
        >
          {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showForm ? 'Cancel' : 'Add NPC'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-navy bg-dark-navy p-4">
          <input className={inputClass} placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Race" value={form.race} onChange={(e) => setForm({ ...form, race: e.target.value })} />
            <input className={inputClass} placeholder="Occupation" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
          </div>
          <textarea className={inputClass + ' resize-none'} rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex items-center gap-4">
            <select className={inputClass + ' w-auto'} value={form.disposition} onChange={(e) => setForm({ ...form, disposition: e.target.value as Npc['disposition'] })}>
              <option value="friendly">Friendly</option>
              <option value="neutral">Neutral</option>
              <option value="hostile">Hostile</option>
            </select>
            <button type="submit" className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-dark-navy hover:bg-gold-light transition-colors">Add</button>
          </div>
        </form>
      )}

      {npcs.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-600">No NPCs encountered yet.</p>
      ) : (
        <div className="space-y-2">
          {npcs.map((npc) => (
            <div
              key={npc.id}
              className={`cursor-pointer rounded-xl border border-navy bg-dark-navy p-4 transition-all hover:border-gold/20 ${!npc.is_alive ? 'opacity-50' : ''}`}
              onClick={() => setSelectedNpc(npc)}
            >
              <div className="flex items-start gap-3">
                {npc.portrait_url && (
                  <img
                    src={npc.portrait_url}
                    alt={npc.name}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover border border-navy"
                    loading="lazy"
                  />
                )}
                <div className="flex flex-1 items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-parchment">{npc.name}</span>
                    <span className={`text-xs ${dispositionColors[npc.disposition]}`}>
                      {npc.disposition}
                    </span>
                    {!npc.is_alive && <span className="text-xs text-red-400">(dead)</span>}
                  </div>
                  {(npc.race || npc.occupation) && (
                    <div className="mt-0.5 text-xs text-gray-500">
                      {[npc.race, npc.occupation].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {npc.description && (
                    <p className="mt-1 text-sm text-gray-400 line-clamp-2">{npc.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => toggleAlive(npc)} className="rounded p-1.5 text-gray-500 hover:bg-navy transition-colors" title={npc.is_alive ? 'Mark as dead' : 'Revive'}>
                    {npc.is_alive ? <Skull className="h-3.5 w-3.5" /> : <Heart className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => handleDelete(npc.id)} className="rounded p-1.5 text-gray-500 hover:bg-navy hover:text-red-400 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedNpc && (
        <NpcDetailModal
          npc={selectedNpc}
          open={!!selectedNpc}
          onClose={() => setSelectedNpc(null)}
          onUpdated={(updated) => {
            setSelectedNpc(updated)
            setNpcs((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
          }}
        />
      )}
    </div>
  )
}
