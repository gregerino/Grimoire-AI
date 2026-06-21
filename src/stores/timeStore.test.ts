import { describe, it, expect } from 'vitest'
import { getWorldTime } from './timeStore'

describe('getWorldTime / resolveTimeOfDay', () => {
  it('dawn: 5-6', () => {
    expect(getWorldTime(1, 5).timeOfDay).toBe('dawn')
    expect(getWorldTime(1, 6).timeOfDay).toBe('dawn')
  })

  it('morning: 7-9', () => {
    expect(getWorldTime(1, 7).timeOfDay).toBe('morning')
    expect(getWorldTime(1, 9).timeOfDay).toBe('morning')
  })

  it('midday: 10-13', () => {
    expect(getWorldTime(1, 10).timeOfDay).toBe('midday')
    expect(getWorldTime(1, 13).timeOfDay).toBe('midday')
  })

  it('afternoon: 14-16', () => {
    expect(getWorldTime(1, 14).timeOfDay).toBe('afternoon')
    expect(getWorldTime(1, 16).timeOfDay).toBe('afternoon')
  })

  it('dusk: 17-18', () => {
    expect(getWorldTime(1, 17).timeOfDay).toBe('dusk')
    expect(getWorldTime(1, 18).timeOfDay).toBe('dusk')
  })

  it('evening: 19-20', () => {
    expect(getWorldTime(1, 19).timeOfDay).toBe('evening')
    expect(getWorldTime(1, 20).timeOfDay).toBe('evening')
  })

  it('night: 21-23 and 0', () => {
    expect(getWorldTime(1, 21).timeOfDay).toBe('night')
    expect(getWorldTime(1, 23).timeOfDay).toBe('night')
    expect(getWorldTime(1, 0).timeOfDay).toBe('night')
  })

  it('midnight: 1-4', () => {
    expect(getWorldTime(1, 1).timeOfDay).toBe('midnight')
    expect(getWorldTime(1, 4).timeOfDay).toBe('midnight')
  })

  it('preserves day and hour in output', () => {
    const wt = getWorldTime(42, 15)
    expect(wt.day).toBe(42)
    expect(wt.hour).toBe(15)
    expect(wt.timeOfDay).toBe('afternoon')
  })
})
