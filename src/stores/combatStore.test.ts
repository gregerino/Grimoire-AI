import { describe, it, expect, beforeEach } from 'vitest'
import { useCombatStore } from './combatStore'

const player = { name: 'Thorn', initiative: 15, hp: { current: 30, max: 30 }, ac: 16 }
const enemies = [
  { name: 'Goblin', initiative: 12, hp: { current: 7, max: 7 }, ac: 13 },
  { name: 'Wolf', initiative: 18, hp: { current: 11, max: 11 }, ac: 12 },
]

describe('combatStore', () => {
  beforeEach(() => {
    useCombatStore.getState().endCombat()
  })

  it('starts combat with sorted initiative order', () => {
    useCombatStore.getState().startCombat(enemies, player)
    const state = useCombatStore.getState()
    expect(state.inCombat).toBe(true)
    expect(state.round).toBe(1)
    expect(state.initiativeOrder[0].name).toBe('Wolf')
    expect(state.initiativeOrder[1].name).toBe('Thorn')
    expect(state.initiativeOrder[2].name).toBe('Goblin')
  })

  it('advances turns and rounds', () => {
    useCombatStore.getState().startCombat(enemies, player)
    useCombatStore.getState().nextTurn()
    expect(useCombatStore.getState().currentTurnIndex).toBe(1)
    useCombatStore.getState().nextTurn()
    expect(useCombatStore.getState().currentTurnIndex).toBe(2)
    useCombatStore.getState().nextTurn()
    expect(useCombatStore.getState().currentTurnIndex).toBe(0)
    expect(useCombatStore.getState().round).toBe(2)
  })

  it('applies damage correctly', () => {
    useCombatStore.getState().startCombat(enemies, player)
    useCombatStore.getState().applyDamage('player', 10)
    const p = useCombatStore.getState().initiativeOrder.find((c) => c.id === 'player')
    expect(p?.hp.current).toBe(20)
  })

  it('does not allow hp below 0', () => {
    useCombatStore.getState().startCombat(enemies, player)
    useCombatStore.getState().applyDamage('player', 999)
    const p = useCombatStore.getState().initiativeOrder.find((c) => c.id === 'player')
    expect(p?.hp.current).toBe(0)
  })

  it('applies healing without exceeding max', () => {
    useCombatStore.getState().startCombat(enemies, player)
    useCombatStore.getState().applyDamage('player', 15)
    useCombatStore.getState().applyHealing('player', 999)
    const p = useCombatStore.getState().initiativeOrder.find((c) => c.id === 'player')
    expect(p?.hp.current).toBe(30)
  })

  it('adds and removes conditions', () => {
    useCombatStore.getState().startCombat(enemies, player)
    useCombatStore.getState().addCondition('player', 'poisoned')
    let p = useCombatStore.getState().initiativeOrder.find((c) => c.id === 'player')
    expect(p?.conditions).toContain('poisoned')
    useCombatStore.getState().removeCondition('player', 'poisoned')
    p = useCombatStore.getState().initiativeOrder.find((c) => c.id === 'player')
    expect(p?.conditions).not.toContain('poisoned')
  })

  it('ends combat and resets state', () => {
    useCombatStore.getState().startCombat(enemies, player)
    useCombatStore.getState().endCombat()
    const state = useCombatStore.getState()
    expect(state.inCombat).toBe(false)
    expect(state.initiativeOrder).toHaveLength(0)
  })

  it('handles death saves — 3 failures = death', () => {
    useCombatStore.getState().startCombat(enemies, player)
    useCombatStore.getState().rollDeathSave(5)
    useCombatStore.getState().rollDeathSave(8)
    const outcome = useCombatStore.getState().rollDeathSave(3)
    expect(outcome).toBe('dead')
  })

  it('handles death saves — 3 successes = stabilized', () => {
    useCombatStore.getState().startCombat(enemies, player)
    useCombatStore.getState().rollDeathSave(12)
    useCombatStore.getState().rollDeathSave(15)
    const outcome = useCombatStore.getState().rollDeathSave(10)
    expect(outcome).toBe('stabilized')
  })

  it('handles nat 20 death save = revive', () => {
    useCombatStore.getState().startCombat(enemies, player)
    const outcome = useCombatStore.getState().rollDeathSave(20)
    expect(outcome).toBe('revived')
  })

  it('handles nat 1 death save = 2 failures', () => {
    useCombatStore.getState().startCombat(enemies, player)
    const outcome = useCombatStore.getState().rollDeathSave(1)
    expect(useCombatStore.getState().deathSaves.failures).toBe(2)
  })
})
