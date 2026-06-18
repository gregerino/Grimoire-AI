import { useState } from 'react'
import { X, MapPin, Users, ScrollText, Navigation, Image, Eye } from 'lucide-react'
import { useWorldStore } from '@/stores/worldStore'
import { generateImage } from '@/lib/api'
import type { WorldLocation } from '@/types/database'

interface Props {
  location: WorldLocation
  campaignId: string
  sessionId: string | null
  onClose: () => void
  onTravel: (to: WorldLocation) => void
  currentLocationId: string | null
}

const TYPE_LABELS: Record<string, string> = {
  region: 'Region',
  city: 'City',
  dungeon: 'Dungeon',
  wilderness: 'Wilderness',
  building: 'Building',
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

export function LocationDetail({ location, campaignId, sessionId, onClose, onTravel, currentLocationId }: Props) {
  const [generatingImage, setGeneratingImage] = useState(false)
  const { getConnectedLocations, updateLocation } = useWorldStore()
  const connected = getConnectedLocations(location.id)
  const isCurrentLocation = location.id === currentLocationId

  async function handleGenerateImage() {
    setGeneratingImage(true)
    try {
      const result = await generateImage(campaignId, 'location', {
        name: location.name,
        description: location.description || '',
      }, sessionId)
      if (result.url) {
        updateLocation(location.id, { image_url: result.url })
      }
    } catch (err) {
      console.error('Failed to generate location image:', err)
    } finally {
      setGeneratingImage(false)
    }
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-stone-900 border-b border-stone-700/50 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-100">{location.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-stone-500">{TYPE_LABELS[location.type] || location.type}</span>
              {location.terrain && (
                <>
                  <span className="text-xs text-stone-700">·</span>
                  <span className="text-xs text-stone-500">{TERRAIN_LABELS[location.terrain]}</span>
                </>
              )}
              {location.danger_level > 1 && (
                <>
                  <span className="text-xs text-stone-700">·</span>
                  <span className="text-xs text-amber-500">
                    {'☠'.repeat(location.danger_level)}
                  </span>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded">
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {location.image_url ? (
            <img
              src={location.image_url}
              alt={location.name}
              className="w-full h-48 object-cover rounded-lg border border-stone-700"
            />
          ) : (
            <button
              onClick={handleGenerateImage}
              disabled={generatingImage}
              className="w-full h-32 border-2 border-dashed border-stone-700 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-stone-500 transition-colors disabled:opacity-50"
            >
              <Image className="w-6 h-6 text-stone-500" />
              <span className="text-xs text-stone-500">
                {generatingImage ? 'Generating...' : 'Generate Location Image'}
              </span>
            </button>
          )}

          {location.description && (
            <p className="text-sm text-stone-300 leading-relaxed">{location.description}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Visited {location.visit_count} {location.visit_count === 1 ? 'time' : 'times'}
            </span>
            {isCurrentLocation && (
              <span className="flex items-center gap-1 text-amber-400">
                <MapPin className="w-3 h-3" />
                You are here
              </span>
            )}
          </div>

          {connected.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                Connected Locations
              </h3>
              <div className="space-y-1">
                {connected.map((conn) => (
                  <div
                    key={conn.id}
                    className="flex items-center justify-between p-2 bg-stone-800/50 rounded border border-stone-700/30"
                  >
                    <div>
                      <span className="text-sm text-stone-300">{conn.name}</span>
                      <span className="text-xs text-stone-600 ml-2">{TYPE_LABELS[conn.type]}</span>
                    </div>
                    {!isCurrentLocation ? null : (
                      <button
                        onClick={() => onTravel(conn)}
                        className="text-xs px-2 py-1 bg-amber-600/20 text-amber-400 rounded hover:bg-amber-600/30 transition-colors"
                      >
                        Travel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {location.npcs.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" />
                NPCs Here ({location.npcs.length})
              </h3>
            </div>
          )}

          {location.active_quests.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                <ScrollText className="w-3 h-3" />
                Active Quests ({location.active_quests.length})
              </h3>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
