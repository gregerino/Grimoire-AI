import { useState } from 'react'
import { Dices, Sparkles, Zap, Minus, Plus } from 'lucide-react'
import {
  rollFateChart,
  rollRandomEvent,
  ODDS_ORDER,
  ODDS_LABELS,
  type OddsLevel,
  type FateRoll,
  type RandomEvent,
} from '@/lib/fate-chart'

interface Props {
  chaosFactor: number
  onOracleResult?: (text: string) => void
  onChaosFactorChange?: (newCf: number) => void
}

const RESULT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  exceptional_yes: { bg: 'bg-green-500/20 border-green-500/40', text: 'text-green-400', label: 'Exceptional Yes!' },
  yes:             { bg: 'bg-green-500/10 border-green-500/20', text: 'text-green-300', label: 'Yes' },
  no:              { bg: 'bg-red-500/10 border-red-500/20',     text: 'text-red-300',   label: 'No' },
  exceptional_no:  { bg: 'bg-red-500/20 border-red-500/40',     text: 'text-red-400',   label: 'Exceptional No!' },
}

export function FateChartPanel({ chaosFactor, onOracleResult, onChaosFactorChange }: Props) {
  const [selectedOdds, setSelectedOdds] = useState<OddsLevel>('50/50')
  const [lastRoll, setLastRoll] = useState<FateRoll | null>(null)
  const [lastEvent, setLastEvent] = useState<RandomEvent | null>(null)
  const [animating, setAnimating] = useState(false)

  const handleRoll = () => {
    setAnimating(true)
    setLastEvent(null)

    setTimeout(() => {
      const result = rollFateChart(selectedOdds, chaosFactor)
      setLastRoll(result)
      setAnimating(false)

      let event: RandomEvent | null = null
      if (result.randomEvent) {
        event = rollRandomEvent()
        setLastEvent(event)
      }

      if (onOracleResult) {
        let text = `**Oracle (${ODDS_LABELS[selectedOdds]}, CF ${chaosFactor}):** ${RESULT_STYLES[result.result].label} (rolled ${result.roll})`
        if (event) {
          text += `\n**Random Event:** ${event.focus} — ${event.action} + ${event.subject}`
        }
        onOracleResult(text)
      }
    }, 300)
  }

  const handleRandomEvent = () => {
    const event = rollRandomEvent()
    setLastEvent(event)
    if (onOracleResult) {
      onOracleResult(`**Random Event:** ${event.focus} — ${event.action} + ${event.subject}`)
    }
  }

  const adjustChaos = (delta: number) => {
    const next = Math.max(1, Math.min(9, chaosFactor + delta))
    if (next !== chaosFactor) onChaosFactorChange?.(next)
  }

  const style = lastRoll ? RESULT_STYLES[lastRoll.result] : null

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
        Mythic Fate Chart
      </h3>

      {/* Odds selector */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-wider text-gray-600">Odds</label>
        <div className="grid grid-cols-3 gap-1">
          {ODDS_ORDER.map((odds) => (
            <button
              key={odds}
              onClick={() => setSelectedOdds(odds)}
              className={`rounded px-2 py-1.5 text-[11px] transition-colors ${
                selectedOdds === odds
                  ? 'bg-gold/20 border border-gold/40 text-gold'
                  : 'border border-navy bg-dark-navy text-gray-500 hover:text-gray-400 hover:border-gray-600'
              }`}
            >
              {ODDS_LABELS[odds]}
            </button>
          ))}
        </div>
      </div>

      {/* Chaos Factor with +/- controls */}
      <div className="flex items-center justify-between rounded-lg border border-navy bg-dark-navy px-3 py-2">
        <span className="text-[10px] uppercase tracking-wider text-gray-600">Chaos Factor</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustChaos(-1)}
            disabled={chaosFactor <= 1}
            className="rounded p-0.5 text-gray-500 transition-colors hover:bg-navy hover:text-parchment disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500"
            title="Decrease Chaos Factor"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className={`min-w-[1.25rem] text-center text-sm font-bold ${
            chaosFactor <= 3 ? 'text-blue-400' : chaosFactor <= 6 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {chaosFactor}
          </span>
          <button
            onClick={() => adjustChaos(1)}
            disabled={chaosFactor >= 9}
            className="rounded p-0.5 text-gray-500 transition-colors hover:bg-navy hover:text-parchment disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500"
            title="Increase Chaos Factor"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Roll button */}
      <button
        onClick={handleRoll}
        disabled={animating}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold/20 border border-gold/30 px-4 py-3 text-sm font-medium text-gold transition-all hover:bg-gold/30 disabled:opacity-50"
      >
        <Dices className={`h-4 w-4 ${animating ? 'animate-spin' : ''}`} />
        Ask the Oracle
      </button>

      {/* Result display */}
      {lastRoll && style && (
        <div className={`rounded-xl border p-4 ${style.bg} transition-all`}>
          <div className="flex items-center justify-between">
            <span className={`text-lg font-bold ${style.text}`}>{style.label}</span>
            <span className="text-xs text-gray-500">
              d100: {lastRoll.roll}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {ODDS_LABELS[lastRoll.odds]} · CF {lastRoll.chaosFactor}
          </div>
          {lastRoll.randomEvent && (
            <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-2">
              <Zap className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs font-medium text-purple-300">Random Event triggered!</span>
            </div>
          )}
        </div>
      )}

      {/* Random Event result */}
      {lastEvent && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-medium text-purple-300">Random Event</span>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-parchment">{lastEvent.focus}</div>
            <div className="text-xs text-gray-400">
              {lastEvent.action} + {lastEvent.subject}
            </div>
          </div>
        </div>
      )}

      {/* Manual Random Event button */}
      <button
        onClick={handleRandomEvent}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-navy bg-dark-navy px-3 py-2 text-xs text-gray-500 transition-colors hover:border-purple-500/30 hover:text-purple-400"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Roll Random Event
      </button>
    </div>
  )
}
