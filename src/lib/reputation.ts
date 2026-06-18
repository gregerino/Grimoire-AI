import type { ReputationTier } from '@/types/database'

export function getReputationTier(score: number): ReputationTier {
  if (score <= 10) return 'enemy'
  if (score <= 25) return 'unfriendly'
  if (score <= 50) return 'neutral'
  if (score <= 70) return 'friendly'
  if (score <= 90) return 'honored'
  return 'exalted'
}

export function getReputationColor(tier: ReputationTier): string {
  const colors: Record<ReputationTier, string> = {
    enemy: 'text-red-500',
    unfriendly: 'text-orange-400',
    neutral: 'text-gray-400',
    friendly: 'text-green-400',
    honored: 'text-blue-400',
    exalted: 'text-purple-400',
  }
  return colors[tier]
}

export function getReputationLabel(tier: ReputationTier): string {
  const labels: Record<ReputationTier, string> = {
    enemy: 'Enemy',
    unfriendly: 'Unfriendly',
    neutral: 'Neutral',
    friendly: 'Friendly',
    honored: 'Honored',
    exalted: 'Exalted',
  }
  return labels[tier]
}
