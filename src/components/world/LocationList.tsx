import { useState, useEffect } from 'react'
import { MapPin, Image, Loader2, ChevronDown, ChevronRight, Users, Eye } from 'lucide-react'
import { useWorldStore } from '@/stores/worldStore'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { generateImage } from '@/lib/api'
import type { WorldLocation, Npc } from '@/types/database'

interface Props {
  campaignId: string
  sessionId: string | null
}

const LOCATION_ICONS: Record<string, string> = {
  region: '🏔',
  city: '🏰',
  dungeon: '⚔',
  wilderness: '🌲',
  building: '🏠',
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

export function LocationList({ campaignId, sessionId }: Props) {
  const { locations, setLocations, currentLocationId } = useWorldStore()
  const { rows } = useRealtimeTable<WorldLocation>({ table: 'world_locations', campaignId })
  const { rows: npcs } = useRealtimeTable<Npc>({ table: 'npcs', campaignId })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [generatingImage, setGeneratingImage] = useState<string | null>(null)

  useEffect(() => {
    setLocations(rows)
  }, [rows, setLocations])

  const visited = locations
    .filter((l) => l.discovered && l.visit_count > 0)
    .sort((a, b) => {
      if (a.id === currentLocationId) return -1
      if (b.id === currentLocationId) return 1
      return b.visit_count - a.visit_count
    })

  function getNpcsAtLocation(location: WorldLocation): Npc[] {
    return npcs.filter(
      (npc) => npc.location_id === location.id || location.npcs.includes(npc.id),
    )
  }

  async function handleGenerateImage(location: WorldLocation) {
    setGeneratingImage(location.id)
    try {
      const result = await generateImage(campaignId, 'location', {
        name: location.name,
        description: location.description || '',
      }, sessionId)
      if (result.url) {
        useWorldStore.getState().updateLocation(location.id, { image_url: result.url })
      }
    } catch (err) {
      console.error('Failed to generate location image:', err)
    } finally {
      setGeneratingImage(null)
    }
  }

  if (visited.length === 0) {
    return (
      <div className="py-8 text-center">
        <MapPin className="mx-auto mb-2 h-8 w-8 text-gray-600" />
        <p className="text-sm text-gray-500">No locations visited yet.</p>
        <p className="mt-1 text-xs text-gray-600">Locations will appear here as you explore the world.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-500">
        {visited.length} location{visited.length !== 1 ? 's' : ''} visited
      </h3>

      {visited.map((location) => {
        const isExpanded = expandedId === location.id
        const isCurrent = location.id === currentLocationId
        const locationNpcs = getNpcsAtLocation(location)

        return (
          <div
            key={location.id}
            className={`rounded-xl border bg-dark-navy transition-all ${
              isCurrent ? 'border-gold/30' : 'border-navy'
            }`}
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : location.id)}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              <span className="text-lg">{LOCATION_ICONS[location.type] || '📍'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-parchment truncate">{location.name}</span>
                  {isCurrent && (
                    <span className="shrink-0 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-medium text-gold">
                      HERE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{TYPE_LABELS[location.type]}</span>
                  {location.terrain && (
                    <>
                      <span className="text-xs text-gray-700">·</span>
                      <span className="text-xs text-gray-500">{TERRAIN_LABELS[location.terrain]}</span>
                    </>
                  )}
                  {locationNpcs.length > 0 && (
                    <>
                      <span className="text-xs text-gray-700">·</span>
                      <span className="flex items-center gap-0.5 text-xs text-gray-500">
                        <Users className="h-3 w-3" />
                        {locationNpcs.length}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-navy px-3 pb-3 pt-2 space-y-3">
                {/* Image */}
                {location.image_url ? (
                  <img
                    src={location.image_url}
                    alt={location.name}
                    className="w-full h-40 object-cover rounded-lg border border-navy"
                  />
                ) : (
                  <button
                    onClick={() => handleGenerateImage(location)}
                    disabled={generatingImage === location.id}
                    className="w-full h-24 border-2 border-dashed border-navy rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-gray-500 transition-colors disabled:opacity-50"
                  >
                    {generatingImage === location.id ? (
                      <Loader2 className="h-5 w-5 text-gray-500 animate-spin" />
                    ) : (
                      <Image className="h-5 w-5 text-gray-500" />
                    )}
                    <span className="text-xs text-gray-500">
                      {generatingImage === location.id ? 'Generating...' : 'Generate Image'}
                    </span>
                  </button>
                )}

                {/* Description */}
                {location.description && (
                  <p className="text-sm text-gray-300 leading-relaxed">{location.description}</p>
                )}

                {/* Visit count */}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Eye className="h-3 w-3" />
                  Visited {location.visit_count} {location.visit_count === 1 ? 'time' : 'times'}
                  {location.danger_level > 1 && (
                    <span className="ml-2 text-amber-500">
                      {'☠'.repeat(location.danger_level)}
                    </span>
                  )}
                </div>

                {/* NPCs at this location */}
                {locationNpcs.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      NPCs
                    </h4>
                    <div className="space-y-1">
                      {locationNpcs.map((npc) => (
                        <div
                          key={npc.id}
                          className={`flex items-center gap-2 rounded-lg bg-midnight/50 px-2.5 py-1.5 ${
                            !npc.is_alive ? 'opacity-50' : ''
                          }`}
                        >
                          {npc.portrait_url && (
                            <img
                              src={npc.portrait_url}
                              alt={npc.name}
                              className="h-6 w-6 rounded object-cover border border-navy"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="text-sm text-parchment">{npc.name}</span>
                            {npc.occupation && (
                              <span className="ml-1.5 text-xs text-gray-500">{npc.occupation}</span>
                            )}
                          </div>
                          <span
                            className={`text-[10px] ${
                              npc.disposition === 'friendly'
                                ? 'text-green-400'
                                : npc.disposition === 'hostile'
                                  ? 'text-red-400'
                                  : 'text-gray-500'
                            }`}
                          >
                            {npc.disposition}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
