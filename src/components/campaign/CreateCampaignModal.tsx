import { useState } from 'react'
import { X } from 'lucide-react'
import { useCampaignStore } from '@/stores/campaignStore'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
}

const CHARACTER_CLASSES = [
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter',
  'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer',
  'Warlock', 'Wizard',
]

export function CreateCampaignModal({ open, onClose, onCreated }: Props) {
  const { createCampaign } = useCampaignStore()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    setting: '',
    character_name: '',
    character_class: '',
  })

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const campaign = await createCampaign(form)
    setSaving(false)
    if (campaign) {
      onCreated(campaign.id)
      onClose()
      setForm({ name: '', description: '', setting: '', character_name: '', character_class: '' })
    }
  }

  const inputClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-navy bg-dark-navy shadow-2xl">
        <div className="flex items-center justify-between border-b border-navy px-5 py-4">
          <h2 className="text-lg font-bold text-parchment">New Campaign</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-navy hover:text-gray-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gold">Campaign Name *</label>
            <input
              className={inputClass}
              placeholder="The Curse of Strahd..."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gold">Description</label>
            <textarea
              className={inputClass + ' resize-none'}
              rows={2}
              placeholder="A dark horror adventure in Barovia..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gold">Setting</label>
            <input
              className={inputClass}
              placeholder="Forgotten Realms, Eberron, Homebrew..."
              value={form.setting}
              onChange={(e) => setForm({ ...form, setting: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gold">Character Name</label>
              <input
                className={inputClass}
                placeholder="Thorn Blackwood"
                value={form.character_name}
                onChange={(e) => setForm({ ...form, character_name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gold">Class</label>
              <select
                className={inputClass}
                value={form.character_class}
                onChange={(e) => setForm({ ...form, character_class: e.target.value })}
              >
                <option value="">Select...</option>
                {CHARACTER_CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-navy transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-dark-navy hover:bg-gold-light disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating...' : 'Begin Adventure'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
