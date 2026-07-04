import { useState } from 'react'
import { Plus, X, Trash2, Heart, Shield, Swords, Search, Wand2, ArrowUpCircle, UserX, UserCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { createSidekick, levelUpSidekick } from '@/lib/api'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import type { Sidekick, SidekickKit, SidekickStats } from '@/types/database'

interface Props {
  campaignId: string
  partyLevel?: number
}

const kitConfig: Record<SidekickKit, { label: string; icon: typeof Swords }> = {
  warrior: { label: 'Warrior', icon: Swords },
  expert: { label: 'Expert', icon: Search },
  spellcaster: { label: 'Spellcaster', icon: Wand2 },
}

const STAT_KEYS: (keyof SidekickStats)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

const emptyForm = {
  name: '',
  kit: 'warrior' as SidekickKit,
  level: 1,
  stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } as SidekickStats,
}

export function SidekickTab({ campaignId, partyLevel = 1 }: Props) {
  const { rows: sidekicks, loading } = useRealtimeTable<Sidekick>({ table: 'sidekicks', campaignId })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm, level: partyLevel })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/40 transition-colors'

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await createSidekick({ campaign_id: campaignId, name: form.name, kit: form.kit, level: form.level, stats: form.stats })
      setForm({ ...emptyForm, level: partyLevel })
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sidekick')
    }
    setSaving(false)
  }

  const toggleActive = async (sidekick: Sidekick) => {
    await supabase.from('sidekicks').update({ is_active: !sidekick.is_active }).eq('id', sidekick.id)
  }

  const deleteSidekick = async (sidekick: Sidekick) => {
    if (!confirm(`Delete ${sidekick.name}? This cannot be undone.`)) return
    await supabase.from('sidekicks').delete().eq('id', sidekick.id)
  }

  const handleLevelUp = async (sidekick: Sidekick) => {
    try {
      await levelUpSidekick(sidekick.id, sidekick.level + 1)
    } catch {
      // best-effort — realtime row simply won't update
    }
  }

  if (loading) return <SkeletonList rows={3} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{sidekicks.length} Sidekicks</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 rounded-lg bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
        >
          {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showForm ? 'Cancel' : 'Add Sidekick'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-navy bg-dark-navy p-4">
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <select className={inputClass} value={form.kit} onChange={(e) => setForm({ ...form, kit: e.target.value as SidekickKit })}>
              {(Object.keys(kitConfig) as SidekickKit[]).map((k) => (
                <option key={k} value={k}>{kitConfig[k].label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500">Level</label>
            <input
              type="number"
              min={1}
              max={20}
              className={inputClass + ' w-24'}
              value={form.level}
              onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500">Ability Scores</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {STAT_KEYS.map((stat) => (
                <div key={stat}>
                  <label className="mb-0.5 block text-center text-[9px] uppercase text-gray-600">{stat}</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    className={inputClass + ' text-center'}
                    value={form.stats[stat]}
                    onChange={(e) => setForm({ ...form, stats: { ...form.stats, [stat]: Number(e.target.value) } })}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button type="submit" disabled={saving} className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-dark-navy hover:bg-gold-light transition-colors disabled:opacity-50">
            {saving ? 'Adding...' : 'Add'}
          </button>
        </form>
      )}

      {sidekicks.length === 0 ? (
        <EmptyState
          icon={<Swords className="h-10 w-10" />}
          title="No Sidekicks"
          description="Companions built with Tasha's Cauldron of Everything sidekick rules will appear here."
          cta="Add First Sidekick"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="@container grid grid-cols-1 gap-3 @min-[480px]:grid-cols-2">
          {sidekicks.map((sidekick) => (
            <SidekickCard
              key={sidekick.id}
              sidekick={sidekick}
              onToggleActive={toggleActive}
              onDelete={deleteSidekick}
              onLevelUp={handleLevelUp}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SidekickCard({
  sidekick,
  onToggleActive,
  onDelete,
  onLevelUp,
}: {
  sidekick: Sidekick
  onToggleActive: (s: Sidekick) => void
  onDelete: (s: Sidekick) => void
  onLevelUp: (s: Sidekick) => void
}) {
  const { label, icon: KitIcon } = kitConfig[sidekick.kit]
  const hpPercent = sidekick.max_hp > 0 ? Math.max(0, Math.min(100, (sidekick.current_hp / sidekick.max_hp) * 100)) : 0
  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className={`group rounded-xl border border-navy bg-dark-navy p-4 transition-all hover:border-gold/20 hover:shadow-card-hover ${!sidekick.is_active ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <KitIcon className="h-4 w-4 shrink-0 text-gold/70" />
          <span className="font-medium text-parchment truncate">{sidekick.name}</span>
          {!sidekick.is_active && <span className="shrink-0 text-[10px] text-gray-500">(dismissed)</span>}
        </div>
        <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onLevelUp(sidekick)} className="rounded p-1.5 text-gray-600 hover:bg-navy hover:text-gold" title="Level up">
            <ArrowUpCircle className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onToggleActive(sidekick)} className="rounded p-1.5 text-gray-600 hover:bg-navy" title={sidekick.is_active ? 'Dismiss' : 'Recall'}>
            {sidekick.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => onDelete(sidekick)} className="rounded p-1.5 text-red-500/60 hover:bg-red-500/10 hover:text-red-400" title="Delete sidekick">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-0.5 text-xs text-gray-500">
        Level {sidekick.level} {label} · PB +{sidekick.proficiency_bonus}
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Heart className="h-3 w-3 text-red-400" />
            <span className="text-[10px] uppercase tracking-wider text-gray-500">HP</span>
          </div>
          <span className="text-xs font-bold text-parchment">{sidekick.current_hp}/{sidekick.max_hp}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-navy">
          <div className={`h-full rounded-full transition-all duration-500 ${hpColor}`} style={{ width: `${hpPercent}%` }} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
        <Shield className="h-3 w-3 text-blue-400" />
        AC {sidekick.ac}
      </div>
    </div>
  )
}
