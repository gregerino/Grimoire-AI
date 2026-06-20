import { useState, useEffect, useCallback } from 'react'
import {
  Heart, Shield, Footprints, Upload, Loader2,
  Sword, BookOpen, Star, Backpack, ChevronDown, ChevronUp,
  Moon, AlertCircle, Crosshair,
} from 'lucide-react'
import { getCharacterSheet, parseCharacterPdf, saveCharacterSheet } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { ConditionBadge } from '@/components/combat/ConditionBadge'
import { RestDialog } from '@/components/combat/RestDialog'
import type { Condition } from '@/types/combat'

interface CharacterSheet {
  name: string
  race: string
  class: string
  subclass?: string
  level: number
  hp: { current: number; max: number; temp: number }
  ac: number
  speed: number
  stats: Record<string, number>
  savingThrows: Record<string, number>
  skills: Record<string, number>
  spellSlots: Record<number, { used: number; max: number }>
  spells: Array<{ name: string; level: number; prepared: boolean }>
  feats: string[]
  traits: string[]
  proficiencies: string[]
  equipment: Array<{ name: string; equipped: boolean }>
  currencies: { gp: number; sp: number; cp: number; ep: number; pp: number }
  hitDice?: { current: number; max: number }
  activeConditions?: Condition[]
}

interface Props {
  campaignId: string
}

const STAT_NAMES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const

function mod(score: number): string {
  const m = Math.floor((score - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

export function CharacterPanel({ campaignId }: Props) {
  const [character, setCharacter] = useState<CharacterSheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [showRestDialog, setShowRestDialog] = useState(false)

  const fetchCharacter = useCallback(async () => {
    setLoading(true)
    try {
      const { character: data } = await getCharacterSheet(campaignId)
      setCharacter(data)
    } catch {
      // No character yet
    }
    setLoading(false)
  }, [campaignId])

  useEffect(() => {
    fetchCharacter()

    const channel = supabase
      .channel(`charsheet:${campaignId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'character_sheets', filter: `campaign_id=eq.${campaignId}` },
        () => {
          fetchCharacter()
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [fetchCharacter, campaignId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)

    try {
      const { character: parsed } = await parseCharacterPdf(file)
      await saveCharacterSheet(campaignId, parsed)
      setCharacter(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse character sheet')
    }
    setUploading(false)
    e.target.value = ''
  }

  const toggle = (section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-gold/50" />
      </div>
    )
  }

  if (!character) {
    return (
      <div className="space-y-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
          Character Sheet
        </h3>
        <div className="rounded-xl border border-dashed border-navy bg-dark-navy/50 p-6 text-center">
          <Upload className="mx-auto mb-3 h-8 w-8 text-gray-600" />
          <p className="mb-3 text-sm text-gray-500">
            Upload a DnD Beyond character PDF to import your character sheet.
          </p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gold/20 border border-gold/30 px-4 py-2 text-sm text-gold transition-colors hover:bg-gold/30">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Parsing...' : 'Upload PDF'}
            <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" />
          </label>
          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </div>
      </div>
    )
  }

  const hpPercent = character.hp.max > 0
    ? Math.max(0, Math.min(100, (character.hp.current / character.hp.max) * 100))
    : 0
  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'

  const spellSlotEntries = Object.entries(character.spellSlots)
    .map(([level, slots]) => ({ level: parseInt(level), ...slots }))
    .filter((s) => s.max > 0)
    .sort((a, b) => a.level - b.level)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
          Character Sheet
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowRestDialog(true)}
            className="rounded p-1 text-gray-600 transition-colors hover:text-gold"
            title="Take a rest"
          >
            <Moon className="h-3.5 w-3.5" />
          </button>
          <label className="cursor-pointer rounded p-1 text-gray-600 transition-colors hover:text-gold">
            <Upload className="h-3.5 w-3.5" />
            <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Name & Class */}
      <div className="rounded-xl border border-navy bg-dark-navy p-3">
        <div className="text-sm font-bold text-parchment">{character.name}</div>
        <div className="text-xs text-gray-400">
          Level {character.level} {character.race} {character.class}
          {character.subclass && ` (${character.subclass})`}
        </div>
      </div>

      {/* HP Bar */}
      <div className="rounded-xl border border-navy bg-dark-navy p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[10px] uppercase tracking-wider text-gray-500">HP</span>
          </div>
          <span className="text-xs font-bold text-parchment">
            {character.hp.current}/{character.hp.max}
            {character.hp.temp > 0 && (
              <span className="ml-1 text-blue-400">(+{character.hp.temp} temp)</span>
            )}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-navy">
          <div
            className={`h-full rounded-full transition-all duration-500 ${hpColor}`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {/* Active Conditions */}
      {character.activeConditions && character.activeConditions.length > 0 && (
        <div className="rounded-xl border border-navy bg-dark-navy p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[10px] uppercase tracking-wider text-gray-500">
              Conditions
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {character.activeConditions.map((cond) => (
              <ConditionBadge key={cond} condition={cond} />
            ))}
          </div>
        </div>
      )}

      {/* AC & Speed */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-navy bg-dark-navy p-3 text-center">
          <Shield className="mx-auto mb-1 h-4 w-4 text-blue-400" />
          <div className="text-lg font-bold text-parchment">{character.ac}</div>
          <div className="text-[10px] uppercase tracking-wider text-gray-600">AC</div>
        </div>
        <div className="rounded-xl border border-navy bg-dark-navy p-3 text-center">
          <Footprints className="mx-auto mb-1 h-4 w-4 text-green-400" />
          <div className="text-lg font-bold text-parchment">{character.speed} ft</div>
          <div className="text-[10px] uppercase tracking-wider text-gray-600">Speed</div>
        </div>
      </div>

      {/* Ability Scores */}
      <div className="grid grid-cols-3 gap-1.5">
        {STAT_NAMES.map((stat) => (
          <div key={stat} className="rounded-lg border border-navy bg-dark-navy p-2 text-center">
            <div className="text-[10px] font-medium text-gray-600">{stat}</div>
            <div className="text-sm font-bold text-parchment">{character.stats[stat]}</div>
            <div className="text-[10px] text-gold">{mod(character.stats[stat])}</div>
          </div>
        ))}
      </div>

      {/* Skills */}
      {character.skills && Object.keys(character.skills).length > 0 && (
        <CollapsibleSection
          title={`Skills (${Object.keys(character.skills).length})`}
          icon={<Crosshair className="h-3.5 w-3.5 text-emerald-400" />}
          expanded={expandedSection === 'skills'}
          onToggle={() => toggle('skills')}
        >
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            {Object.entries(character.skills)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([skill, bonus]) => (
                <div key={skill} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 truncate">{skill}</span>
                  <span className={`font-medium tabular-nums ${bonus >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {bonus >= 0 ? `+${bonus}` : bonus}
                  </span>
                </div>
              ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Spell Slots */}
      {spellSlotEntries.length > 0 && (
        <CollapsibleSection
          title="Spell Slots"
          icon={<BookOpen className="h-3.5 w-3.5 text-blue-400" />}
          expanded={expandedSection === 'spells'}
          onToggle={() => toggle('spells')}
        >
          <div className="space-y-1.5">
            {spellSlotEntries.map((slot) => (
              <div key={slot.level} className="flex items-center gap-2">
                <span className="w-8 text-[10px] text-gray-500">Lvl {slot.level}</span>
                <div className="flex flex-1 gap-1">
                  {Array.from({ length: slot.max }, (_, i) => {
                    const available = i < slot.max - slot.used
                    return (
                      <button
                        key={i}
                        onClick={async () => {
                          const updated = { ...character }
                          const slots = { ...updated.spellSlots }
                          const s = { ...slots[slot.level] }
                          s.used = available ? s.used + 1 : Math.max(0, s.used - 1)
                          slots[slot.level] = s
                          updated.spellSlots = slots
                          setCharacter(updated)
                          await saveCharacterSheet(campaignId, updated)
                        }}
                        className={`h-3 flex-1 rounded-full transition-colors cursor-pointer hover:opacity-80 ${
                          available ? 'bg-blue-500' : 'bg-navy'
                        }`}
                        title={available ? 'Click to use slot' : 'Click to restore slot'}
                      />
                    )
                  })}
                </div>
                <span className="text-[10px] text-gray-500">
                  {slot.max - slot.used}/{slot.max}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Spells List */}
      {character.spells.length > 0 && (
        <CollapsibleSection
          title={`Spells (${character.spells.length})`}
          icon={<Star className="h-3.5 w-3.5 text-purple-400" />}
          expanded={expandedSection === 'spellList'}
          onToggle={() => toggle('spellList')}
        >
          <div className="space-y-0.5">
            {character.spells.map((spell, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className={spell.prepared ? 'text-gray-300' : 'text-gray-600'}>
                  {spell.name}
                </span>
                <span className="text-[10px] text-gray-600">
                  {spell.level === 0 ? 'C' : `L${spell.level}`}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Feats */}
      {character.feats.length > 0 && (
        <CollapsibleSection
          title={`Feats (${character.feats.length})`}
          icon={<Sword className="h-3.5 w-3.5 text-gold" />}
          expanded={expandedSection === 'feats'}
          onToggle={() => toggle('feats')}
        >
          <div className="space-y-0.5">
            {character.feats.map((feat, i) => (
              <div key={i} className="text-xs text-gray-400">{feat}</div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Equipment */}
      {character.equipment.length > 0 && (
        <CollapsibleSection
          title={`Equipment (${character.equipment.length})`}
          icon={<Backpack className="h-3.5 w-3.5 text-amber-400" />}
          expanded={expandedSection === 'equipment'}
          onToggle={() => toggle('equipment')}
        >
          <div className="space-y-0.5">
            {character.equipment.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-gray-400">
                {item.equipped && <span className="text-[10px] text-green-400">E</span>}
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Currencies */}
      {(character.currencies.gp > 0 || character.currencies.sp > 0) && (
        <div className="flex gap-2 rounded-xl border border-navy bg-dark-navy p-3">
          {character.currencies.pp > 0 && <CurrencyBadge label="PP" value={character.currencies.pp} color="text-gray-300" />}
          {character.currencies.gp > 0 && <CurrencyBadge label="GP" value={character.currencies.gp} color="text-gold" />}
          {character.currencies.ep > 0 && <CurrencyBadge label="EP" value={character.currencies.ep} color="text-blue-300" />}
          {character.currencies.sp > 0 && <CurrencyBadge label="SP" value={character.currencies.sp} color="text-gray-400" />}
          {character.currencies.cp > 0 && <CurrencyBadge label="CP" value={character.currencies.cp} color="text-amber-600" />}
        </div>
      )}

      {/* Rest Dialog */}
      {showRestDialog && (
        <RestDialog
          campaignId={campaignId}
          character={character}
          onClose={() => setShowRestDialog(false)}
          onComplete={fetchCharacter}
        />
      )}
    </div>
  )
}

function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-navy bg-dark-navy">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 p-3 text-left transition-colors hover:bg-navy/30"
      >
        {icon}
        <span className="flex-1 text-xs font-medium text-gray-400">{title}</span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-gray-600" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-gray-600" />
        )}
      </button>
      {expanded && <div className="border-t border-navy px-3 pb-3 pt-2">{children}</div>}
    </div>
  )
}

function CurrencyBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-600">{label}</div>
    </div>
  )
}
