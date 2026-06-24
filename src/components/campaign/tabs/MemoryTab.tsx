import { useState } from 'react'
import {
  Plus, Trash2, X, Edit3, Check, Brain,
  BookOpen, Users, Globe, User, Gem,
  ChevronDown, ChevronRight, Sparkles,
} from 'lucide-react'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { supabase } from '@/lib/supabase'
import { SkeletonList } from '@/components/ui/Skeleton'
import type { MemoryEntry, MemoryCategory, MemoryImportance } from '@/types/database'

interface Props {
  campaignId: string
}

const categoryConfig: Record<MemoryCategory, { icon: typeof Brain; label: string; color: string }> = {
  plot: { icon: BookOpen, label: 'Plot', color: 'text-gold' },
  npc: { icon: Users, label: 'NPC', color: 'text-blue-400' },
  world: { icon: Globe, label: 'World', color: 'text-green-400' },
  character: { icon: User, label: 'Character', color: 'text-purple-400' },
  item: { icon: Gem, label: 'Item', color: 'text-amber-400' },
}

const importanceDot: Record<MemoryImportance, string> = {
  high: 'bg-red-400',
  medium: 'bg-yellow-400',
  low: 'bg-gray-500',
}

const categories: MemoryCategory[] = ['plot', 'npc', 'world', 'character', 'item']

export function MemoryTab({ campaignId }: Props) {
  const { rows: memories, loading } = useRealtimeTable<MemoryEntry>({ table: 'campaign_memories', campaignId })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [filterCategory, setFilterCategory] = useState<MemoryCategory | 'all'>('all')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    content: '',
    category: 'plot' as MemoryCategory,
    importance: 'medium' as MemoryImportance,
  })

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.content.trim()) return
    await supabase.from('campaign_memories').insert({
      campaign_id: campaignId,
      content: form.content,
      category: form.category,
      importance: form.importance,
      source: 'user',
    })
    setForm({ content: '', category: 'plot', importance: 'medium' })
    setShowForm(false)
  }

  const handleEdit = async (id: string) => {
    if (!editContent.trim()) return
    await supabase.from('campaign_memories').update({ content: editContent }).eq('id', id)
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('campaign_memories').delete().eq('id', id)
  }

  const handleImportanceChange = async (id: string, importance: MemoryImportance) => {
    await supabase.from('campaign_memories').update({ importance }).eq('id', id)
  }

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const filtered = filterCategory === 'all'
    ? memories
    : memories.filter((m) => m.category === filterCategory)

  const grouped = categories.reduce((acc, cat) => {
    acc[cat] = filtered.filter((m) => m.category === cat)
    return acc
  }, {} as Record<MemoryCategory, MemoryEntry[]>)

  const inputClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/40 transition-colors'

  if (loading) return <SkeletonList rows={4} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-gold" />
          <h3 className="text-sm font-medium text-parchment">DM Memory</h3>
          <span className="text-xs text-gray-500">({memories.length})</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 rounded-lg bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
        >
          {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showForm ? 'Cancel' : 'Add Memory'}
        </button>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        The AI uses these memories to stay consistent. Add corrections or important details the AI should remember.
      </p>

      {/* Filter bar */}
      <div className="flex gap-1 flex-wrap">
        <FilterButton active={filterCategory === 'all'} onClick={() => setFilterCategory('all')}>
          All
        </FilterButton>
        {categories.map((cat) => {
          const cfg = categoryConfig[cat]
          const count = memories.filter((m) => m.category === cat).length
          if (count === 0) return null
          return (
            <FilterButton key={cat} active={filterCategory === cat} onClick={() => setFilterCategory(cat)}>
              <span className={cfg.color}>{cat}</span> ({count})
            </FilterButton>
          )
        })}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-gold/20 bg-dark-navy p-4">
          <textarea
            className={inputClass + ' resize-none'}
            rows={3}
            placeholder="What should the AI remember? e.g. 'Eldrin is secretly working for the Shadow Guild'"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required
          />
          <div className="flex items-center gap-3">
            <select className={inputClass + ' w-auto'} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as MemoryCategory })}>
              {categories.map((c) => (
                <option key={c} value={c}>{categoryConfig[c].label}</option>
              ))}
            </select>
            <select className={inputClass + ' w-auto'} value={form.importance} onChange={(e) => setForm({ ...form, importance: e.target.value as MemoryImportance })}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button type="submit" className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-dark-navy hover:bg-gold-light transition-colors">
              Save
            </button>
          </div>
        </form>
      )}

      {memories.length === 0 ? (
        <div className="py-6 text-center">
          <Sparkles className="mx-auto mb-2 h-8 w-8 text-gold/20" />
          <p className="text-sm text-gray-600">No memories yet. The AI will add them as you play, or add your own.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const items = grouped[cat]
            if (items.length === 0) return null
            const cfg = categoryConfig[cat]
            const Icon = cfg.icon
            const collapsed = collapsedCategories.has(cat)

            return (
              <div key={cat}>
                <button
                  onClick={() => toggleCategory(cat)}
                  className="flex w-full items-center gap-2 py-1 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-400"
                >
                  {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                  {cfg.label} ({items.length})
                </button>
                {!collapsed && (
                  <div className="mt-1 space-y-1.5">
                    {items.map((memory) => (
                      <MemoryCard
                        key={memory.id}
                        memory={memory}
                        editing={editingId === memory.id}
                        editContent={editContent}
                        onStartEdit={() => { setEditingId(memory.id); setEditContent(memory.content) }}
                        onEditChange={setEditContent}
                        onSaveEdit={() => handleEdit(memory.id)}
                        onCancelEdit={() => setEditingId(null)}
                        onDelete={() => handleDelete(memory.id)}
                        onImportanceChange={(imp) => handleImportanceChange(memory.id, imp)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active ? 'bg-gold/20 text-gold' : 'bg-navy/50 text-gray-500 hover:text-gray-400'
      }`}
    >
      {children}
    </button>
  )
}

function MemoryCard({
  memory,
  editing,
  editContent,
  onStartEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onImportanceChange,
}: {
  memory: MemoryEntry
  editing: boolean
  editContent: string
  onStartEdit: () => void
  onEditChange: (v: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onImportanceChange: (imp: MemoryImportance) => void
}) {
  return (
    <div className="group rounded-lg border border-navy bg-dark-navy/50 p-3">
      {editing ? (
        <div className="space-y-2">
          <textarea
            className="w-full resize-none rounded border border-navy bg-midnight px-2 py-1.5 text-sm text-parchment outline-none focus:border-gold/40"
            rows={3}
            value={editContent}
            onChange={(e) => onEditChange(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={onSaveEdit} className="rounded bg-gold/20 px-2.5 py-1 text-xs text-gold hover:bg-gold/30">
              <Check className="inline h-3 w-3" /> Save
            </button>
            <button onClick={onCancelEdit} className="rounded bg-navy px-2.5 py-1 text-xs text-gray-400 hover:text-parchment">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <button
              onClick={() => {
                const order: MemoryImportance[] = ['low', 'medium', 'high']
                const next = order[(order.indexOf(memory.importance) + 1) % order.length]
                onImportanceChange(next)
              }}
              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${importanceDot[memory.importance]}`}
              aria-label={`Viktighet: ${memory.importance} — klicka för att ändra`}
            />
            <div className="min-w-0">
              <p className="text-sm text-gray-300 leading-relaxed">{memory.content}</p>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-600">
                {memory.source === 'ai' && <span className="flex items-center gap-0.5"><Sparkles className="h-2.5 w-2.5" /> AI</span>}
                {memory.source === 'user' && <span>Manual</span>}
                <span>·</span>
                <span>{new Date(memory.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onStartEdit} className="rounded p-1 text-gray-600 hover:text-gold transition-colors focus-ring" aria-label="Redigera minne">
              <Edit3 className="h-3 w-3" aria-hidden="true" />
            </button>
            <button onClick={onDelete} className="rounded p-1 text-gray-600 hover:text-red-400 transition-colors focus-ring" aria-label="Radera minne">
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
