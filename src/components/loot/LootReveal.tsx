import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Package } from 'lucide-react'
import type { ItemRarity } from '@/types/database'

interface LootItem {
  name: string
  category: string
  rarity?: string
  description?: string
  weight?: number
  value_gp?: number
  value_sp?: number
  value_cp?: number
}

interface LootRevealProps {
  items: LootItem[]
  currency?: { gp?: number; sp?: number; cp?: number }
  narrative?: string
  onClose: () => void
  onPlaySfx?: () => void
}

const rarityGlow: Record<string, string> = {
  common: '',
  uncommon: '0 0 20px rgba(34, 197, 94, 0.2)',
  rare: '0 0 20px rgba(59, 130, 246, 0.3)',
  very_rare: '0 0 25px rgba(168, 85, 247, 0.35)',
  legendary: '0 0 30px rgba(245, 158, 11, 0.4)',
}

const rarityBorder: Record<string, string> = {
  common: 'border-gray-600',
  uncommon: 'border-green-500/50',
  rare: 'border-blue-500/50',
  very_rare: 'border-purple-500/50',
  legendary: 'border-amber-500/50',
}

const rarityText: Record<string, string> = {
  common: 'text-gray-300',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  very_rare: 'text-purple-400',
  legendary: 'text-amber-400',
}

const rarityBg: Record<string, string> = {
  common: 'bg-gray-500/5',
  uncommon: 'bg-green-500/5',
  rare: 'bg-blue-500/10',
  very_rare: 'bg-purple-500/10',
  legendary: 'bg-amber-500/10',
}

const rarityLabel: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  very_rare: 'Very Rare',
  legendary: 'Legendary',
}

const categoryIcons: Record<string, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  potion: '🧪',
  scroll: '📜',
  gear: '⚙️',
  treasure: '💎',
  tool: '🔧',
  other: '📦',
}

export function LootReveal({ items, currency, narrative, onClose, onPlaySfx }: LootRevealProps) {
  const [phase, setPhase] = useState<'chest' | 'items' | 'done'>('chest')
  const [revealedCount, setRevealedCount] = useState(0)
  const [showCurrency, setShowCurrency] = useState(false)

  const hasCurrency = currency && (currency.gp || currency.sp || currency.cp)

  useEffect(() => {
    onPlaySfx?.()
    const chestTimer = setTimeout(() => setPhase('items'), 1200)
    return () => clearTimeout(chestTimer)
  }, [onPlaySfx])

  useEffect(() => {
    if (phase !== 'items') return
    if (revealedCount >= items.length) {
      if (hasCurrency) {
        const t = setTimeout(() => setShowCurrency(true), 400)
        const t2 = setTimeout(() => setPhase('done'), 800)
        return () => { clearTimeout(t); clearTimeout(t2) }
      }
      setPhase('done')
      return
    }
    const t = setTimeout(() => setRevealedCount((c) => c + 1), 500)
    return () => clearTimeout(t)
  }, [phase, revealedCount, items.length, hasCurrency])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (phase === 'done') {
          handleClose()
        } else {
          setRevealedCount(items.length)
          setShowCurrency(true)
          setPhase('done')
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, items.length, handleClose])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={() => phase === 'done' && handleClose()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Content */}
        <div className="relative z-10 mx-4 w-full max-w-md">
          {/* Close button */}
          <motion.button
            onClick={handleClose}
            className="absolute -right-2 -top-2 z-20 rounded-full bg-dark-navy p-1.5 text-gray-500 hover:text-parchment transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="h-4 w-4" />
          </motion.button>

          {/* Chest opening animation */}
          <AnimatePresence mode="wait">
            {phase === 'chest' && (
              <motion.div
                key="chest"
                className="flex flex-col items-center gap-4 py-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 1.2, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  className="rounded-2xl border-2 border-gold/40 bg-gold/10 p-8"
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(201, 168, 76, 0.2)',
                      '0 0 60px rgba(201, 168, 76, 0.5)',
                      '0 0 20px rgba(201, 168, 76, 0.2)',
                    ],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Package className="h-12 w-12 text-gold" />
                </motion.div>
                <motion.div
                  className="h-0.5 w-32 bg-gradient-to-r from-transparent via-gold/60 to-transparent"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Title */}
          <AnimatePresence>
            {phase !== 'chest' && (
              <motion.div
                className="mb-4 text-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-1.5">
                  <Sparkles className="h-4 w-4 text-gold" />
                  <span className="font-display text-sm font-bold tracking-wide text-gold uppercase">
                    Loot Found
                  </span>
                  <Sparkles className="h-4 w-4 text-gold" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Narrative */}
          <AnimatePresence>
            {narrative && phase !== 'chest' && (
              <motion.p
                className="mb-4 text-center font-body text-sm italic text-gray-400"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {narrative}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Items */}
          <div className="space-y-2">
            <AnimatePresence>
              {items.map((item, i) => {
                const rarity = (item.rarity || 'common') as ItemRarity
                const revealed = i < revealedCount

                if (!revealed) return null

                return (
                  <motion.div
                    key={i}
                    className={`overflow-hidden rounded-xl border-2 ${rarityBorder[rarity]} ${rarityBg[rarity]}`}
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      boxShadow: rarityGlow[rarity],
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 20,
                    }}
                  >
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <motion.span
                          className="text-xl"
                          initial={{ rotate: -20, scale: 0 }}
                          animate={{ rotate: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                        >
                          {categoryIcons[item.category] || '📦'}
                        </motion.span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${rarityText[rarity]}`}>{item.name}</span>
                            {rarity !== 'common' && (
                              <motion.span
                                className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${rarityText[rarity]} ${rarityBg[rarity]}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                              >
                                {rarityLabel[rarity]}
                              </motion.span>
                            )}
                          </div>
                          {item.description && (
                            <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">{item.description}</p>
                          )}
                          <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-500">
                            {(item.weight ?? 0) > 0 && <span>{item.weight} lbs</span>}
                            {formatValue(item.value_gp, item.value_sp, item.value_cp) && (
                              <span className="text-yellow-600">{formatValue(item.value_gp, item.value_sp, item.value_cp)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Legendary/very rare shimmer bar */}
                    {(rarity === 'legendary' || rarity === 'very_rare') && (
                      <motion.div
                        className="h-0.5 w-full overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <motion.div
                          className={`h-full w-[200%] ${rarity === 'legendary' ? 'bg-gradient-to-r from-transparent via-amber-400 to-transparent' : 'bg-gradient-to-r from-transparent via-purple-400 to-transparent'}`}
                          animate={{ x: ['-50%', '0%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      </motion.div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Currency */}
          <AnimatePresence>
            {hasCurrency && showCurrency && (
              <motion.div
                className="mt-3 flex items-center justify-center gap-4 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              >
                {(currency?.gp ?? 0) > 0 && <CoinDisplay amount={currency!.gp!} label="GP" color="text-yellow-400" />}
                {(currency?.sp ?? 0) > 0 && <CoinDisplay amount={currency!.sp!} label="SP" color="text-gray-300" />}
                {(currency?.cp ?? 0) > 0 && <CoinDisplay amount={currency!.cp!} label="CP" color="text-amber-700" />}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dismiss hint */}
          <AnimatePresence>
            {phase === 'done' && (
              <motion.p
                className="mt-3 text-center text-[10px] text-gray-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Click or press any key to continue
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function CoinDisplay({ amount, label, color }: { amount: number; label: string; color: string }) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    const duration = 600
    const steps = Math.min(amount, 20)
    const stepTime = duration / steps
    let current = 0
    const interval = setInterval(() => {
      current++
      setDisplayed(Math.round((current / steps) * amount))
      if (current >= steps) {
        clearInterval(interval)
        setDisplayed(amount)
      }
    }, stepTime)
    return () => clearInterval(interval)
  }, [amount])

  return (
    <motion.div
      className="flex items-center gap-1.5"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
    >
      <span className={`text-lg font-bold tabular-nums ${color}`}>{displayed}</span>
      <span className={`text-xs font-medium ${color} opacity-70`}>{label}</span>
    </motion.div>
  )
}

function formatValue(gp?: number, sp?: number, cp?: number): string {
  const parts: string[] = []
  if ((gp ?? 0) > 0) parts.push(`${gp} gp`)
  if ((sp ?? 0) > 0) parts.push(`${sp} sp`)
  if ((cp ?? 0) > 0) parts.push(`${cp} cp`)
  return parts.join(', ')
}
