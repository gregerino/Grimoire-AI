import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Shield, ChevronRight, Flag, Skull } from 'lucide-react'
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
          <motion.div
            animate={{
              rotate: [0, -10, 10, -5, 5, 0],
            }}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 3 }}
          >
            <Swords className="h-4 w-4 text-red-400" />
          </motion.div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Combat
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={round}
              className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-bold text-red-400"
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              Round {round}
            </motion.span>
          </AnimatePresence>
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
        <AnimatePresence initial={false}>
          {initiativeOrder.map((combatant, idx) => {
            const isCurrent = idx === currentTurnIndex
            const isDead = combatant.hp.current === 0 && !combatant.isPlayer

            return (
              <motion.div
                key={combatant.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: isDead ? 0.5 : 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`relative rounded-lg border px-3 py-2.5 transition-colors duration-300 ${
                  isCurrent
                    ? 'border-gold/50 bg-gold/5'
                    : isDead
                      ? 'border-navy/50 bg-dark-navy/30'
                      : 'border-navy bg-dark-navy'
                }`}
              >
                {/* Active turn glow pulse */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-lg border border-gold/30"
                    animate={{
                      boxShadow: [
                        '0 0 0px rgba(201, 168, 76, 0)',
                        '0 0 12px rgba(201, 168, 76, 0.25)',
                        '0 0 0px rgba(201, 168, 76, 0)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                <div className="relative flex items-center gap-2">
                  {isCurrent && (
                    <motion.div
                      initial={{ x: -8, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gold" />
                    </motion.div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            combatant.isPlayer
                              ? 'text-gold'
                              : isDead
                                ? 'text-gray-600 line-through'
                                : 'text-parchment'
                          }`}
                        >
                          {combatant.name}
                        </span>
                        {isDead && <Skull className="h-3 w-3 text-gray-600" />}
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
                      <HpBar
                        current={combatant.hp.current}
                        max={combatant.hp.max}
                        size="sm"
                        showLabel={false}
                      />
                      <div className="mt-0.5 text-right">
                        <span className="text-[10px] tabular-nums text-gray-500">
                          {combatant.hp.current}/{combatant.hp.max}
                        </span>
                      </div>
                    </div>

                    {/* Conditions */}
                    <AnimatePresence>
                      {combatant.conditions.length > 0 && (
                        <motion.div
                          className="mt-1.5 flex flex-wrap gap-1"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          {combatant.conditions.map((cond) => (
                            <motion.div
                              key={cond}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            >
                              <ConditionBadge
                                condition={cond}
                                onRemove={() => removeCondition(combatant.id, cond)}
                              />
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Death Saves */}
      <AnimatePresence>
        {playerAtZero && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <DeathSaveTracker saves={deathSaves} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
