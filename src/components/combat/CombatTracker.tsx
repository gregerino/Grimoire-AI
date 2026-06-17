import { Swords, Shield, ChevronRight, Flag } from 'lucide-react'
import { useCombatStore } from '@/stores/combatStore'
import { HpBar } from './HpBar'
import { DeathSaveTracker } from './DeathSaveTracker'
import { ConditionBadge } from './ConditionBadge'

export function CombatTracker() {
  const {
    inCombat,
    round,
    initiativeOrder,
    currentTurnIndex,
    deathSaves,
    endCombat,
    removeCondition,
  } = useCombatStore()

  if (!inCombat) {
    return (
      <div className="space-y-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
          Combat
        </h3>
        <div className="rounded-xl border border-dashed border-navy bg-dark-navy/50 p-6 text-center">
          <Swords className="mx-auto mb-3 h-8 w-8 text-gray-600" />
          <p className="text-sm text-gray-500">
            No active combat. The DM will initiate combat when enemies appear.
          </p>
        </div>
      </div>
    )
  }

  const player = initiativeOrder.find((c) => c.isPlayer)
  const playerAtZero = player && player.hp.current === 0

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-red-400" />
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Combat
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-bold text-red-400">
            Round {round}
          </span>
          <button
            onClick={endCombat}
            className="rounded p-1 text-gray-600 transition-colors hover:bg-navy hover:text-gray-400"
            title="End combat"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Initiative Order */}
      <div className="space-y-1.5">
        {initiativeOrder.map((combatant, idx) => {
          const isCurrent = idx === currentTurnIndex
          const isDead = combatant.hp.current === 0 && !combatant.isPlayer
          const hpPercent = combatant.hp.max > 0
            ? (combatant.hp.current / combatant.hp.max) * 100
            : 0

          return (
            <div
              key={combatant.id}
              className={`rounded-lg border px-3 py-2.5 transition-all duration-300 ${
                isCurrent
                  ? 'border-gold/50 bg-gold/5'
                  : isDead
                    ? 'border-navy/50 bg-dark-navy/30 opacity-50'
                    : 'border-navy bg-dark-navy'
              }`}
            >
              <div className="flex items-center gap-2">
                {isCurrent && (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gold" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          combatant.isPlayer ? 'text-gold' : isDead ? 'text-gray-600 line-through' : 'text-parchment'
                        }`}
                      >
                        {combatant.name}
                      </span>
                      <span className="text-[10px] text-gray-600">
                        Init {combatant.initiative}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-blue-400" />
                      <span className="text-[10px] font-medium text-blue-400">
                        {combatant.ac}
                      </span>
                    </div>
                  </div>

                  {/* HP Bar */}
                  <div className="mt-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            hpPercent > 50
                              ? 'bg-green-500'
                              : hpPercent > 25
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${hpPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-gray-500">
                        {combatant.hp.current}/{combatant.hp.max}
                      </span>
                    </div>
                  </div>

                  {/* Conditions */}
                  {combatant.conditions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {combatant.conditions.map((cond) => (
                        <ConditionBadge
                          key={cond}
                          condition={cond}
                          onRemove={() => removeCondition(combatant.id, cond)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Death Saves */}
      {playerAtZero && <DeathSaveTracker saves={deathSaves} />}
    </div>
  )
}
