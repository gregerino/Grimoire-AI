import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, X } from 'lucide-react'

interface Props {
  speaking: boolean
  paused: boolean
  onStop: () => void
  onTogglePause: () => void
  currentText?: string
}

function WaveBar({ index, paused }: { index: number; paused: boolean }) {
  return (
    <motion.div
      className="w-[3px] rounded-full bg-gold"
      animate={
        paused
          ? { height: 4 }
          : {
              height: [4, 12 + Math.random() * 10, 6, 16 + Math.random() * 8, 4],
            }
      }
      transition={
        paused
          ? { duration: 0.3 }
          : {
              duration: 0.6 + index * 0.08,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
              delay: index * 0.05,
            }
      }
    />
  )
}

export function SpeakingIndicator({ speaking, paused, onStop, onTogglePause, currentText }: Props) {
  const truncated = currentText
    ? currentText.length > 60
      ? currentText.slice(0, 60) + '…'
      : currentText
    : null

  return (
    <AnimatePresence>
      {speaking && (
        <motion.div
          className="flex items-center gap-3 rounded-xl border border-gold/20 bg-dark-navy/80 px-4 py-2.5 backdrop-blur-sm"
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.25 }}
        >
          <button
            onClick={onTogglePause}
            className="shrink-0 text-gold/80 hover:text-gold transition-colors focus-ring"
            aria-label={paused ? 'Fortsätt uppläsning' : 'Pausa uppläsning'}
          >
            <Volume2 className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            onClick={onTogglePause}
            className="flex items-end gap-[3px] h-6 cursor-pointer focus-ring"
            aria-label={paused ? 'Fortsätt uppläsning' : 'Pausa uppläsning'}
            aria-hidden="true"
          >
            {Array.from({ length: 7 }).map((_, i) => (
              <WaveBar key={i} index={i} paused={paused} />
            ))}
          </button>

          {truncated && (
            <span className="min-w-0 flex-1 truncate font-body text-xs text-parchment/50 italic">
              {truncated}
            </span>
          )}

          <button
            onClick={onStop}
            className="shrink-0 rounded-md p-1 text-mist hover:bg-navy/40 hover:text-parchment transition-colors focus-ring"
            aria-label="Avbryt uppläsning"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
