import { describe, it, expect } from 'vitest'
import { getReputationTier, getReputationColor, getReputationLabel } from './reputation'

describe('getReputationTier', () => {
  it('returns enemy for score ≤ 10', () => {
    expect(getReputationTier(0)).toBe('enemy')
    expect(getReputationTier(10)).toBe('enemy')
  })

  it('returns unfriendly for 11-25', () => {
    expect(getReputationTier(11)).toBe('unfriendly')
    expect(getReputationTier(25)).toBe('unfriendly')
  })

  it('returns neutral for 26-50', () => {
    expect(getReputationTier(26)).toBe('neutral')
    expect(getReputationTier(50)).toBe('neutral')
  })

  it('returns friendly for 51-70', () => {
    expect(getReputationTier(51)).toBe('friendly')
    expect(getReputationTier(70)).toBe('friendly')
  })

  it('returns honored for 71-90', () => {
    expect(getReputationTier(71)).toBe('honored')
    expect(getReputationTier(90)).toBe('honored')
  })

  it('returns exalted for 91+', () => {
    expect(getReputationTier(91)).toBe('exalted')
    expect(getReputationTier(100)).toBe('exalted')
  })

  it('handles negative scores as enemy', () => {
    expect(getReputationTier(-5)).toBe('enemy')
  })
})

describe('getReputationColor', () => {
  it('returns a tailwind class for each tier', () => {
    const tiers = ['enemy', 'unfriendly', 'neutral', 'friendly', 'honored', 'exalted'] as const
    for (const tier of tiers) {
      expect(getReputationColor(tier)).toMatch(/^text-/)
    }
  })
})

describe('getReputationLabel', () => {
  it('returns capitalized label for each tier', () => {
    expect(getReputationLabel('enemy')).toBe('Enemy')
    expect(getReputationLabel('exalted')).toBe('Exalted')
    expect(getReputationLabel('neutral')).toBe('Neutral')
  })
})
