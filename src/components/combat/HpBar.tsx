import { useState, useEffect, useRef } from 'react'
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
  const prevHp = useRef(current)

  useEffect(() => {
    if (current < prevHp.current) {
      setFlash('damage')
    } else if (current > prevHp.current) {
      setFlash('heal')
    }
    prevHp.current = current

    if (flash) {
      const timer = setTimeout(() => setFlash(null), 600)
      return () => clearTimeout(timer)
    }
  }, [current, flash])

  const percent = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0
  const barColor = percent > 50 ? 'bg-green-500' : percent > 25 ? 'bg-yellow-500' : 'bg-red-500'
  const barHeight = size === 'sm' ? 'h-1.5' : 'h-2.5'
  const flashBorder = flash === 'damage'
    ? 'ring-2 ring-red-500/50'
    : flash === 'heal'
      ? 'ring-2 ring-green-500/50'
      : ''

  return (
    <div>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[10px] uppercase tracking-wider text-gray-500">HP</span>
          </div>
          <span className="text-xs font-bold text-parchment">
            {current}/{max}
            {temp > 0 && <span className="ml-1 text-blue-400">(+{temp})</span>}
          </span>
        </div>
      )}
      <div className={`${barHeight} overflow-hidden rounded-full bg-navy transition-shadow duration-300 ${flashBorder}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
