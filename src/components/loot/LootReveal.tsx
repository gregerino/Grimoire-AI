import { useState, useEffect, useCallback } from 'react'
import { X, Sparkles } from 'lucide-react'
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
  common: 'shadow-gray-500/20',
  uncommon: 'shadow-green-500/30',
  rare: 'shadow-blue-500/40',
  very_rare: 'shadow-purple-500/50',
  legendary: 'shadow-amber-500/60',
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
  const [phase, setPhase] = useState<'intro' | 'items' | 'done'>('intro')
  const [revealedCount, setRevealedCount] = useState(0)
  const [showCurrency, setShowCurrency] = useState(false)

  const hasCurrency = currency && (currency.gp || currency.sp || currency.cp)
  const bestRarity = getBestRarity(items)

  useEffect(() => {
    onPlaySfx?.()
    const introTimer = setTimeout(() => setPhase('items'), 800)
    return () => clearTimeout(introTimer)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-500"
        onClick={() => phase === 'done' && handleClose()}
      />

      {/* Content */}
      <div className="relative z-10 mx-4 w-full max-w-md">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute -right-2 -top-2 z-20 rounded-full bg-dark-navy p-1.5 text-gray-500 hover:text-parchment transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Title */}
        <div
          className="mb-4 text-center transition-all duration-700"
          style={{ opacity: phase === 'intro' ? 0 : 1, transform: phase === 'intro' ? 'translateY(-10px)' : 'translateY(0)' }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-1.5">
            <Sparkles className="h-4 w-4 text-gold" />
            <span className="text-sm font-bold tracking-wide text-gold uppercase">Loot Found</span>
            <Sparkles className="h-4 w-4 text-gold" />
          </div>
        </div>

        {/* Narrative */}
        {narrative && (
          <p
            className="mb-4 text-center text-sm italic text-gray-400 transition-all duration-700"
            style={{ opacity: phase === 'intro' ? 0 : 1, transform: phase === 'intro' ? 'translateY(10px)' : 'translateY(0)' }}
          >
            {narrative}
          </p>
        )}

        {/* Items */}
        <div className="space-y-2">
          {items.map((item, i) => {
            const rarity = (item.rarity || 'common') as ItemRarity
            const revealed = i < revealedCount
            return (
              <div
                key={i}
                className={`
                  overflow-hidden rounded-xl border-2 ${rarityBorder[rarity]} ${rarityBg[rarity]}
                  shadow-lg ${rarityGlow[rarity]}
                  transition-all duration-500 ease-out
                `}
                style={{
                  opacity: revealed ? 1 : 0,
                  transform: revealed ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                  maxHeight: revealed ? '200px' : '0px',
                  marginBottom: revealed ? undefined : '0px',
                  padding: revealed ? undefined : '0px',
                }}
              >
                <div className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{categoryIcons[item.category] || '📦'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${rarityText[rarity]}`}>{item.name}</span>
                        {rarity !== 'common' && (
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${rarityText[rarity]} ${rarityBg[rarity]}`}>
                            {rarityLabel[rarity]}
                          </span>
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

                {/* Legendary shimmer bar */}
                {(rarity === 'legendary' || rarity === 'very_rare') && revealed && (
                  <div className="h-0.5 w-full overflow-hidden">
                    <div
                      className={`h-full w-[200%] ${rarity === 'legendary' ? 'bg-gradient-to-r from-transparent via-amber-400 to-transparent' : 'bg-gradient-to-r from-transparent via-purple-400 to-transparent'}`}
                      style={{ animation: 'shimmer 2s ease-in-out infinite' }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Currency */}
        {hasCurrency && (
          <div
            className="mt-3 flex items-center justify-center gap-4 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 transition-all duration-500"
            style={{
              opacity: showCurrency ? 1 : 0,
              transform: showCurrency ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.95)',
            }}
          >
            {(currency?.gp ?? 0) > 0 && <CoinDisplay amount={currency!.gp!} label="GP" color="text-yellow-400" animate={showCurrency} />}
            {(currency?.sp ?? 0) > 0 && <CoinDisplay amount={currency!.sp!} label="SP" color="text-gray-300" animate={showCurrency} />}
            {(currency?.cp ?? 0) > 0 && <CoinDisplay amount={currency!.cp!} label="CP" color="text-amber-700" animate={showCurrency} />}
          </div>
        )}

        {/* Dismiss hint */}
        {phase === 'done' && (
          <p className="mt-3 text-center text-[10px] text-gray-600 animate-pulse">
            Click or press any key to continue
          </p>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
      `}</style>
    </div>
  )
}

function CoinDisplay({ amount, label, color, animate }: { amount: number; label: string; color: string; animate: boolean }) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    if (!animate) return
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
  }, [animate, amount])

  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-lg font-bold tabular-nums ${color}`}>{displayed}</span>
      <span className={`text-xs font-medium ${color} opacity-70`}>{label}</span>
    </div>
  )
}

function getBestRarity(items: LootItem[]): string {
  const order = ['common', 'uncommon', 'rare', 'very_rare', 'legendary']
  let best = 0
  for (const item of items) {
    const idx = order.indexOf(item.rarity || 'common')
    if (idx > best) best = idx
  }
  return order[best]
}

function formatValue(gp?: number, sp?: number, cp?: number): string {
  const parts: string[] = []
  if ((gp ?? 0) > 0) parts.push(`${gp} gp`)
  if ((sp ?? 0) > 0) parts.push(`${sp} sp`)
  if ((cp ?? 0) > 0) parts.push(`${cp} cp`)
  return parts.join(', ')
}
