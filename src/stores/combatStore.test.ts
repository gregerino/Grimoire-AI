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
    useCombatStore.getState().rollDeathSave(1)
    expect(useCombatStore.getState().deathSaves.failures).toBe(2)
  })

  it('death save roll 10 = success', () => {
    useCombatStore.getState().startCombat(enemies, player)
    const outcome = useCombatStore.getState().rollDeathSave(10)
    expect(outcome).toBe('success')
    expect(useCombatStore.getState().deathSaves.successes).toBe(1)
  })

  it('death save roll 9 = failure', () => {
    useCombatStore.getState().startCombat(enemies, player)
    const outcome = useCombatStore.getState().rollDeathSave(9)
    expect(outcome).toBe('failure')
    expect(useCombatStore.getState().deathSaves.failures).toBe(1)
  })

  it('nat 20 revives with 1 HP and resets death saves', () => {
    useCombatStore.getState().startCombat(enemies, player)
    useCombatStore.getState().applyDamage('player', 30)
    const p1 = useCombatStore.getState().initiativeOrder.find((c) => c.id === 'player')
    expect(p1?.hp.current).toBe(0)

    useCombatStore.getState().rollDeathSave(20)
    const saves = useCombatStore.getState().deathSaves
    expect(saves.successes).toBe(0)
    expect(saves.failures).toBe(0)

    const p2 = useCombatStore.getState().initiativeOrder.find((c) => c.id === 'player')
    expect(p2?.hp.current).toBe(1)
  })

  it('nat 1 after 1 failure = dead (2+1=3)', () => {
    useCombatStore.getState().startCombat(enemies, player)
    useCombatStore.getState().rollDeathSave(5)
    expect(useCombatStore.getState().deathSaves.failures).toBe(1)
    const outcome = useCombatStore.getState().rollDeathSave(1)
    expect(outcome).toBe('dead')
    expect(useCombatStore.getState().deathSaves.failures).toBe(3)
  })

  it('damage to 0 HP adds unconscious condition', () => {
    useCombatStore.getState().startCombat(enemies, player)
    useCombatStore.getState().applyDamage('player', 30)
    const p = useCombatStore.getState().initiativeOrder.find((c) => c.id === 'player')
    expect(p?.conditions).toContain('unconscious')
  })

  it('healing from 0 HP removes unconscious and resets death saves', () => {
    useCombatStore.getState().startCombat(enemies, player)
    useCombatStore.getState().applyDamage('player', 30)
    useCombatStore.getState().rollDeathSave(12)
    useCombatStore.getState().applyHealing('player', 5)

    const p = useCombatStore.getState().initiativeOrder.find((c) => c.id === 'player')
    expect(p?.conditions).not.toContain('unconscious')
    expect(p?.hp.current).toBe(5)
    expect(useCombatStore.getState().deathSaves).toEqual({ successes: 0, failures: 0 })
  })

  it('damage of 0 or negative does nothing', () => {
    useCombatStore.getState().startCombat(enemies, player)
    useCombatStore.getState().applyDamage('player', 0)
    useCombatStore.getState().applyDamage('player', -5)
    const p = useCombatStore.getState().initiativeOrder.find((c) => c.id === 'player')
    expect(p?.hp.current).toBe(30)
  })

  it('healing of 0 or negative does nothing', () => {
    useCombatStore.getState().startCombat(enemies, player)
    useCombatStore.getState().applyDamage('player', 10)
    useCombatStore.getState().applyHealing('player', 0)
    useCombatStore.getState().applyHealing('player', -5)
    const p = useCombatStore.getState().initiativeOrder.find((c) => c.id === 'player')
    expect(p?.hp.current).toBe(20)
  })

  it('does not add duplicate conditions', () => {
    useCombatStore.getState().startCombat(enemies, player)
    useCombatStore.getState().addCondition('player', 'poisoned')
    useCombatStore.getState().addCondition('player', 'poisoned')
    const p = useCombatStore.getState().initiativeOrder.find((c) => c.id === 'player')
    expect(p?.conditions.filter((c) => c === 'poisoned')).toHaveLength(1)
  })

  it('handles duplicate enemy names with distinct IDs', () => {
    const dupeEnemies = [
      { name: 'Goblin', initiative: 10, hp: { current: 7, max: 7 }, ac: 13 },
      { name: 'Goblin', initiative: 8, hp: { current: 7, max: 7 }, ac: 13 },
    ]
    useCombatStore.getState().startCombat(dupeEnemies, player)
    const order = useCombatStore.getState().initiativeOrder
    const goblinIds = order.filter((c) => c.name === 'Goblin').map((c) => c.id)
    expect(new Set(goblinIds).size).toBe(2)
  })

  it('initiative tie: player goes before enemy', () => {
    const tiedEnemy = [
      { name: 'Skeleton', initiative: 15, hp: { current: 13, max: 13 }, ac: 13 },
    ]
    useCombatStore.getState().startCombat(tiedEnemy, player)
    const order = useCombatStore.getState().initiativeOrder
    expect(order[0].isPlayer).toBe(true)
    expect(order[1].name).toBe('Skeleton')
  })

  it('getCurrent returns the combatant whose turn it is', () => {
    useCombatStore.getState().startCombat(enemies, player)
    const current = useCombatStore.getState().getCurrent()
    expect(current).not.toBeNull()
    expect(current?.name).toBe('Wolf')
  })

  it('getCurrent returns null when no combat', () => {
    expect(useCombatStore.getState().getCurrent()).toBeNull()
  })

  it('nextTurn does nothing when no combatants', () => {
    useCombatStore.getState().nextTurn()
    expect(useCombatStore.getState().currentTurnIndex).toBe(0)
    expect(useCombatStore.getState().round).toBe(1)
  })
})
