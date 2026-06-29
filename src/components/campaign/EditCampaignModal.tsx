import { useState, useEffect } from 'react'
import { useCampaignStore } from '@/stores/campaignStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
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
const statusBadgeVariant = {
  active: 'success' as const,
  paused: 'warning' as const,
  completed: 'default' as const,
}

export function EditCampaignModal({ open, campaign, onClose, onUpdated }: Props) {
  const { updateCampaign } = useCampaignStore()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    setting: '',
    character_name: '',
    character_class: '',
    dm_notes: '',
    status: 'active' as Campaign['status'],
    image_generation_enabled: true,
  })

  useEffect(() => {
    if (open) {
      setForm({
        name: campaign.name,
        description: campaign.description ?? '',
        setting: campaign.setting ?? '',
        character_name: campaign.character_name ?? '',
        character_class: campaign.character_class ?? '',
        dm_notes: campaign.dm_notes ?? '',
        status: campaign.status,
        image_generation_enabled: campaign.image_generation_enabled ?? true,
      })
    }
  }, [open, campaign])

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

  const selectClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2.5 text-sm text-parchment font-ui placeholder:text-mist transition-colors duration-200 hover:border-mist focus-ring focus:border-gold/50'

  return (
    <Modal open={open} onClose={onClose} title="Edit Campaign" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Campaign Name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <Textarea
          label="Description"
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <Input
          label="Setting"
          value={form.setting}
          onChange={(e) => setForm({ ...form, setting: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Character Name"
            value={form.character_name}
            onChange={(e) => setForm({ ...form, character_name: e.target.value })}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-parchment-dark font-ui">Class</label>
            <select
              className={selectClass}
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
          <Textarea
            label="DM Instructions"
            rows={4}
            placeholder="e.g. Keep combat deadly and tactical. Favor dark horror tone. Use Swedish names for NPCs. Skip lengthy travel descriptions. Allow creative solutions outside RAW..."
            value={form.dm_notes}
            onChange={(e) => setForm({ ...form, dm_notes: e.target.value })}
          />
          <p className="mt-1 text-[10px] text-mist">
            Custom instructions the AI dungeon master will follow: tone, house rules, pacing, themes, or anything you want to shape the experience.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-parchment-dark font-ui">Status</label>
          <div className="flex gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm({ ...form, status: s })}
                className={`transition-all ${form.status === s ? '' : 'opacity-40 hover:opacity-70'}`}
              >
                <Badge variant={statusBadgeVariant[s]} dot>{s}</Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-navy bg-midnight px-3 py-2.5">
          <div>
            <span className="text-sm font-medium text-parchment-dark font-ui">AI Image Generation</span>
            <p className="text-[10px] text-mist">Generate NPC portraits and location art (uses DALL-E 3)</p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, image_generation_enabled: !form.image_generation_enabled })}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              form.image_generation_enabled ? 'bg-gold' : 'bg-navy'
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                form.image_generation_enabled ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={saving}
            disabled={!form.name.trim()}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}
