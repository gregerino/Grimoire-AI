import { useState, useMemo } from 'react'
import { Plus, Search, X, Skull, Heart, MapPin, MessageCircle } from 'lucide-react'
import Fuse from 'fuse.js'
import { supabase } from '@/lib/supabase'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { NpcDetailModal } from '@/components/campaign/NpcDetailModal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import type { Npc } from '@/types/database'

interface Props {
  campaignId: string
}

const dispositionConfig = {
  friendly: { dot: 'bg-green-400', variant: 'success' as const, label: 'Friendly' },
  neutral: { dot: 'bg-gray-400', variant: 'default' as const, label: 'Neutral' },
  hostile: { dot: 'bg-red-400', variant: 'blood' as const, label: 'Hostile' },
}

export function NpcTab({ campaignId }: Props) {
  const { rows: npcs, setRows: setNpcs, loading } = useRealtimeTable<Npc>({ table: 'npcs', campaignId })
  const [showForm, setShowForm] = useState(false)
  const [selectedNpc, setSelectedNpc] = useState<Npc | null>(null)
  const [search, setSearch] = useState('')
  const [filterDisposition, setFilterDisposition] = useState<Npc['disposition'] | 'all'>('all')
  const [form, setForm] = useState<{ name: string; description: string; race: string; occupation: string; disposition: Npc['disposition'] }>({ name: '', description: '', race: '', occupation: '', disposition: 'neutral' })

  const fuse = useMemo(
    () => new Fuse(npcs, { keys: ['name', 'race', 'occupation', 'location', 'description'], threshold: 0.3 }),
    [npcs],
  )

  const filtered = useMemo(() => {
    let result = search.trim() ? fuse.search(search).map((r) => r.item) : npcs
    if (filterDisposition !== 'all') {
      result = result.filter((n) => n.disposition === filterDisposition)
    }
    return result
  }, [npcs, search, filterDisposition, fuse])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    await supabase.from('npcs').insert({ ...form, campaign_id: campaignId })
    setForm({ name: '', description: '', race: '', occupation: '', disposition: 'neutral' })
    setShowForm(false)
  }

  const toggleAlive = async (e: React.MouseEvent, npc: Npc) => {
    e.stopPropagation()
    await supabase.from('npcs').update({ is_alive: !npc.is_alive }).eq('id', npc.id)
  }

  const inputClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/40 transition-colors'

  if (loading) return <SkeletonList rows={4} />

  return (
    <div className="space-y-4">
      {/* Header with search and filters */}
      <div className="flex flex-col gap-3">
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

        {npcs.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
              <input
                type="text"
                className={inputClass + ' pl-9'}
                placeholder="Search NPCs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="flex gap-1">
              {(['all', 'friendly', 'neutral', 'hostile'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setFilterDisposition(d)}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                    filterDisposition === d
                      ? 'bg-navy text-parchment'
                      : 'text-gray-600 hover:text-gray-400'
                  }`}
                >
                  {d === 'all' ? 'All' : d}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add form */}
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

      {/* NPC Cards */}
      {npcs.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="h-10 w-10" />}
          title="No NPCs Encountered"
          description="Characters you meet on your journey will appear here. Add them manually or let the DM create them during play."
          cta="Add First NPC"
          onAction={() => setShowForm(true)}
        />
      ) : filtered.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-600">No NPCs match your search.</p>
      ) : (
        <div className="@container grid grid-cols-1 gap-3 @min-[480px]:grid-cols-2">
          {filtered.map((npc) => (
            <NpcCard
              key={npc.id}
              npc={npc}
              onClick={() => setSelectedNpc(npc)}
              onToggleAlive={toggleAlive}
            />
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

function NpcCard({ npc, onClick, onToggleAlive }: { npc: Npc; onClick: () => void; onToggleAlive: (e: React.MouseEvent, npc: Npc) => void }) {
  const config = dispositionConfig[npc.disposition]

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer overflow-hidden rounded-xl border border-navy bg-dark-navy p-4 transition-all hover:border-gold/20 hover:shadow-card-hover ${!npc.is_alive ? 'opacity-50' : ''}`}
    >
      <div className="flex gap-3">
        {/* Portrait */}
        {npc.portrait_url ? (
          <img
            src={npc.portrait_url}
            alt={npc.name}
            className="h-20 w-20 shrink-0 rounded-lg object-cover border border-navy"
            loading="lazy"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-navy bg-midnight text-2xl font-display text-gold/30">
            {npc.name.charAt(0)}
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
            <span className="font-medium text-parchment truncate">{npc.name}</span>
            {!npc.is_alive && <span className="text-[10px] text-red-400">(dead)</span>}
          </div>

          <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
            {[npc.race, npc.occupation].filter(Boolean).join(' · ') || <span className="italic">Unknown</span>}
          </div>

          {npc.location && (
            <div className="mt-1 flex items-center gap-1 text-xs text-blue-400/70">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{npc.location}</span>
            </div>
          )}

          {npc.description && (
            <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 leading-relaxed italic">
              &ldquo;{npc.description}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Footer tags */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          <Badge variant={config.variant} size="sm" dot>{config.label}</Badge>
          {npc.relationship && (
            <Badge variant="mystic" size="sm">{npc.relationship}</Badge>
          )}
        </div>
        <button
          onClick={(e) => onToggleAlive(e, npc)}
          className="rounded p-1.5 text-gray-600 opacity-0 group-hover:opacity-100 hover:bg-navy transition-all"
          title={npc.is_alive ? 'Mark as dead' : 'Revive'}
        >
          {npc.is_alive ? <Skull className="h-3.5 w-3.5" /> : <Heart className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}
