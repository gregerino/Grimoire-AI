import { useState } from 'react'
import { useCampaignStore } from '@/stores/campaignStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'

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
    dm_notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const campaign = await createCampaign(form)
    setSaving(false)
    if (campaign) {
      onCreated(campaign.id)
      onClose()
      setForm({ name: '', description: '', setting: '', character_name: '', character_class: '', dm_notes: '' })
    }
  }

  const selectClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2.5 text-sm text-parchment font-ui placeholder:text-mist transition-colors duration-200 hover:border-mist focus-ring focus:border-gold/50 disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <Modal open={open} onClose={onClose} title="New Campaign" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Campaign Name *"
          placeholder="The Curse of Strahd..."
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <Textarea
          label="Description"
          rows={2}
          placeholder="A dark horror adventure in Barovia..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <Input
          label="Setting"
          placeholder="Forgotten Realms, Eberron, Homebrew..."
          value={form.setting}
          onChange={(e) => setForm({ ...form, setting: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Character Name"
            placeholder="Thorn Blackwood"
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

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={saving}
            disabled={!form.name.trim()}
          >
            Begin Adventure
          </Button>
        </div>
      </form>
    </Modal>
  )
}
