import { describe, it, expect } from 'vitest'
import { resolveFateRoll, getOddsLabel, ODDS_ORDER, rollRandomEvent } from './fate-chart'

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

  it('roll 11 with chaos 1 triggers random event', () => {
    const result = resolveFateRoll(11, '50/50', 1)
    expect(result.randomEvent).toBe(true)
  })

  it('roll 11 with chaos 0 does not trigger random event', () => {
    const result = resolveFateRoll(11, '50/50', 0)
    expect(result.randomEvent).toBe(false)
  })

  it('roll 99 with chaos 9 triggers random event', () => {
    const result = resolveFateRoll(99, '50/50', 9)
    expect(result.randomEvent).toBe(true)
  })

  it('certain at chaos 9 — roll 1 is exceptional_yes', () => {
    const result = resolveFateRoll(1, 'certain', 9)
    expect(result.result).toBe('exceptional_yes')
  })

  it('certain at chaos 9 — ey threshold is 20', () => {
    expect(resolveFateRoll(20, 'certain', 9).result).toBe('exceptional_yes')
    expect(resolveFateRoll(21, 'certain', 9).result).toBe('yes')
  })

  it('impossible at chaos 1 — no exceptional_yes possible (X=0)', () => {
    const result = resolveFateRoll(1, 'impossible', 1)
    expect(result.result).toBe('yes')
  })

  it('impossible at chaos 1 — everything above yes=1 is no (no=81, so no exceptional_no)', () => {
    expect(resolveFateRoll(2, 'impossible', 1).result).toBe('no')
    expect(resolveFateRoll(81, 'impossible', 1).result).toBe('no')
  })

  it('impossible at chaos 5 — roll 83 is no, roll 84 is exceptional_no', () => {
    expect(resolveFateRoll(83, 'impossible', 5).result).toBe('no')
    expect(resolveFateRoll(84, 'impossible', 5).result).toBe('exceptional_no')
  })

  it('certain at high chaos — no threshold is X(0), so no exceptional_no exists', () => {
    expect(resolveFateRoll(100, 'certain', 7).result).toBe('no')
    expect(resolveFateRoll(100, 'certain', 8).result).toBe('no')
    expect(resolveFateRoll(100, 'certain', 9).result).toBe('no')
  })

  it('all odds levels produce valid results for chaos 5', () => {
    for (const odds of ODDS_ORDER) {
      const result = resolveFateRoll(50, odds, 5)
      expect(['exceptional_yes', 'yes', 'no', 'exceptional_no']).toContain(result.result)
    }
  })

  it('roll 100 always produces no or exceptional_no', () => {
    for (const odds of ODDS_ORDER) {
      for (let cf = 1; cf <= 9; cf++) {
        const result = resolveFateRoll(100, odds, cf)
        expect(['no', 'exceptional_no']).toContain(result.result)
      }
    }
  })

  it('roll 1 always produces exceptional_yes or yes', () => {
    for (const odds of ODDS_ORDER) {
      for (let cf = 1; cf <= 9; cf++) {
        const result = resolveFateRoll(1, odds, cf)
        expect(['exceptional_yes', 'yes']).toContain(result.result)
      }
    }
  })

  it('higher chaos factor shifts results toward yes', () => {
    const cf1 = resolveFateRoll(50, '50/50', 1)
    const cf9 = resolveFateRoll(50, '50/50', 9)
    const order = ['exceptional_no', 'no', 'yes', 'exceptional_yes']
    expect(order.indexOf(cf9.result)).toBeGreaterThanOrEqual(order.indexOf(cf1.result))
  })
})

describe('getOddsLabel', () => {
  it('returns human-readable labels', () => {
    expect(getOddsLabel('50/50')).toBe('50/50')
    expect(getOddsLabel('certain')).toBe('Certain')
    expect(getOddsLabel('impossible')).toBe('Impossible')
    expect(getOddsLabel('nearly_certain')).toBe('Nearly Certain')
    expect(getOddsLabel('very_unlikely')).toBe('Very Unlikely')
  })
})

describe('ODDS_ORDER', () => {
  it('has 9 levels from impossible to certain', () => {
    expect(ODDS_ORDER).toHaveLength(9)
    expect(ODDS_ORDER[0]).toBe('impossible')
    expect(ODDS_ORDER[8]).toBe('certain')
  })
})

describe('rollRandomEvent', () => {
  it('returns focus, action and subject', () => {
    const event = rollRandomEvent()
    expect(event.focus).toBeTruthy()
    expect(event.action).toContain(' / ')
    expect(event.subject).toContain(' / ')
  })

  it('focus is from the event focus table', () => {
    const validFoci = [
      'Remote Event', 'Ambiguous Event', 'New NPC', 'NPC Action',
      'NPC Negative', 'NPC Positive', 'Move Toward Thread',
      'Move Away From Thread', 'Close Thread', 'PC Negative',
      'PC Positive', 'Current Context',
    ]
    for (let i = 0; i < 20; i++) {
      const event = rollRandomEvent()
      expect(validFoci).toContain(event.focus)
    }
  })
})
