import { describe, it, expect } from 'vitest'
import { CONDITION_DATA, CONDITION_LIST, type ConditionInfo } from './conditions'

describe('CONDITION_DATA', () => {
  it('contains at least 15 conditions', () => {
    expect(CONDITION_LIST.length).toBeGreaterThanOrEqual(15)
  })

  it('each condition has required fields', () => {
    for (const [, info] of Object.entries(CONDITION_DATA) as [string, ConditionInfo][]) {
      expect(info.description).toBeTruthy()
      expect(info.color).toBeTruthy()
      expect(info.icon).toBeTruthy()
      expect(info.effects.length).toBeGreaterThan(0)
    }
  })

  it('CONDITION_LIST matches CONDITION_DATA keys', () => {
    expect(CONDITION_LIST.sort()).toEqual(Object.keys(CONDITION_DATA).sort())
  })
})
