import type { Condition } from '@/types/combat'

export interface ConditionInfo {
  description: string
  effects: string[]
  icon: string
  color: string
}

export const CONDITION_DATA: Record<Condition, ConditionInfo> = {
  blinded: {
    description: "A blinded creature can't see and automatically fails any ability check that requires sight.",
    effects: [
      'Auto-fails checks requiring sight',
      'Attack rolls have disadvantage',
      'Attacks against have advantage',
    ],
    icon: 'eye-off',
    color: 'text-gray-400 bg-gray-400/15',
  },
  charmed: {
    description: "A charmed creature can't attack or target the charmer with harmful effects.",
    effects: [
      "Can't attack or target the charmer",
      'Charmer has advantage on social checks',
    ],
    icon: 'heart',
    color: 'text-pink-400 bg-pink-400/15',
  },
  deafened: {
    description: "A deafened creature can't hear and automatically fails any ability check that requires hearing.",
    effects: [
      'Auto-fails checks requiring hearing',
    ],
    icon: 'ear-off',
    color: 'text-gray-400 bg-gray-400/15',
  },
  exhaustion: {
    description: 'Exhaustion levels stack, imposing increasing penalties.',
    effects: [
      'Levels 1-5: -2 per level on d20 rolls',
      'Level 6: speed reduced to 0',
      'Level 10: death',
    ],
    icon: 'battery-low',
    color: 'text-amber-400 bg-amber-400/15',
  },
  frightened: {
    description: 'A frightened creature has disadvantage on ability checks and attack rolls while the source is in sight.',
    effects: [
      'Disadvantage on checks and attacks while source is visible',
      "Can't willingly move closer to source",
    ],
    icon: 'ghost',
    color: 'text-purple-400 bg-purple-400/15',
  },
  grappled: {
    description: "A grappled creature's speed becomes 0.",
    effects: [
      'Speed becomes 0',
      "Can't benefit from speed bonuses",
      'Ends if grappler is incapacitated or moved out of reach',
    ],
    icon: 'grab',
    color: 'text-orange-400 bg-orange-400/15',
  },
  incapacitated: {
    description: "An incapacitated creature can't take actions or reactions.",
    effects: [
      "Can't take actions or reactions",
    ],
    icon: 'circle-slash',
    color: 'text-red-400 bg-red-400/15',
  },
  invisible: {
    description: "An invisible creature is impossible to see without magic or a special sense.",
    effects: [
      'Attacks against have disadvantage',
      'Attack rolls have advantage',
    ],
    icon: 'eye',
    color: 'text-blue-300 bg-blue-300/15',
  },
  paralyzed: {
    description: 'A paralyzed creature is incapacitated and automatically fails STR and DEX saves.',
    effects: [
      'Incapacitated, speed 0',
      'Auto-fails STR and DEX saves',
      'Attacks against have advantage',
      'Melee hits are critical hits',
    ],
    icon: 'zap-off',
    color: 'text-yellow-400 bg-yellow-400/15',
  },
  petrified: {
    description: 'A petrified creature is transformed into a solid inanimate substance.',
    effects: [
      'Weight increases ×10',
      'Incapacitated, speed 0',
      'Resistance to all damage',
      'Auto-fails STR and DEX saves',
      'Immune to poison and disease',
    ],
    icon: 'mountain',
    color: 'text-stone-400 bg-stone-400/15',
  },
  poisoned: {
    description: 'A poisoned creature has disadvantage on attack rolls and ability checks.',
    effects: [
      'Disadvantage on attack rolls',
      'Disadvantage on ability checks',
    ],
    icon: 'flask-round',
    color: 'text-green-400 bg-green-400/15',
  },
  prone: {
    description: 'A prone creature can only crawl and has disadvantage on attack rolls.',
    effects: [
      'Can only crawl (half speed)',
      'Disadvantage on attack rolls',
      'Melee attacks against have advantage',
      'Ranged attacks against have disadvantage',
    ],
    icon: 'arrow-down-to-line',
    color: 'text-amber-300 bg-amber-300/15',
  },
  restrained: {
    description: "A restrained creature's speed becomes 0.",
    effects: [
      'Speed becomes 0',
      'Attacks against have advantage',
      'Attack rolls have disadvantage',
      'Disadvantage on DEX saves',
    ],
    icon: 'link',
    color: 'text-orange-400 bg-orange-400/15',
  },
  stunned: {
    description: 'A stunned creature is incapacitated and automatically fails STR and DEX saves.',
    effects: [
      'Incapacitated, speed 0',
      'Auto-fails STR and DEX saves',
      'Attacks against have advantage',
    ],
    icon: 'sparkles',
    color: 'text-yellow-300 bg-yellow-300/15',
  },
  unconscious: {
    description: 'An unconscious creature is incapacitated, drops what it holds, and falls prone.',
    effects: [
      'Incapacitated, drops held items, falls prone',
      'Auto-fails STR and DEX saves',
      'Attacks against have advantage',
      'Melee hits are critical hits',
    ],
    icon: 'moon',
    color: 'text-indigo-400 bg-indigo-400/15',
  },
  concentrating: {
    description: 'Maintaining concentration on a spell. Taking damage requires a CON save.',
    effects: [
      'CON save on damage (DC 10 or half damage, whichever is higher)',
      'Lost if incapacitated or killed',
      'Only one concentration spell at a time',
    ],
    icon: 'focus',
    color: 'text-cyan-400 bg-cyan-400/15',
  },
}

export const CONDITION_LIST = Object.keys(CONDITION_DATA) as Condition[]
