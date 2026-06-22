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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div
            className="relative z-10 flex flex-col items-center gap-6"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={{
                boxShadow: isSuccess
                  ? ['0 0 20px rgba(201, 168, 76, 0.3)', '0 0 40px rgba(201, 168, 76, 0.5)', '0 0 20px rgba(201, 168, 76, 0.3)']
                  : ['0 0 20px rgba(139, 26, 26, 0.3)', '0 0 40px rgba(139, 26, 26, 0.5)', '0 0 20px rgba(139, 26, 26, 0.3)'],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={`rounded-full border-2 p-5 ${isSuccess ? 'border-gold bg-gold/20' : 'border-blood-light bg-blood/20'}`}
            >
              <Skull className={`h-10 w-10 ${isSuccess ? 'text-gold' : 'text-blood-light'}`} />
            </motion.div>

            <motion.h2
              className="font-display text-2xl font-bold uppercase tracking-wider text-parchment"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Death Save
            </motion.h2>

            {roll != null && (
              <motion.div
                className={`font-display text-5xl font-bold ${
                  isCritSuccess ? 'text-gold' : isCritFail ? 'text-blood-light' : isSuccess ? 'text-green-400' : 'text-red-400'
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                {roll}
              </motion.div>
            )}

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-gray-500">Saves</span>
                <div className="flex gap-1">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div
                      key={i}
                      className={`h-3 w-3 rounded-full border ${
                        i < successes ? 'border-green-400 bg-green-400' : 'border-gray-600 bg-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-gray-500">Fails</span>
                <div className="flex gap-1">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div
                      key={i}
                      className={`h-3 w-3 rounded-full border ${
                        i < failures ? 'border-red-400 bg-red-400' : 'border-gray-600 bg-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
