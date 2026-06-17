import { useState } from 'react'
import { X, Sparkles, Loader2, Skull, Heart, MapPin, BookOpen, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { aiUpdateNpc } from '@/lib/api'
import type { Npc } from '@/types/database'

interface Props {
  npc: Npc
  open: boolean
  onClose: () => void
  onUpdated: (npc: Npc) => void
}

const dispositionColors = {
  friendly: 'bg-green-400/20 text-green-400',
  neutral: 'bg-gray-400/20 text-gray-400',
  hostile: 'bg-red-400/20 text-red-400',
}

export function NpcDetailModal({ npc, open, onClose, onUpdated }: Props) {
  const [editing, setEditing] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiContext, setAiContext] = useState('')
  const [form, setForm] = useState({
    description: npc.description ?? '',
    notes: npc.notes ?? '',
    location: npc.location ?? '',
    backstory: npc.backstory ?? '',
    relationship: npc.relationship ?? '',
  })

  if (!open) return null

  const handleSave = async () => {
    const { data } = await supabase
      .from('npcs')
      .update(form)
      .eq('id', npc.id)
      .select()
      .single()
    if (data) {
      onUpdated(data as Npc)
      setEditing(false)
    }
  }

  const handleAiUpdate = async () => {
    if (!aiContext.trim()) return
    setAiLoading(true)
    try {
      const { npc: updated } = await aiUpdateNpc(npc.id, aiContext)
      if (updated) {
        onUpdated(updated)
        setForm({
          description: updated.description ?? '',
          notes: updated.notes ?? '',
          location: updated.location ?? '',
          backstory: updated.backstory ?? '',
          relationship: updated.relationship ?? '',
        })
      }
      setAiContext('')
    } catch {
      // silently fail
    }
    setAiLoading(false)
  }

  const toggleAlive = async () => {
    const { data } = await supabase
      .from('npcs')
      .update({ is_alive: !npc.is_alive })
      .eq('id', npc.id)
      .select()
      .single()
    if (data) onUpdated(data as Npc)
  }

  const inputClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/40 transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-navy bg-dark-navy shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-navy bg-dark-navy px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-parchment">{npc.name}</h2>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${dispositionColors[npc.disposition]}`}>
              {npc.disposition}
            </span>
            {!npc.is_alive && <span className="text-xs text-red-400">(dead)</span>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleAlive} className="rounded p-1.5 text-gray-500 hover:bg-navy transition-colors" title={npc.is_alive ? 'Mark as dead' : 'Revive'}>
              {npc.is_alive ? <Skull className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
            </button>
            <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-navy hover:text-gray-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {/* Basic info */}
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            {npc.race && <span className="rounded bg-navy px-2 py-1">{npc.race}</span>}
            {npc.occupation && <span className="rounded bg-navy px-2 py-1">{npc.occupation}</span>}
          </div>

          {/* Info sections */}
          {editing ? (
            <div className="space-y-3">
              <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} textarea />
              <Field label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
              <Field label="Backstory" value={form.backstory} onChange={(v) => setForm({ ...form, backstory: v })} textarea />
              <Field label="Relationship" value={form.relationship} onChange={(v) => setForm({ ...form, relationship: v })} />
              <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} textarea />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditing(false)} className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:bg-navy transition-colors">Cancel</button>
                <button onClick={handleSave} className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-dark-navy hover:bg-gold-light transition-colors">Save</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {npc.description && <InfoBlock icon={<BookOpen className="h-3.5 w-3.5 text-gold" />} label="Description" text={npc.description} />}
              {npc.location && <InfoBlock icon={<MapPin className="h-3.5 w-3.5 text-blue-400" />} label="Location" text={npc.location} />}
              {npc.backstory && <InfoBlock icon={<BookOpen className="h-3.5 w-3.5 text-purple-400" />} label="Backstory" text={npc.backstory} />}
              {npc.relationship && <InfoBlock icon={<Users className="h-3.5 w-3.5 text-green-400" />} label="Relationship" text={npc.relationship} />}
              {npc.notes && <InfoBlock icon={<BookOpen className="h-3.5 w-3.5 text-gray-400" />} label="Notes" text={npc.notes} />}
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-gold/60 hover:text-gold transition-colors"
              >
                Edit details
              </button>
            </div>
          )}

          {/* AI Update */}
          <div className="rounded-xl border border-navy bg-midnight p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              <span className="text-xs font-medium text-gold">AI Update</span>
            </div>
            <p className="mb-2 text-[10px] text-gray-600">
              Describe what happened with this NPC and the AI will update their information.
            </p>
            <textarea
              className={inputClass + ' resize-none'}
              rows={2}
              placeholder="e.g. The party helped Elara defend her village from gnolls. She revealed she was once a member of the Harpers."
              value={aiContext}
              onChange={(e) => setAiContext(e.target.value)}
            />
            <button
              onClick={handleAiUpdate}
              disabled={aiLoading || !aiContext.trim()}
              className="mt-2 flex items-center gap-1.5 rounded-lg bg-gold/20 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/30 disabled:opacity-50 transition-colors"
            >
              {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {aiLoading ? 'Updating...' : 'Update with AI'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoBlock({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="rounded-lg border border-navy bg-dark-navy p-3">
      <div className="mb-1 flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">{label}</span>
      </div>
      <p className="text-sm leading-relaxed text-gray-400">{text}</p>
    </div>
  )
}

function Field({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
  const inputClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/40 transition-colors'
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-gray-600">{label}</label>
      {textarea ? (
        <textarea className={inputClass + ' resize-none'} rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}
