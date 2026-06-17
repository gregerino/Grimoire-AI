export type Condition =
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'exhaustion'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious'
  | 'concentrating'

export interface Combatant {
  id: string
  name: string
  initiative: number
  hp: { current: number; max: number }
  ac: number
  isPlayer: boolean
  conditions: Condition[]
}

export interface DeathSaves {
  successes: number
  failures: number
}

export type DeathSaveOutcome = 'success' | 'failure' | 'stabilized' | 'dead' | 'revived'

export interface CombatGameState {
  combatStart?: {
    enemies: Array<{
      name: string
      initiative: number
      hp: { current: number; max: number }
      ac: number
      conditions?: Condition[]
    }>
    playerInitiative?: number
  }
  combatEnd?: boolean
  combatDamage?: Array<{ target: string; amount: number; type?: string }>
  combatHealing?: Array<{ target: string; amount: number }>
  conditionsApplied?: Array<{ target: string; condition: Condition }>
  conditionsRemoved?: Array<{ target: string; condition: Condition }>
  spellSlotUsed?: { level: number }
  deathSaveResult?: { roll: number }
  restType?: 'short' | 'long'
  hitDiceUsed?: number
}

export const CLASS_HIT_DICE: Record<string, number> = {
  barbarian: 12,
  fighter: 10,
  paladin: 10,
  ranger: 10,
  bard: 8,
  cleric: 8,
  druid: 8,
  monk: 8,
  rogue: 8,
  warlock: 8,
  sorcerer: 6,
  wizard: 6,
  artificer: 8,
  'blood hunter': 10,
}
