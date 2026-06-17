import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useCampaignStore } from '@/stores/campaignStore'
import type { Campaign } from '@/types/database'

interface Props {
  open: boolean
  campaign: Campaign
  onClose: () => void
  onUpdated?: (campaign: Campaign) => void
}

const CHARACTER_CLASSES = [
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter',
  'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer',
  'Warlock', 'Wizard',
]

const STATUSES: Campaign['status'][] = ['active', 'paused', 'completed']

export function EditCampaignModal({ open, campaign, onClose, onUpdated }: Props) {
  const { updateCampaign } = useCampaignStore()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    setting: '',
    character_name: '',
    character_class: '',
    status: 'active' as Campaign['status'],
  })

  useEffect(() => {
    if (open) {
      setForm({
        name: campaign.name,
        description: campaign.description ?? '',
        setting: campaign.setting ?? '',
        character_name: campaign.character_name ?? '',
        character_class: campaign.character_class ?? '',
        status: campaign.status,
      })
    }
  }, [open, campaign])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const updated = await updateCampaign(campaign.id, form)
    setSaving(false)
    if (updated) {
      onUpdated?.(updated)
      onClose()
    }
  }

  const inputClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-navy bg-dark-navy shadow-2xl">
        <div className="flex items-center justify-between border-b border-navy px-5 py-4">
          <h2 className="text-lg font-bold text-parchment">Edit Campaign</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-navy hover:text-gray-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gold">Campaign Name *</label>
            <input
              className={inputClass}
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
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gold">Setting</label>
            <input
              className={inputClass}
              value={form.setting}
              onChange={(e) => setForm({ ...form, setting: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gold">Character Name</label>
              <input
                className={inputClass}
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

          <div>
            <label className="mb-1 block text-xs font-medium text-gold">Status</label>
            <div className="flex gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, status: s })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    form.status === s
                      ? s === 'active' ? 'bg-green-400/20 text-green-400 ring-1 ring-green-400/30'
                      : s === 'paused' ? 'bg-yellow-400/20 text-yellow-400 ring-1 ring-yellow-400/30'
                      : 'bg-gray-400/20 text-gray-400 ring-1 ring-gray-400/30'
                      : 'text-gray-600 hover:bg-navy'
                  }`}
                >
                  {s}
                </button>
              ))}
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
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
