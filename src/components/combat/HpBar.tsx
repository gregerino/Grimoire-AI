import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import { Heart } from 'lucide-react'

interface Props {
  current: number
  max: number
  temp?: number
  size?: 'sm' | 'md'
  showLabel?: boolean
}

export function HpBar({ current, max, temp = 0, size = 'md', showLabel = true }: Props) {
  const [flash, setFlash] = useState<'damage' | 'heal' | null>(null)
  const [delta, setDelta] = useState<number | null>(null)
  const prevHp = useRef(current)

  const percent = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0
  const springPercent = useSpring(percent, { stiffness: 120, damping: 20 })
  const barWidth = useTransform(springPercent, (v) => `${v}%`)

  useEffect(() => {
    springPercent.set(percent)
  }, [percent, springPercent])

  useEffect(() => {
    if (current === prevHp.current) return

    const diff = current - prevHp.current
    setDelta(diff)

    if (diff < 0) {
      setFlash('damage')
    } else {
      setFlash('heal')
    }
    prevHp.current = current

    const timer = setTimeout(() => {
      setFlash(null)
      setDelta(null)
    }, 900)
    return () => clearTimeout(timer)
  }, [current])

  const barColor = percent > 50 ? 'bg-green-500' : percent > 25 ? 'bg-yellow-500' : 'bg-red-500'
  const barHeight = size === 'sm' ? 'h-1.5' : 'h-2.5'

  return (
    <div className="relative" role="meter" aria-label="HP" aria-valuenow={current} aria-valuemin={0} aria-valuemax={max}>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
            <span className="text-[10px] uppercase tracking-wider text-gray-500">HP</span>
          </div>
          <span className="text-xs font-bold text-parchment">
            {current}/{max}
            {temp > 0 && <span className="ml-1 text-blue-400">(+{temp})</span>}
          </span>
        </div>
      )}

      <motion.div
        className={`${barHeight} overflow-hidden rounded-full bg-navy relative`}
        animate={
          flash === 'damage'
            ? { x: [0, -3, 3, -2, 2, 0] }
            : {}
        }
        transition={{ duration: 0.3 }}
      >
        {/* Ghost bar showing previous HP level */}
        <AnimatePresence>
          {flash === 'damage' && (
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-red-500/40"
              initial={{ width: `${Math.min(100, ((current - (delta ?? 0)) / max) * 100)}%` }}
              animate={{ width: `${percent}%` }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        {/* Main HP bar */}
        <motion.div
          className={`h-full rounded-full ${barColor} relative`}
          style={{ width: barWidth }}
        >
          {/* Shimmer effect on heal */}
          <AnimatePresence>
            {flash === 'heal' && (
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Full-bar flash overlay */}
        <AnimatePresence>
          {flash && (
            <motion.div
              className={`absolute inset-0 rounded-full ${
                flash === 'damage' ? 'bg-red-500/30' : 'bg-green-500/20'
              }`}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Floating damage/heal number */}
      <AnimatePresence>
        {delta !== null && (
          <motion.span
            className={`absolute -top-1 right-0 font-display text-sm font-bold ${
              delta < 0 ? 'text-red-400' : 'text-green-400'
            }`}
            initial={{ y: 0, opacity: 1, scale: 1.2 }}
            animate={{ y: -18, opacity: 0, scale: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            {delta > 0 ? '+' : ''}{delta}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
