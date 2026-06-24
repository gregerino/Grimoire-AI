// DnD Beyond PDF character sheet parser.
// DnD Beyond exports form-fillable PDFs where character data lives in
// Widget annotations (form fields), not in the text layer.
// We use pdfjs-dist to extract field values and Y positions for spell grouping.

export interface CharacterSheet {
  name: string
  race: string
  class: string
  subclass?: string
  level: number
  hp: { current: number; max: number; temp: number }
  ac: number
  speed: number
  initiative: number
  proficiencyBonus: number
  stats: {
    STR: number; DEX: number; CON: number
    INT: number; WIS: number; CHA: number
  }
  savingThrows: Record<string, number>
  skills: Record<string, number>
  spellSlots: Record<number, { used: number; max: number }>
  spells: Array<{ name: string; level: number; prepared: boolean; source: string }>
  feats: string[]
  traits: string[]
  proficiencies: string[]
  equipment: Array<{ name: string; qty: number; weight: string }>
  weapons: Array<{ name: string; hit: string; damage: string; notes: string }>
  currencies: { gp: number; sp: number; cp: number; ep: number; pp: number }
  defenses: string
  senses: string
  hitDice: string
}

function num(s: string | undefined | null): number {
  if (!s) return 0
  const n = parseInt(s.replace(/[^0-9-]/g, ''), 10)
  return isNaN(n) ? 0 : n
}

interface AnnotationWithPosition {
  fieldName: string
  fieldValue: string
  y: number
}

export async function parseCharacterPdfFromBuffer(buffer: Buffer): Promise<{ fields: Record<string, string>; sheet: CharacterSheet }> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise

  const fields: Record<string, string> = {}
  const spellAnnotations: AnnotationWithPosition[] = []

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const annotations = await page.getAnnotations()
    for (const a of annotations) {
      if (!a.fieldName || a.fieldValue == null) continue
      fields[a.fieldName] = String(a.fieldValue)

      if (a.rect && (a.fieldName.startsWith('spellHeader') || a.fieldName.startsWith('spellName'))) {
        spellAnnotations.push({
          fieldName: a.fieldName,
          fieldValue: String(a.fieldValue),
          y: a.rect[1],
        })
      }
    }
  }

  const sheet = buildSheetFromFields(fields, spellAnnotations)
  return { fields, sheet }
}

function buildSheetFromFields(f: Record<string, string>, spellAnnotations: AnnotationWithPosition[]): CharacterSheet {
  const classLevel = f['CLASS  LEVEL'] || f['CLASS LEVEL'] || ''
  const classMatch = classLevel.match(/^(.+?)\s+(\d+)$/)
  const className = classMatch ? classMatch[1] : classLevel || 'Unknown'
  const level = classMatch ? num(classMatch[2]) : 1

  const subclass = extractSubclass(f)

  const stats = {
    STR: num(f['STR']),
    DEX: num(f['DEX']),
    CON: num(f['CON']),
    INT: num(f['INT']),
    WIS: num(f['WIS']),
    CHA: num(f['CHA']),
  }

  const savingThrows: Record<string, number> = {
    STR: num(f['ST Strength']),
    DEX: num(f['ST Dexterity']),
    CON: num(f['ST Constitution']),
    INT: num(f['ST Intelligence']),
    WIS: num(f['ST Wisdom']),
    CHA: num(f['ST Charisma']),
  }

  const skills = extractSkills(f)
  const spellSlots = extractSpellSlots(f)
  const spells = extractSpells(f, spellAnnotations)
  const { feats, traits } = extractFeatsAndTraits(f)
  const proficiencies = extractProficiencies(f)
  const equipment = extractEquipment(f)
  const weapons = extractWeapons(f)

  return {
    name: f['CharacterName'] || 'Unknown',
    race: f['RACE'] || 'Unknown',
    class: className,
    subclass,
    level,
    hp: {
      current: num(f['MaxHP']),
      max: num(f['MaxHP']),
      temp: 0,
    },
    ac: num(f['AC']),
    speed: num(f['Speed']),
    initiative: num(f['Init']),
    proficiencyBonus: num(f['ProfBonus']),
    stats,
    savingThrows,
    skills,
    spellSlots,
    spells,
    feats,
    traits,
    proficiencies,
    equipment,
    weapons,
    currencies: {
      cp: num(f['CP']),
      sp: num(f['SP']),
      ep: num(f['EP']),
      gp: num(f['GP']),
      pp: num(f['PP']),
    },
    defenses: f['Defenses'] || '',
    senses: f['AdditionalSenses'] || '',
    hitDice: f['Total'] || '',
  }
}

function extractSubclass(f: Record<string, string>): string | undefined {
  const allFeatures = [f['FeaturesTraits1'], f['FeaturesTraits2'], f['FeaturesTraits3'], f['FeaturesTraits4']]
    .filter(Boolean).join('\n')

  // DnD Beyond features list the subclass with "| SubclassName" pattern
  const match = allFeatures.match(/\*\s*\w[\w\s]*Subclass[^|]*\n\s*\|\s*(.+)/i)
  if (match) return match[1].trim()
  return undefined
}

function extractSkills(f: Record<string, string>): Record<string, number> {
  // DnD Beyond uses these exact field names (some have trailing spaces)
  const fieldMap: Record<string, string> = {
    'Acrobatics': 'Acrobatics',
    'Animal Handling': 'Animal',
    'Arcana': 'Arcana',
    'Athletics': 'Athletics',
    'Deception': 'Deception',
    'History': 'History',
    'Insight': 'Insight',
    'Intimidation': 'Intimidation',
    'Investigation': 'Investigation',
    'Medicine': 'Medicine',
    'Nature': 'Nature',
    'Perception': 'Perception',
    'Performance': 'Performance',
    'Persuasion': 'Persuasion',
    'Religion': 'Religion',
    'Sleight of Hand': 'SleightofHand',
    'Stealth': 'Stealth ',
    'Survival': 'Survival',
  }
  const skills: Record<string, number> = {}
  for (const [display, field] of Object.entries(fieldMap)) {
    skills[display] = num(f[field])
  }
  return skills
}

function extractSpellSlots(f: Record<string, string>): Record<number, { used: number; max: number }> {
  const slots: Record<number, { used: number; max: number }> = {}
  for (let i = 0; i <= 9; i++) {
    const header = f[`spellSlotHeader${i}`]
    if (!header || /at will/i.test(header)) continue
    const match = header.match(/(\d+)\s*Slots?/i)
    if (match) {
      const max = num(match[1])
      // Count filled circles (●) for used slots — DnD Beyond uses O for available
      const filled = (header.match(/●/g) || []).length
      slots[i] = { used: filled, max }
    }
  }
  return slots
}

function extractSpells(f: Record<string, string>, annotations: AnnotationWithPosition[]): CharacterSheet['spells'] {
  // Build Y-position based level map from spell headers
  const headers = annotations
    .filter(a => a.fieldName.startsWith('spellHeader'))
    .sort((a, b) => b.y - a.y) // top of page first (highest Y)

  const headerLevels: { y: number; level: number }[] = []
  for (const h of headers) {
    if (/cantrip|at will/i.test(h.fieldValue)) {
      headerLevels.push({ y: h.y, level: 0 })
    } else {
      const m = h.fieldValue.match(/(\d)\w*\s*level/i)
      if (m) headerLevels.push({ y: h.y, level: num(m[1]) })
    }
  }

  // Get spell name annotations with positions
  const spellPositions = annotations
    .filter(a => a.fieldName.startsWith('spellName') && a.fieldValue.trim())
    .sort((a, b) => b.y - a.y)

  // Assign level to each spell based on which header it falls under (closest header above it)
  function getSpellLevel(spellY: number): number {
    let closestLevel = 0
    let closestDist = Infinity
    for (const h of headerLevels) {
      if (h.y > spellY) {
        const dist = h.y - spellY
        if (dist < closestDist) {
          closestDist = dist
          closestLevel = h.level
        }
      }
    }
    return closestLevel
  }

  // Build spell-index-to-level map from positions
  const indexToLevel: Record<number, number> = {}
  for (const sp of spellPositions) {
    const idx = parseInt(sp.fieldName.replace('spellName', ''))
    if (!isNaN(idx)) {
      indexToLevel[idx] = getSpellLevel(sp.y)
    }
  }

  // Now build spell list from fields
  const spells: CharacterSheet['spells'] = []
  for (let i = 0; i < 80; i++) {
    const name = f[`spellName${i}`]
    if (!name || !name.trim()) continue

    const source = f[`spellSource${i}`] || ''
    const prepField = f[`spellPrepared${i}`] || ''
    const prepared = prepField === 'P' || /always prepared/i.test(source)

    spells.push({
      name: name.trim(),
      level: indexToLevel[i] ?? 0,
      prepared,
      source,
    })
  }

  return spells
}

function extractFeatsAndTraits(f: Record<string, string>): { feats: string[]; traits: string[] } {
  const allFeatures = [f['FeaturesTraits1'], f['FeaturesTraits2'], f['FeaturesTraits3'], f['FeaturesTraits4']]
    .filter(Boolean).join('\n')

  const feats: string[] = []
  const traits: string[] = []

  const featsSection = allFeatures.match(/=== FEATS ===([\s\S]*?)(?:===|$)/)
  if (featsSection) {
    for (const m of featsSection[1].matchAll(/\*\s*([^•\n]+?)(?:\s*•\s*\w)/gm)) {
      feats.push(m[1].trim())
    }
  }

  // Class features
  const classSection = allFeatures.match(/=== \w[\w\s]* FEATURES ===([\s\S]*?)(?:=== \w[\w\s]* SPECIES|=== FEATS|$)/)
  if (classSection) {
    for (const m of classSection[1].matchAll(/\*\s*([^•\n]+?)(?:\s*•\s*\w)/gm)) {
      traits.push(m[1].trim())
    }
  }

  // Species traits
  const speciesSection = allFeatures.match(/=== \w[\w\s]* SPECIES TRAITS ===([\s\S]*?)(?:=== FEATS|$)/)
  if (speciesSection) {
    for (const m of speciesSection[1].matchAll(/\*\s*([^•\n]+?)(?:\s*•\s*\w)/gm)) {
      traits.push(m[1].trim())
    }
  }

  return { feats, traits }
}

function extractProficiencies(f: Record<string, string>): string[] {
  const text = f['ProficienciesLang'] || ''
  const profs: string[] = []
  // Match sections like "=== WEAPONS ===\nSimple Weapons"
  const sectionPattern = /===\s*([^=]+?)\s*===\s*\n([\s\S]*?)(?=\n===|$)/g
  for (const match of text.matchAll(sectionPattern)) {
    const content = match[2].trim()
    if (content) {
      for (const line of content.split('\n')) {
        profs.push(...line.split(',').map(s => s.trim()).filter(Boolean))
      }
    }
  }
  return profs
}

function extractEquipment(f: Record<string, string>): CharacterSheet['equipment'] {
  const equipment: CharacterSheet['equipment'] = []
  for (let i = 0; i < 40; i++) {
    const name = f[`Eq Name${i}`]
    if (!name) continue
    equipment.push({
      name,
      qty: num(f[`Eq Qty${i}`]) || 1,
      weight: f[`Eq Weight${i}`] || '',
    })
  }
  return equipment
}

function extractWeapons(f: Record<string, string>): CharacterSheet['weapons'] {
  const weapons: CharacterSheet['weapons'] = []

  // DnD Beyond weapon fields have inconsistent spacing in field names
  // Wpn Name, Wpn Name 2, Wpn Name 3, Wpn Name 4
  // Wpn1 AtkBonus, Wpn2 AtkBonus , Wpn3 AtkBonus   (trailing spaces)
  const wpnNames = [
    f['Wpn Name'],
    f['Wpn Name 2'],
    f['Wpn Name 3'],
    f['Wpn Name 4'],
    f['Wpn Name 5'],
    f['Wpn Name 6'],
  ]

  for (let i = 0; i < wpnNames.length; i++) {
    const name = wpnNames[i]
    if (!name) continue

    // Find attack bonus and damage with flexible field name matching
    const wpnNum = i + 1
    let hit = ''
    let damage = ''
    const notes = f[`Wpn Notes ${wpnNum}`] || ''

    // Search for fields with trailing spaces
    for (const [k, v] of Object.entries(f)) {
      if (k.trim() === `Wpn${wpnNum} AtkBonus`) hit = v
      if (k.trim() === `Wpn${wpnNum} Damage`) damage = v
    }

    weapons.push({ name, hit, damage, notes })
  }

  return weapons
}
