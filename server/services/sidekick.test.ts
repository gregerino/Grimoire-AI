import { describe, it, expect } from 'vitest'
import { abilityModifier, proficiencyBonusForLevel, maxHpForLevel, armorClass } from './sidekick'

describe('abilityModifier', () => {
  it('rounds down towards negative infinity', () => {
    expect(abilityModifier(10)).toBe(0)
    expect(abilityModifier(11)).toBe(0)
    expect(abilityModifier(8)).toBe(-1)
    expect(abilityModifier(18)).toBe(4)
  })
})

describe('proficiencyBonusForLevel', () => {
  it('matches the standard PC proficiency bonus table', () => {
    expect(proficiencyBonusForLevel(1)).toBe(2)
    expect(proficiencyBonusForLevel(4)).toBe(2)
    expect(proficiencyBonusForLevel(5)).toBe(3)
    expect(proficiencyBonusForLevel(8)).toBe(3)
    expect(proficiencyBonusForLevel(9)).toBe(4)
    expect(proficiencyBonusForLevel(12)).toBe(4)
    expect(proficiencyBonusForLevel(13)).toBe(5)
    expect(proficiencyBonusForLevel(16)).toBe(5)
    expect(proficiencyBonusForLevel(17)).toBe(6)
    expect(proficiencyBonusForLevel(20)).toBe(6)
  })
})

describe('maxHpForLevel', () => {
  it('uses the max hit die result at level 1', () => {
    expect(maxHpForLevel('warrior', 1, 2)).toBe(10 + 2)
    expect(maxHpForLevel('expert', 1, 2)).toBe(8 + 2)
    expect(maxHpForLevel('spellcaster', 1, 2)).toBe(6 + 2)
  })

  it('adds the average die roll (rounded up) per level after 1', () => {
    // warrior d10: level 1 = 12, then +8 per level (ceil(11/2)=6, +2 con)
    expect(maxHpForLevel('warrior', 2, 2)).toBe(12 + 8)
    expect(maxHpForLevel('warrior', 3, 2)).toBe(12 + 8 * 2)
  })

  it('applies negative constitution modifiers', () => {
    expect(maxHpForLevel('spellcaster', 1, -1)).toBe(6 - 1)
  })
})

describe('armorClass', () => {
  it('defaults to unarmored AC (10 + dex mod)', () => {
    expect(armorClass(3)).toBe(13)
  })

  it('applies an armor base AC in place of the default 10', () => {
    expect(armorClass(3, 13)).toBe(16)
  })

  it('caps the dex bonus when a dexCap is given (medium/heavy armor)', () => {
    expect(armorClass(4, 13, 2)).toBe(15)
  })

  it('adds +2 for a shield', () => {
    expect(armorClass(2, 10, Infinity, true)).toBe(14)
  })
})
