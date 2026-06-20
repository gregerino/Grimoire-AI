import type { CharacterSheet } from './character-parser'

const DNDB_CHARACTER_API = 'https://character-service.dndbeyond.com/character/v5/character'

export function extractCharacterId(input: string): string | null {
  const trimmed = input.trim()
  if (/^\d+$/.test(trimmed)) return trimmed
  const match = trimmed.match(/dndbeyond\.com\/characters\/(\d+)/)
  return match ? match[1] : null
}

interface DndbAbility {
  id: number
  value: number | null
}

interface DndbModifier {
  type: string
  subType: string
  value: number | null
  friendlySubtypeName?: string
  statId?: number | null
}

interface DndbClassSpell {
  definition: {
    name: string
    level: number
  }
  prepared: boolean
  alwaysPrepared: boolean
}

interface DndbItem {
  definition: {
    name: string
    weight: number
    filterType: string
    armorClass?: number | null
    armorTypeId?: number | null
    damage?: { diceString: string }
    type?: string
  }
  equipped: boolean
  quantity: number
}

interface DndbClassInfo {
  definition: { name: string }
  subclassDefinition?: { name: string } | null
  level: number
}

interface DndbSpellSlot {
  level: number
  used: number
  available: number
}

interface DndbCharacterData {
  id: number
  name: string
  race: { fullName: string; baseRaceName?: string }
  classes: DndbClassInfo[]
  stats: DndbAbility[]
  bonusStats: DndbAbility[]
  overrideStats: DndbAbility[]
  baseHitPoints: number
  temporaryHitPoints: number
  removedHitPoints: number
  bonusHitPoints: number | null
  modifiers: {
    race: DndbModifier[]
    class: DndbModifier[]
    feat: DndbModifier[]
    item: DndbModifier[]
    background: DndbModifier[]
    condition: DndbModifier[]
  }
  inventory: DndbItem[]
  spells: {
    class: DndbClassSpell[] | null
    race: DndbClassSpell[] | null
    feat: DndbClassSpell[] | null
    item: DndbClassSpell[] | null
    background: DndbClassSpell[] | null
  }
  pactMagic?: DndbSpellSlot[]
  classSpells?: Array<{ spellSlots: number[] | null }>
  currencies: { cp: number; sp: number; ep: number; gp: number; pp: number }
  feats?: Array<{ definition: { name: string } }>
}

const ABILITY_IDS: Record<number, string> = {
  1: 'STR', 2: 'DEX', 3: 'CON', 4: 'INT', 5: 'WIS', 6: 'CHA',
}

const ABILITY_FULL_NAMES: Record<string, string> = {
  'strength': 'STR', 'dexterity': 'DEX', 'constitution': 'CON',
  'intelligence': 'INT', 'wisdom': 'WIS', 'charisma': 'CHA',
}

const SKILL_ABILITY: Record<string, number> = {
  'Acrobatics': 2, 'Animal Handling': 5, 'Arcana': 4, 'Athletics': 1,
  'Deception': 6, 'History': 4, 'Insight': 5, 'Intimidation': 6,
  'Investigation': 4, 'Medicine': 5, 'Nature': 4, 'Perception': 5,
  'Performance': 6, 'Persuasion': 6, 'Religion': 4, 'Sleight of Hand': 2,
  'Stealth': 2, 'Survival': 5,
}

const CLASS_HIT_DICE: Record<string, number> = {
  barbarian: 12, fighter: 10, paladin: 10, ranger: 10,
  bard: 8, cleric: 8, druid: 8, monk: 8, rogue: 8, warlock: 8,
  sorcerer: 6, wizard: 6, artificer: 8, 'blood hunter': 10,
}

// Armor type IDs from D&D Beyond
const LIGHT_ARMOR = 1
const MEDIUM_ARMOR = 2
const HEAVY_ARMOR = 3
const SHIELD_ARMOR = 4

export async function fetchDndbCharacter(characterId: string): Promise<CharacterSheet> {
  const res = await fetch(`${DNDB_CHARACTER_API}/${characterId}`, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Grimoire-AI/1.0',
    },
  })

  if (!res.ok) {
    if (res.status === 404) throw new Error('Character not found. Check the URL and make sure the character is set to public.')
    if (res.status === 403) throw new Error('Character is not public. Set sharing to "Public" in D&D Beyond character settings.')
    throw new Error(`D&D Beyond returned status ${res.status}`)
  }

  const json = await res.json()
  const data: DndbCharacterData = json.data ?? json

  return mapToCharacterSheet(data)
}

function getAbilityScore(data: DndbCharacterData, abilityId: number): number {
  const override = data.overrideStats?.find(s => s.id === abilityId)
  if (override?.value) return override.value

  const base = data.stats?.find(s => s.id === abilityId)?.value ?? 10
  const bonus = data.bonusStats?.find(s => s.id === abilityId)?.value ?? 0

  let modBonus = 0
  const allMods = [
    ...(data.modifiers?.race ?? []),
    ...(data.modifiers?.feat ?? []),
    ...(data.modifiers?.item ?? []),
    ...(data.modifiers?.background ?? []),
  ]

  const abilityName = ABILITY_IDS[abilityId]?.toLowerCase()
  for (const mod of allMods) {
    if (mod.type === 'bonus' && mod.subType === `${abilityName}-score` && mod.value) {
      modBonus += mod.value
    }
  }

  return base + bonus + modBonus
}

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

function getProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1
}

function computeAC(data: DndbCharacterData, stats: Record<string, number>, allModifiers: DndbModifier[]): number {
  const dexMod = abilityMod(stats.DEX)

  let equippedArmor: DndbItem | null = null
  let hasShield = false

  for (const item of data.inventory ?? []) {
    if (!item.equipped) continue
    const def = item.definition
    if (def.filterType === 'Armor') {
      if (def.armorTypeId === SHIELD_ARMOR) {
        hasShield = true
      } else if (def.armorClass != null) {
        equippedArmor = item
      }
    }
  }

  let ac: number
  if (equippedArmor) {
    const baseAC = equippedArmor.definition.armorClass!
    const armorType = equippedArmor.definition.armorTypeId
    if (armorType === LIGHT_ARMOR) {
      ac = baseAC + dexMod
    } else if (armorType === MEDIUM_ARMOR) {
      ac = baseAC + Math.min(dexMod, 2)
    } else if (armorType === HEAVY_ARMOR) {
      ac = baseAC
    } else {
      ac = baseAC + dexMod
    }
  } else {
    // Unarmored — check for unarmored defense (Barbarian: 10 + DEX + CON, Monk: 10 + DEX + WIS)
    ac = 10 + dexMod
    for (const mod of allModifiers) {
      if (mod.type === 'set' && mod.subType === 'unarmored-armor-class' && mod.statId) {
        const bonusAbility = ABILITY_IDS[mod.statId]
        if (bonusAbility) {
          ac = 10 + dexMod + abilityMod(stats[bonusAbility])
        }
      }
    }
  }

  if (hasShield) ac += 2

  for (const mod of allModifiers) {
    if (mod.type === 'bonus' && mod.subType === 'armor-class' && mod.value) {
      ac += mod.value
    }
  }

  return ac
}

function mapToCharacterSheet(data: DndbCharacterData): CharacterSheet {
  const primaryClass = data.classes?.[0]
  const className = primaryClass?.definition?.name ?? 'Unknown'
  const subclass = primaryClass?.subclassDefinition?.name ?? undefined
  const level = data.classes?.reduce((sum, c) => sum + c.level, 0) ?? 1
  const profBonus = getProficiencyBonus(level)

  const stats = {
    STR: getAbilityScore(data, 1),
    DEX: getAbilityScore(data, 2),
    CON: getAbilityScore(data, 3),
    INT: getAbilityScore(data, 4),
    WIS: getAbilityScore(data, 5),
    CHA: getAbilityScore(data, 6),
  }

  const conMod = abilityMod(stats.CON)
  const maxHp = data.baseHitPoints + (conMod * level) + (data.bonusHitPoints ?? 0)

  const allModifiers = [
    ...(data.modifiers?.race ?? []),
    ...(data.modifiers?.class ?? []),
    ...(data.modifiers?.feat ?? []),
    ...(data.modifiers?.item ?? []),
    ...(data.modifiers?.background ?? []),
  ]

  const proficientSaves = new Set<string>()
  const proficientSkills = new Set<string>()
  const expertiseSkills = new Set<string>()
  const proficiencyList: string[] = []

  for (const mod of allModifiers) {
    if (mod.type === 'proficiency') {
      if (mod.subType.endsWith('-saving-throws')) {
        const abilityPart = mod.subType.replace('-saving-throws', '')
        const ability = ABILITY_FULL_NAMES[abilityPart]
        if (ability) proficientSaves.add(ability)
      }
      if (mod.friendlySubtypeName && SKILL_ABILITY[mod.friendlySubtypeName] !== undefined) {
        proficientSkills.add(mod.friendlySubtypeName)
      }
      if (mod.friendlySubtypeName) {
        proficiencyList.push(mod.friendlySubtypeName)
      }
    }
    if (mod.type === 'expertise') {
      if (mod.friendlySubtypeName && SKILL_ABILITY[mod.friendlySubtypeName] !== undefined) {
        expertiseSkills.add(mod.friendlySubtypeName)
      }
    }
  }

  const savingThrows: Record<string, number> = {}
  for (const [, name] of Object.entries(ABILITY_IDS)) {
    const mod = abilityMod(stats[name as keyof typeof stats])
    savingThrows[name] = mod + (proficientSaves.has(name) ? profBonus : 0)
  }

  const skills: Record<string, number> = {}
  for (const [skill, abilityId] of Object.entries(SKILL_ABILITY)) {
    const abilityName = ABILITY_IDS[abilityId]
    const mod = abilityMod(stats[abilityName as keyof typeof stats])
    let bonus = mod
    if (proficientSkills.has(skill)) bonus += profBonus
    if (expertiseSkills.has(skill)) bonus += profBonus
    skills[skill] = bonus
  }

  const ac = computeAC(data, stats, allModifiers)
  const speed = 30
  const initiative = abilityMod(stats.DEX)

  // Spells — each category can be null
  const allSpells = [
    ...(data.spells?.class ?? []),
    ...(data.spells?.race ?? []),
    ...(data.spells?.feat ?? []),
    ...(data.spells?.item ?? []),
    ...(data.spells?.background ?? []),
  ]

  const spells = allSpells.map(s => ({
    name: s.definition.name,
    level: s.definition.level,
    prepared: s.prepared || s.alwaysPrepared,
    source: '',
  }))

  // Spell slots
  const spellSlots: Record<number, { used: number; max: number }> = {}
  if (data.classSpells?.[0]?.spellSlots) {
    const slots = data.classSpells[0].spellSlots
    for (let i = 1; i < slots.length; i++) {
      if (slots[i] > 0) {
        spellSlots[i] = { used: 0, max: slots[i] }
      }
    }
  }
  if (data.pactMagic) {
    for (const slot of data.pactMagic) {
      if (slot.available > 0) {
        const existing = spellSlots[slot.level]
        if (existing) {
          existing.max += slot.available
          existing.used += slot.used
        } else {
          spellSlots[slot.level] = { used: slot.used, max: slot.available }
        }
      }
    }
  }

  // Equipment
  const equipment = (data.inventory ?? []).map(item => ({
    name: item.definition.name,
    qty: item.quantity,
    weight: String(item.definition.weight ?? 0),
  }))

  // Weapons
  const weapons = (data.inventory ?? [])
    .filter(item => item.definition.filterType === 'Weapon')
    .map(item => ({
      name: item.definition.name,
      hit: '',
      damage: item.definition.damage?.diceString ?? '',
      notes: '',
    }))

  // Feats
  const feats = (data.feats ?? []).map(f => f.definition.name)

  const hitDieSize = CLASS_HIT_DICE[className.toLowerCase()] ?? 8

  return {
    name: data.name || 'Unknown',
    race: data.race?.fullName || data.race?.baseRaceName || 'Unknown',
    class: className,
    subclass,
    level,
    hp: {
      current: maxHp - (data.removedHitPoints ?? 0),
      max: maxHp,
      temp: data.temporaryHitPoints ?? 0,
    },
    ac,
    speed,
    initiative,
    proficiencyBonus: profBonus,
    stats,
    savingThrows,
    skills,
    spellSlots,
    spells,
    feats,
    traits: [],
    proficiencies: [...new Set(proficiencyList)],
    equipment,
    weapons,
    currencies: data.currencies ?? { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    defenses: '',
    senses: '',
    hitDice: `${level}d${hitDieSize}`,
  }
}
