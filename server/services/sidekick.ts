// Tasha's Cauldron of Everything — sidekick advancement formulas.

import type { SidekickKit } from '../../src/types/database'

const KIT_HIT_DICE: Record<SidekickKit, number> = {
  warrior: 10,
  expert: 8,
  spellcaster: 6,
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

// Same progression as player characters: +2 at 1-4, +3 at 5-8, ... +6 at 17-20.
export function proficiencyBonusForLevel(level: number): number {
  return Math.ceil(level / 4) + 1
}

// A sidekick gains Hit Points the way a class does: max die result at level 1,
// then the die's average (rounded up) for every level after that.
export function maxHpForLevel(kit: SidekickKit, level: number, conModifier: number): number {
  const hitDie = KIT_HIT_DICE[kit]
  const firstLevel = hitDie + conModifier
  const perLevel = Math.ceil((hitDie + 1) / 2) + conModifier
  return firstLevel + perLevel * (level - 1)
}

// AC does not scale with level in the sidekick rules — it comes from the base
// creature's stat block and whatever armor/shield it has equipped. Call this
// once at creation (or whenever equipment changes), not on every level-up.
export function armorClass(dexModifier: number, armorBaseAc = 10, dexCap = Infinity, hasShield = false): number {
  return armorBaseAc + Math.min(dexModifier, dexCap) + (hasShield ? 2 : 0)
}
