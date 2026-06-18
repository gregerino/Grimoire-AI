import { useState } from 'react'
import { X, Navigation, AlertTriangle, Loader2 } from 'lucide-react'
import { startTravel } from '@/lib/api'
import type { WorldLocation } from '@/types/database'

interface Props {
  from: WorldLocation
  to: WorldLocation
  campaignId: string
  sessionId: string | null
  onClose: () => void
  onTravelComplete: (result: TravelResult) => void
}

interface TravelResult {
  duration: number
  encounter: {
    triggered: boolean
    event: { type: string; action: string; subject: string } | null
    fateResult: { answer: string; roll: number }
  }
  from: { id: string; name: string }
  to: { id: string; name: string }
}

const TERRAIN_LABELS: Record<string, string> = {
  plains: 'Plains',
  forest: 'Forest',
  mountain: 'Mountain',
  desert: 'Desert',
  swamp: 'Swamp',
  coastal: 'Coastal',
  underground: 'Underground',
  urban: 'Urban',
  arctic: 'Arctic',
}

export function TravelDialog({ from, to, campaignId, sessionId, onClose, onTravelComplete }: Props) {
  const [traveling, setTraveling] = useState(false)

  const dangerLevel = Math.max(from.danger_level, to.danger_level)
  const terrain = to.terrain || 'plains'

  const dx = to.coordinates_x - from.coordinates_x
  const dy = to.coordinates_y - from.coordinates_y
  const distance = Math.sqrt(dx * dx + dy * dy)

  const terrainSpeed: Record<string, number> = {
    plains: 1.0, forest: 1.5, mountain: 2.0, desert: 1.8, swamp: 2.0,
    coastal: 1.2, underground: 1.5, urban: 0.5, arctic: 1.8,
  }
  const estimatedHours = Math.max(0.5, Math.round((distance / 100) * (terrainSpeed[terrain] || 1) * 2) / 2)

  async function handleEmbark() {
    setTraveling(true)
    try {
      const result = await startTravel(campaignId, from.id, to.id, sessionId || undefined)
      onTravelComplete(result)
    } catch (err) {
      console.error('Travel failed:', err)
      setTraveling(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-sm shadow-2xl">
        <div className="p-4 border-b border-stone-700/50 flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-amber-400" />
            Travel
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded">
            <X className="w-4 h-4 text-stone-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-sm font-medium text-stone-300">{from.name}</p>
              <p className="text-[10px] text-stone-600 uppercase">{from.type}</p>
            </div>
            <div className="px-3">
              <span className="text-stone-600">→</span>
            </div>
            <div className="text-center flex-1">
              <p className="text-sm font-medium text-stone-300">{to.name}</p>
              <p className="text-[10px] text-stone-600 uppercase">{to.type}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-stone-800/50 rounded p-2">
              <p className="text-xs text-stone-500">Terrain</p>
              <p className="text-sm text-stone-300">{TERRAIN_LABELS[terrain]}</p>
            </div>
            <div className="bg-stone-800/50 rounded p-2">
              <p className="text-xs text-stone-500">Duration</p>
              <p className="text-sm text-stone-300">~{estimatedHours}h</p>
            </div>
            <div className="bg-stone-800/50 rounded p-2">
              <p className="text-xs text-stone-500">Danger</p>
              <p className="text-sm">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={i < dangerLevel ? 'text-red-400' : 'text-stone-700'}>☠</span>
                ))}
              </p>
            </div>
          </div>

          {dangerLevel >= 4 && (
            <div className="flex items-center gap-2 p-2 bg-red-900/20 border border-red-800/30 rounded text-xs text-red-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>High danger area. Random encounters are likely.</span>
            </div>
          )}

          <button
            onClick={handleEmbark}
            disabled={traveling}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {traveling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Traveling...
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                Embark
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
