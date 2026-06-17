import { create } from 'zustand'
import type { Combatant, Condition, DeathSaves, DeathSaveOutcome } from '@/types/combat'

interface CombatState {
  inCombat: boolean
  round: number
  initiativeOrder: Combatant[]
  currentTurnIndex: number
  deathSaves: DeathSaves

  startCombat: (
    enemies: Array<{
      name: string
      initiative: number
      hp: { current: number; max: number }
      ac: number
      conditions?: Condition[]
    }>,
    player: {
      name: string
      initiative: number
      hp: { current: number; max: number }
      ac: number
      conditions?: Condition[]
    },
  ) => void
  endCombat: () => void
  nextTurn: () => void
  applyDamage: (targetId: string, amount: number) => void
  applyHealing: (targetId: string, amount: number) => void
  addCondition: (targetId: string, condition: Condition) => void
  removeCondition: (targetId: string, condition: Condition) => void
  rollDeathSave: (roll: number) => DeathSaveOutcome
  getCurrent: () => Combatant | null
}

function buildEnemyId(name: string, index: number, allNames: string[]): string {
  const count = allNames.filter((n) => n === name).length
  return count > 1 ? `enemy-${name}-${index}` : `enemy-${name}-0`
}

export const useCombatStore = create<CombatState>((set, get) => ({
  inCombat: false,
  round: 1,
  initiativeOrder: [],
  currentTurnIndex: 0,
  deathSaves: { successes: 0, failures: 0 },

  startCombat: (enemies, player) => {
    const allEnemyNames = enemies.map((e) => e.name)
    const combatants: Combatant[] = [
      {
        id: 'player',
        name: player.name,
        initiative: player.initiative,
        hp: { ...player.hp },
        ac: player.ac,
        isPlayer: true,
        conditions: player.conditions ?? [],
      },
      ...enemies.map((e, i) => ({
        id: buildEnemyId(e.name, i, allEnemyNames),
        name: e.name,
        initiative: e.initiative,
        hp: { ...e.hp },
        ac: e.ac,
        isPlayer: false,
        conditions: e.conditions ?? [],
      })),
    ]

    combatants.sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative
      return a.isPlayer ? -1 : 1
    })

    set({
      inCombat: true,
      round: 1,
      initiativeOrder: combatants,
      currentTurnIndex: 0,
      deathSaves: { successes: 0, failures: 0 },
    })
  },

  endCombat: () => {
    set({
      inCombat: false,
      round: 1,
      initiativeOrder: [],
      currentTurnIndex: 0,
      deathSaves: { successes: 0, failures: 0 },
    })
  },

  nextTurn: () => {
    const { initiativeOrder, currentTurnIndex, round } = get()
    if (initiativeOrder.length === 0) return

    const nextIndex = currentTurnIndex + 1
    if (nextIndex >= initiativeOrder.length) {
      set({ currentTurnIndex: 0, round: round + 1 })
    } else {
      set({ currentTurnIndex: nextIndex })
    }
  },

  applyDamage: (targetId, amount) => {
    if (amount <= 0) return
    set((state) => {
      const order = state.initiativeOrder.map((c) => {
        if (c.id !== targetId) return c

        const newHp = Math.max(0, c.hp.current - amount)
        const wasAboveZero = c.hp.current > 0
        const conditions = [...c.conditions]

        if (newHp === 0 && wasAboveZero && c.isPlayer) {
          if (!conditions.includes('unconscious')) conditions.push('unconscious')
        }

        return { ...c, hp: { ...c.hp, current: newHp }, conditions }
      })

      const player = order.find((c) => c.id === targetId && c.isPlayer)
      const deathSaves = { ...state.deathSaves }

      if (player && player.hp.current === 0 && !state.deathSaves.successes && !state.deathSaves.failures) {
        // Fresh unconscious — death saves start clean (already zeroed)
      } else if (player && player.hp.current === 0 && amount > 0) {
        deathSaves.failures = Math.min(3, deathSaves.failures + 1)
      }

      return { initiativeOrder: order, deathSaves }
    })
  },

  applyHealing: (targetId, amount) => {
    if (amount <= 0) return
    set((state) => {
      const order = state.initiativeOrder.map((c) => {
        if (c.id !== targetId) return c

        const wasAtZero = c.hp.current === 0
        const newHp = Math.min(c.hp.max, c.hp.current + amount)
        let conditions = [...c.conditions]

        if (wasAtZero && newHp > 0) {
          conditions = conditions.filter((cond) => cond !== 'unconscious')
        }

        return { ...c, hp: { ...c.hp, current: newHp }, conditions }
      })

      const target = order.find((c) => c.id === targetId)
      const deathSaves =
        target?.isPlayer && target.hp.current > 0
          ? { successes: 0, failures: 0 }
          : state.deathSaves

      return { initiativeOrder: order, deathSaves }
    })
  },

  addCondition: (targetId, condition) => {
    set((state) => ({
      initiativeOrder: state.initiativeOrder.map((c) => {
        if (c.id !== targetId) return c
        if (c.conditions.includes(condition)) return c
        return { ...c, conditions: [...c.conditions, condition] }
      }),
    }))
  },

  removeCondition: (targetId, condition) => {
    set((state) => ({
      initiativeOrder: state.initiativeOrder.map((c) => {
        if (c.id !== targetId) return c
        return { ...c, conditions: c.conditions.filter((cond) => cond !== condition) }
      }),
    }))
  },

  rollDeathSave: (roll: number): DeathSaveOutcome => {
    const state = get()
    const saves = { ...state.deathSaves }

    if (roll === 20) {
      set({ deathSaves: { successes: 0, failures: 0 } })
      const store = get()
      store.applyHealing('player', 1)
      return 'revived'
    }

    if (roll === 1) {
      saves.failures = Math.min(3, saves.failures + 2)
    } else if (roll >= 10) {
      saves.successes = Math.min(3, saves.successes + 1)
    } else {
      saves.failures = Math.min(3, saves.failures + 1)
    }

    set({ deathSaves: saves })

    if (saves.failures >= 3) return 'dead'
    if (saves.successes >= 3) return 'stabilized'
    return roll >= 10 ? 'success' : 'failure'
  },

  getCurrent: () => {
    const { initiativeOrder, currentTurnIndex } = get()
    return initiativeOrder[currentTurnIndex] ?? null
  },
}))
