import { motion, AnimatePresence } from 'framer-motion'
import { Skull, ShieldCheck, HeartPulse } from 'lucide-react'
import type { DeathSaves } from '@/types/combat'

interface Props {
  saves: DeathSaves
}

export function DeathSaveTracker({ saves }: Props) {
  const isStabilized = saves.successes >= 3
  const isDead = saves.failures >= 3

  return (
    <motion.div
      className="relative overflow-hidden rounded-xl border border-blood/30 bg-dark-navy p-4"
      animate={{
        borderColor: isDead
          ? 'rgba(139, 26, 26, 0.6)'
          : isStabilized
            ? 'rgba(74, 222, 128, 0.4)'
            : 'rgba(139, 26, 26, 0.3)',
      }}
    >
      {/* Background pulse for tension */}
      {!isStabilized && !isDead && (
        <motion.div
          className="absolute inset-0 bg-gradient-radial from-blood/5 to-transparent"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="relative">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <motion.div
            animate={
              !isStabilized && !isDead
                ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }
                : {}
            }
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Skull className="h-4 w-4 text-red-400" />
          </motion.div>
          <span className="font-display text-xs font-bold uppercase tracking-wider text-red-400">
            Death Saving Throws
          </span>
        </div>

        <AnimatePresence mode="wait">
          {isStabilized ? (
            <motion.div
              key="stabilized"
              className="flex items-center gap-3 rounded-lg bg-green-500/10 px-4 py-3"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 0px rgba(74, 222, 128, 0)',
                    '0 0 20px rgba(74, 222, 128, 0.4)',
                    '0 0 0px rgba(74, 222, 128, 0)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="rounded-full p-1"
              >
                <ShieldCheck className="h-5 w-5 text-green-400" />
              </motion.div>
              <span className="font-display text-sm font-bold tracking-wide text-green-400">
                Stabilized
              </span>
            </motion.div>
          ) : isDead ? (
            <motion.div
              key="dead"
              className="flex items-center gap-3 rounded-lg bg-red-500/10 px-4 py-3"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                <Skull className="h-5 w-5 text-red-400" />
              </motion.div>
              <span className="font-display text-sm font-bold tracking-wide text-red-400">
                Dead
              </span>
            </motion.div>
          ) : (
            <motion.div key="active" className="space-y-3">
              {/* Successes */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-16">
                  <HeartPulse className="h-3 w-3 text-green-500/70" />
                  <span className="text-[10px] uppercase tracking-wider text-gray-600">
                    Save
                  </span>
                </div>
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={`s-${i}`}
                      className={`h-5 w-5 rounded-full border-2 transition-colors duration-300 ${
                        i < saves.successes
                          ? 'border-green-400 bg-green-400'
                          : 'border-gray-600/50 bg-transparent'
                      }`}
                      animate={
                        i < saves.successes
                          ? {
                              boxShadow: [
                                '0 0 0px rgba(74, 222, 128, 0)',
                                '0 0 10px rgba(74, 222, 128, 0.5)',
                                '0 0 4px rgba(74, 222, 128, 0.2)',
                              ],
                            }
                          : { boxShadow: 'none' }
                      }
                      transition={
                        i < saves.successes
                          ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                          : {}
                      }
                      initial={false}
                    />
                  ))}
                </div>
              </div>

              {/* Failures */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-16">
                  <Skull className="h-3 w-3 text-red-500/70" />
                  <span className="text-[10px] uppercase tracking-wider text-gray-600">
                    Fail
                  </span>
                </div>
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={`f-${i}`}
                      className={`h-5 w-5 rounded-full border-2 transition-colors duration-300 ${
                        i < saves.failures
                          ? 'border-red-400 bg-red-400'
                          : 'border-gray-600/50 bg-transparent'
                      }`}
                      animate={
                        i < saves.failures
                          ? {
                              boxShadow: [
                                '0 0 0px rgba(248, 113, 113, 0)',
                                '0 0 10px rgba(248, 113, 113, 0.5)',
                                '0 0 4px rgba(248, 113, 113, 0.2)',
                              ],
                            }
                          : { boxShadow: 'none' }
                      }
                      transition={
                        i < saves.failures
                          ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                          : {}
                      }
                      initial={false}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
