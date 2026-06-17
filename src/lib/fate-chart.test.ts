import { describe, it, expect } from 'vitest'
import { resolveFateRoll } from './fate-chart'

describe('resolveFateRoll', () => {
  it('returns exceptional_yes for very low rolls on high odds', () => {
    const result = resolveFateRoll(5, 'certain', 5)
    expect(result.result).toBe('exceptional_yes')
  })

  it('returns yes for rolls within yes threshold', () => {
    const result = resolveFateRoll(50, '50/50', 5)
    expect(result.result).toBe('yes')
  })

  it('returns no for rolls above yes but within no threshold', () => {
    const result = resolveFateRoll(80, '50/50', 5)
    expect(result.result).toBe('no')
  })

  it('returns exceptional_no for rolls above the no threshold', () => {
    const result = resolveFateRoll(95, '50/50', 5)
    expect(result.result).toBe('exceptional_no')
  })

  it('impossible odds at low chaos returns no for most rolls', () => {
    const result = resolveFateRoll(50, 'impossible', 1)
    expect(result.result).toBe('no')
  })

  it('detects random event on doubles within chaos factor', () => {
    const result = resolveFateRoll(33, '50/50', 5)
    expect(result.randomEvent).toBe(true)
  })

  it('no random event on doubles above chaos factor', () => {
    const result = resolveFateRoll(88, '50/50', 3)
    expect(result.randomEvent).toBe(false)
  })

  it('no random event on non-doubles', () => {
    const result = resolveFateRoll(34, '50/50', 5)
    expect(result.randomEvent).toBe(false)
  })

  it('preserves roll metadata', () => {
    const result = resolveFateRoll(42, 'likely', 7)
    expect(result.roll).toBe(42)
    expect(result.odds).toBe('likely')
    expect(result.chaosFactor).toBe(7)
  })

  it('handles chaos factor boundary (1 and 9)', () => {
    const cf1 = resolveFateRoll(50, '50/50', 1)
    const cf9 = resolveFateRoll(50, '50/50', 9)
    expect(cf1.result).toBe('no')
    expect(cf9.result).toBe('yes')
  })
})
