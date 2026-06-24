import { motion, AnimatePresence } from 'framer-motion'
import { Swords, ArrowUp, Skull } from 'lucide-react'

interface CombatStartOverlayProps {
  visible: boolean
  onComplete: () => void
}

export function CombatStartOverlay({ visible, onComplete }: CombatStartOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onAnimationComplete={(def) => {
            if (def === 'exit') return
            setTimeout(onComplete, 1500)
          }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            className="relative z-10 flex flex-col items-center gap-4"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <motion.div
              className="rounded-full border-2 border-blood-light bg-blood/30 p-6"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(139, 26, 26, 0.3)',
                  '0 0 60px rgba(139, 26, 26, 0.6)',
                  '0 0 20px rgba(139, 26, 26, 0.3)',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Swords className="h-12 w-12 text-blood-light" />
            </motion.div>
            <motion.h2
              className="font-display text-4xl font-bold tracking-wider text-blood-light uppercase"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Roll Initiative
            </motion.h2>
            <motion.div
              className="h-0.5 w-48 bg-gradient-to-r from-transparent via-blood-light to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface LevelUpOverlayProps {
  visible: boolean
  newLevel?: number
  onComplete: () => void
}

export function LevelUpOverlay({ visible, newLevel, onComplete }: LevelUpOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onAnimationComplete={(def) => {
            if (def === 'exit') return
            setTimeout(onComplete, 2000)
          }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Radial burst */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 1.5 }}
          >
            <div className="h-[400px] w-[400px] rounded-full bg-gradient-radial from-gold/30 to-transparent" />
          </motion.div>

          <motion.div
            className="relative z-10 flex flex-col items-center gap-4"
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1.2, 1],
              opacity: 1,
            }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <motion.div
              className="rounded-full border-2 border-gold bg-gold/20 p-6"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(201, 168, 76, 0.3)',
                  '0 0 80px rgba(201, 168, 76, 0.6)',
                  '0 0 20px rgba(201, 168, 76, 0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ArrowUp className="h-12 w-12 text-gold" />
            </motion.div>
            <motion.h2
              className="font-display text-4xl font-bold tracking-wider text-gold uppercase"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Level Up!
            </motion.h2>
            {newLevel && (
              <motion.span
                className="font-display text-6xl font-bold text-gold-light"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                {newLevel}
              </motion.span>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface DeathSaveOverlayProps {
  visible: boolean
  roll?: number
  successes: number
  failures: number
  onComplete: () => void
}

export function DeathSaveOverlay({ visible, roll, successes, failures, onComplete }: DeathSaveOverlayProps) {
  const isSuccess = roll != null && roll >= 10
  const isCritSuccess = roll === 20
  const isCritFail = roll === 1

  const resultLabel = isCritSuccess
    ? 'Nat 20 — You Rise!'
    : isCritFail
      ? 'Nat 1 — Two Failures'
      : isSuccess
        ? 'Success'
        : roll != null
          ? 'Failure'
          : null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onAnimationComplete={(def) => {
            if (def === 'exit') return
            setTimeout(onComplete, 2500)
          }}
        >
          {/* Dark vignette backdrop */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

          {/* Blood/gold radial burst */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0.2] }}
            transition={{ duration: 1.5 }}
          >
            <div
              className={`h-[500px] w-[500px] rounded-full bg-gradient-radial ${
                isSuccess ? 'from-gold/20 to-transparent' : 'from-blood/20 to-transparent'
              }`}
            />
          </motion.div>

          <motion.div
            className="relative z-10 flex flex-col items-center gap-6"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 150, damping: 15 }}
          >
            {/* Skull icon with dramatic glow */}
            <motion.div
              animate={{
                boxShadow: isSuccess
                  ? [
                      '0 0 20px rgba(201, 168, 76, 0.2)',
                      '0 0 60px rgba(201, 168, 76, 0.5)',
                      '0 0 20px rgba(201, 168, 76, 0.2)',
                    ]
                  : [
                      '0 0 20px rgba(139, 26, 26, 0.2)',
                      '0 0 60px rgba(139, 26, 26, 0.5)',
                      '0 0 20px rgba(139, 26, 26, 0.2)',
                    ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={`rounded-full border-2 p-6 ${isSuccess ? 'border-gold bg-gold/20' : 'border-blood-light bg-blood/20'}`}
            >
              <motion.div
                animate={
                  isCritFail
                    ? { rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.1, 1] }
                    : isCritSuccess
                      ? { rotate: [0, 360], scale: [1, 1.2, 1] }
                      : {}
                }
                transition={{ duration: isCritSuccess ? 0.8 : 0.5, delay: 0.3 }}
              >
                <Skull className={`h-12 w-12 ${isSuccess ? 'text-gold' : 'text-blood-light'}`} />
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h2
              className="font-display text-3xl font-bold uppercase tracking-[0.2em] text-parchment"
              initial={{ opacity: 0, letterSpacing: '0.5em' }}
              animate={{ opacity: 1, letterSpacing: '0.2em' }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Death Save
            </motion.h2>

            {/* Divider */}
            <motion.div
              className={`h-0.5 w-40 bg-gradient-to-r from-transparent ${isSuccess ? 'via-gold/60' : 'via-blood-light/60'} to-transparent`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            />

            {/* Roll number */}
            {roll != null && (
              <motion.div className="flex flex-col items-center gap-2">
                <motion.div
                  className={`font-display text-6xl font-bold ${
                    isCritSuccess ? 'text-gold' : isCritFail ? 'text-blood-light' : isSuccess ? 'text-green-400' : 'text-red-400'
                  }`}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: [0, 1.4, 1], rotate: 0 }}
                  transition={{ delay: 0.5, duration: 0.6, type: 'spring', stiffness: 200 }}
                >
                  {roll}
                </motion.div>
                {resultLabel && (
                  <motion.span
                    className={`font-display text-sm tracking-wider ${
                      isCritSuccess ? 'text-gold' : isCritFail ? 'text-blood-light' : isSuccess ? 'text-green-400' : 'text-red-400'
                    }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    {resultLabel}
                  </motion.span>
                )}
              </motion.div>
            )}

            {/* Save/Fail dots */}
            <motion.div
              className="flex gap-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Saves</span>
                <div className="flex gap-2">
                  {Array.from({ length: 3 }, (_, i) => (
                    <motion.div
                      key={i}
                      className={`h-4 w-4 rounded-full border-2 ${
                        i < successes
                          ? 'border-green-400 bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]'
                          : 'border-gray-600 bg-transparent'
                      }`}
                      initial={false}
                      animate={
                        i < successes
                          ? { scale: [1, 1.2, 1] }
                          : {}
                      }
                      transition={{ delay: 1.1 + i * 0.1 }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Fails</span>
                <div className="flex gap-2">
                  {Array.from({ length: 3 }, (_, i) => (
                    <motion.div
                      key={i}
                      className={`h-4 w-4 rounded-full border-2 ${
                        i < failures
                          ? 'border-red-400 bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]'
                          : 'border-gray-600 bg-transparent'
                      }`}
                      initial={false}
                      animate={
                        i < failures
                          ? { scale: [1, 1.2, 1] }
                          : {}
                      }
                      transition={{ delay: 1.1 + i * 0.1 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
