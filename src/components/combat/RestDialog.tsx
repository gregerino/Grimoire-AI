import { useState } from 'react'
import { Moon, Sun, Dices, X } from 'lucide-react'
import { performRest } from '@/lib/api'
import { CLASS_HIT_DICE } from '@/types/combat'

interface CharacterData {
  class: string
  level: number
  hp: { current: number; max: number }
  stats: Record<string, number>
  hitDice?: { current: number; max: number } | string
  spellSlots?: Record<number, { used: number; max: number }>
}

interface Props {
  campaignId: string
  character: CharacterData
  onClose: () => void
  onComplete: () => void
}

export function RestDialog({ campaignId, character, onClose, onComplete }: Props) {
  const [restType, setRestType] = useState<'short' | 'long'>('short')
  const [hitDiceCount, setHitDiceCount] = useState(1)
  const [resting, setResting] = useState(false)
  const [result, setResult] = useState<{ hpHealed: number; hitDiceRemaining: number } | null>(null)

  const conMod = Math.floor(((character.stats.CON ?? 10) - 10) / 2)
  const className = character.class.toLowerCase().split(' ')[0]
  const hitDieSize = CLASS_HIT_DICE[className] ?? 8
  const rawHitDice = character.hitDice
  const hitDice: { current: number; max: number } =
    rawHitDice && typeof rawHitDice === 'object' && 'current' in rawHitDice && 'max' in rawHitDice
      ? rawHitDice as { current: number; max: number }
      : { current: character.level, max: character.level }
  const maxDice = hitDice.current

  const avgHealPerDie = Math.max(1, Math.floor(hitDieSize / 2) + 1 + conMod)
  const estimatedHeal = Math.min(
    character.hp.max - character.hp.current,
    avgHealPerDie * hitDiceCount,
  )

  const spellSlotsUsed = character.spellSlots
    ? Object.values(character.spellSlots).reduce((sum, s) => sum + s.used, 0)
    : 0

  const handleRest = async () => {
    setResting(true)
    try {
      const res = await performRest(
        campaignId,
        restType,
        restType === 'short' ? hitDiceCount : undefined,
      )
      setResult({ hpHealed: res.hpHealed, hitDiceRemaining: res.hitDiceRemaining })
      setTimeout(() => {
        onComplete()
        onClose()
      }, 1500)
    } catch {
      setResting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-xl border border-navy bg-dark-navy p-5 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-parchment">Take a Rest</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-600 hover:bg-navy hover:text-gray-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Rest Type Toggle */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setRestType('short')}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all ${
              restType === 'short'
                ? 'border-gold/50 bg-gold/10 text-gold'
                : 'border-navy text-gray-500 hover:border-gray-600'
            }`}
          >
            <Sun className="h-4 w-4" />
            Short Rest
          </button>
          <button
            onClick={() => setRestType('long')}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all ${
              restType === 'long'
                ? 'border-blue-400/50 bg-blue-400/10 text-blue-400'
                : 'border-navy text-gray-500 hover:border-gray-600'
            }`}
          >
            <Moon className="h-4 w-4" />
            Long Rest
          </button>
        </div>

        {result ? (
          <div className="rounded-lg bg-green-500/10 p-4 text-center">
            <p className="text-sm font-bold text-green-400">
              {restType === 'long' ? 'Fully Rested!' : `Healed ${result.hpHealed} HP`}
            </p>
            <p className="mt-1 text-[10px] text-gray-500">
              {result.hitDiceRemaining} hit dice remaining
            </p>
          </div>
        ) : restType === 'short' ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-navy bg-navy/30 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Dices className="h-3.5 w-3.5 text-gold" />
                <span className="text-xs text-gray-400">
                  Hit Dice (d{hitDieSize} + {conMod >= 0 ? '+' : ''}{conMod} CON)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-600">Available: {maxDice}/{hitDice.max}</span>
                <input
                  type="range"
                  min={0}
                  max={maxDice}
                  value={hitDiceCount}
                  onChange={(e) => setHitDiceCount(Number(e.target.value))}
                  className="flex-1 accent-gold"
                />
                <span className="w-6 text-center text-sm font-bold text-parchment">
                  {hitDiceCount}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-navy bg-navy/30 px-3 py-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-600">
                Est. Healing
              </span>
              <span className="text-sm font-bold text-green-400">~{estimatedHeal} HP</span>
            </div>

            <p className="text-[10px] text-gray-600">
              Spend hit dice to recover HP. You regain half your hit dice on a long rest.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg border border-navy bg-navy/30 p-3 text-xs text-gray-400">
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">+</span>
                  Restore all HP ({character.hp.max} HP)
                </li>
                {spellSlotsUsed > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">+</span>
                    Restore all spell slots ({spellSlotsUsed} used)
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <span className="text-gold">+</span>
                  Recover {Math.max(1, Math.floor(hitDice.max / 2))} hit dice
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">-</span>
                  Remove 1 exhaustion level
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Actions */}
        {!result && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-navy px-3 py-2 text-xs text-gray-500 hover:bg-navy transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRest}
              disabled={resting || (restType === 'short' && hitDiceCount === 0)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-30 ${
                restType === 'short'
                  ? 'bg-gold/20 border border-gold/30 text-gold hover:bg-gold/30'
                  : 'bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30'
              }`}
            >
              {resting ? 'Resting...' : restType === 'short' ? 'Short Rest' : 'Long Rest'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
