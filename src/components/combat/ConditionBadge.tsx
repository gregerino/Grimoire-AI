import { useState } from 'react'
import {
  EyeOff, Heart, EarOff, BatteryLow, Ghost, Grab,
  CircleSlash, Eye, ZapOff, Mountain, FlaskRound,
  ArrowDownToLine, Link, Sparkles, Moon, Focus, X,
} from 'lucide-react'
import type { Condition } from '@/types/combat'
import { CONDITION_DATA } from '@/lib/conditions'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'eye-off': EyeOff,
  heart: Heart,
  'ear-off': EarOff,
  'battery-low': BatteryLow,
  ghost: Ghost,
  grab: Grab,
  'circle-slash': CircleSlash,
  eye: Eye,
  'zap-off': ZapOff,
  mountain: Mountain,
  'flask-round': FlaskRound,
  'arrow-down-to-line': ArrowDownToLine,
  link: Link,
  sparkles: Sparkles,
  moon: Moon,
  focus: Focus,
}

interface Props {
  condition: Condition
  onRemove?: () => void
  size?: 'sm' | 'md'
}

export function ConditionBadge({ condition, onRemove, size = 'sm' }: Props) {
  const [showTooltip, setShowTooltip] = useState(false)
  const data = CONDITION_DATA[condition]
  if (!data) return null

  const Icon = ICON_MAP[data.icon]
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'

  return (
    <div className="relative inline-flex">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${data.color} cursor-default`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {Icon && <Icon className={iconSize} />}
        {condition}
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="ml-0.5 rounded-full p-0.5 hover:bg-white/10 transition-colors"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </span>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-lg border border-navy bg-dark-navy p-3 shadow-xl" style={{ width: '220px' }}>
          <div className="mb-1.5 text-xs font-bold capitalize text-parchment">{condition}</div>
          <p className="mb-2 text-[10px] leading-relaxed text-gray-400">{data.description}</p>
          <ul className="space-y-0.5">
            {data.effects.map((effect, i) => (
              <li key={i} className="text-[10px] text-gray-500">
                • {effect}
              </li>
            ))}
          </ul>
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-navy bg-dark-navy" />
        </div>
      )}
    </div>
  )
}
