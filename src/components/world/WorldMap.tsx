import { useState, useRef, useCallback, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, Compass } from 'lucide-react'
import { useWorldStore } from '@/stores/worldStore'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { LocationDetail } from './LocationDetail'
import { TravelDialog } from './TravelDialog'
import type { WorldLocation } from '@/types/database'

interface Props {
  campaignId: string
  currentLocationId: string | null
  sessionId: string | null
  onClose: () => void
  onSendMessage: (message: string) => void
}

const LOCATION_ICONS: Record<string, string> = {
  region: '🏔',
  city: '🏰',
  dungeon: '⚔',
  wilderness: '🌲',
  building: '🏠',
}

const LOCATION_RADIUS: Record<string, number> = {
  region: 18,
  city: 14,
  dungeon: 11,
  wilderness: 11,
  building: 9,
}

const MAP_WIDTH = 1000
const MAP_HEIGHT = 800

export function WorldMap({ campaignId, currentLocationId, sessionId, onClose, onSendMessage }: Props) {
  const { locations, setLocations, setCurrentLocationId } = useWorldStore()
  const { rows } = useRealtimeTable<WorldLocation>({ table: 'world_locations', campaignId })

  useEffect(() => {
    setLocations(rows)
  }, [rows, setLocations])

  useEffect(() => {
    setCurrentLocationId(currentLocationId)
  }, [currentLocationId, setCurrentLocationId])

  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT })
  const [selectedLocation, setSelectedLocation] = useState<WorldLocation | null>(null)
  const [travelTarget, setTravelTarget] = useState<WorldLocation | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as SVGElement).closest('[data-location]')) return
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }, [viewBox])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !dragStart.current || !svgRef.current) return
    const svg = svgRef.current
    const rect = svg.getBoundingClientRect()
    const scaleX = viewBox.w / rect.width
    const scaleY = viewBox.h / rect.height
    const dx = (e.clientX - dragStart.current.x) * scaleX
    const dy = (e.clientY - dragStart.current.y) * scaleY
    setViewBox((v) => ({ ...v, x: dragStart.current!.vx - dx, y: dragStart.current!.vy - dy }))
  }, [dragging, viewBox.w, viewBox.h])

  const handlePointerUp = useCallback(() => {
    setDragging(false)
    dragStart.current = null
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 1.15 : 0.87
    setViewBox((v) => {
      const newW = Math.max(200, Math.min(MAP_WIDTH * 3, v.w * factor))
      const newH = Math.max(160, Math.min(MAP_HEIGHT * 3, v.h * factor))
      const cx = v.x + v.w / 2
      const cy = v.y + v.h / 2
      return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH }
    })
  }, [])

  function zoom(direction: 'in' | 'out') {
    const factor = direction === 'in' ? 0.75 : 1.33
    setViewBox((v) => {
      const newW = Math.max(200, Math.min(MAP_WIDTH * 3, v.w * factor))
      const newH = Math.max(160, Math.min(MAP_HEIGHT * 3, v.h * factor))
      const cx = v.x + v.w / 2
      const cy = v.y + v.h / 2
      return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH }
    })
  }

  function resetView() {
    setViewBox({ x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT })
  }

  function handleTravelComplete(result: {
    encounter: { triggered: boolean; event: { type: string; action: string; subject: string } | null }
    from: { name: string }
    to: { name: string }
    duration: number
  }) {
    setTravelTarget(null)
    setSelectedLocation(null)

    const encounterInfo = result.encounter.triggered && result.encounter.event
      ? `, encounter triggered: ${result.encounter.event.type} — ${result.encounter.event.action} ${result.encounter.event.subject}`
      : ', peaceful journey'

    onSendMessage(
      `[Travel: ${result.from.name} to ${result.to.name}, duration: ${result.duration}h${encounterInfo}]`,
    )
  }

  const discovered = locations.filter((l) => l.discovered)
  const undiscovered = locations.filter((l) => !l.discovered)

  return (
    <div className="fixed inset-0 z-40 bg-stone-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-stone-900 border-b border-stone-800">
        <h2 className="text-sm font-bold text-stone-200 flex items-center gap-2">
          <Compass className="w-4 h-4 text-amber-400" />
          World Map
          <span className="text-xs text-stone-500 font-normal">
            {discovered.length} location{discovered.length !== 1 ? 's' : ''} discovered
          </span>
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={() => zoom('in')} className="p-1.5 hover:bg-stone-800 rounded" title="Zoom in">
            <ZoomIn className="w-4 h-4 text-stone-400" />
          </button>
          <button onClick={() => zoom('out')} className="p-1.5 hover:bg-stone-800 rounded" title="Zoom out">
            <ZoomOut className="w-4 h-4 text-stone-400" />
          </button>
          <button onClick={resetView} className="p-1.5 hover:bg-stone-800 rounded" title="Reset view">
            <Compass className="w-4 h-4 text-stone-400" />
          </button>
          <div className="w-px h-5 bg-stone-700 mx-1" />
          <button onClick={onClose} className="p-1.5 hover:bg-stone-800 rounded">
            <X className="w-4 h-4 text-stone-400" />
          </button>
        </div>
      </div>

      {/* Map SVG */}
      <div className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing">
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="w-full h-full"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          style={{ touchAction: 'none' }}
        >
          <defs>
            <filter id="fog-blur">
              <feGaussianBlur stdDeviation="4" />
            </filter>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="parchment">
              <stop offset="0%" stopColor="#2a2520" />
              <stop offset="100%" stopColor="#1a1815" />
            </radialGradient>
            <pattern id="parchment-texture" patternUnits="userSpaceOnUse" width="200" height="200">
              <rect width="200" height="200" fill="url(#parchment)" />
              <circle cx="50" cy="50" r="1" fill="#3a352f" opacity="0.3" />
              <circle cx="150" cy="100" r="1.5" fill="#3a352f" opacity="0.2" />
              <circle cx="80" cy="170" r="1" fill="#3a352f" opacity="0.25" />
            </pattern>
          </defs>

          {/* Background */}
          <rect
            x={viewBox.x - 500}
            y={viewBox.y - 500}
            width={viewBox.w + 1000}
            height={viewBox.h + 1000}
            fill="url(#parchment-texture)"
          />

          {/* Connection edges */}
          {discovered.map((loc) =>
            loc.connected_locations.map((connId) => {
              const conn = locations.find((l) => l.id === connId)
              if (!conn || conn.id < loc.id) return null
              const bothDiscovered = loc.discovered && conn.discovered
              return (
                <line
                  key={`${loc.id}-${connId}`}
                  x1={loc.coordinates_x}
                  y1={loc.coordinates_y}
                  x2={conn.coordinates_x}
                  y2={conn.coordinates_y}
                  stroke={bothDiscovered ? '#78716c' : '#44403c'}
                  strokeWidth={bothDiscovered ? 1.5 : 1}
                  strokeDasharray={bothDiscovered ? 'none' : '4 4'}
                  opacity={bothDiscovered ? 0.6 : 0.2}
                />
              )
            }),
          )}

          {/* Undiscovered locations (foggy) */}
          {undiscovered.map((loc) => (
            <g key={loc.id} opacity={0.15} filter="url(#fog-blur)">
              <circle
                cx={loc.coordinates_x}
                cy={loc.coordinates_y}
                r={LOCATION_RADIUS[loc.type] || 10}
                fill="#57534e"
                stroke="#44403c"
                strokeWidth={1}
              />
            </g>
          ))}

          {/* Discovered locations */}
          {discovered.map((loc) => {
            const isCurrent = loc.id === currentLocationId
            const radius = LOCATION_RADIUS[loc.type] || 10

            return (
              <g
                key={loc.id}
                data-location={loc.id}
                className="cursor-pointer"
                onClick={() => setSelectedLocation(loc)}
              >
                {isCurrent && (
                  <circle
                    cx={loc.coordinates_x}
                    cy={loc.coordinates_y}
                    r={radius + 6}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    opacity={0.6}
                    filter="url(#glow)"
                  >
                    <animate
                      attributeName="r"
                      values={`${radius + 4};${radius + 8};${radius + 4}`}
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.6;0.3;0.6"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  cx={loc.coordinates_x}
                  cy={loc.coordinates_y}
                  r={radius}
                  fill={isCurrent ? '#78350f' : '#292524'}
                  stroke={isCurrent ? '#f59e0b' : '#78716c'}
                  strokeWidth={isCurrent ? 2 : 1.5}
                  className="transition-colors hover:fill-stone-700"
                />
                <text
                  x={loc.coordinates_x}
                  y={loc.coordinates_y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={radius * 0.9}
                  className="pointer-events-none select-none"
                >
                  {LOCATION_ICONS[loc.type] || '📍'}
                </text>
                <text
                  x={loc.coordinates_x}
                  y={loc.coordinates_y + radius + 12}
                  textAnchor="middle"
                  dominantBaseline="hanging"
                  fontSize={9}
                  fill={isCurrent ? '#fbbf24' : '#a8a29e'}
                  fontFamily="serif"
                  className="pointer-events-none select-none"
                >
                  {loc.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Location detail panel */}
      {selectedLocation && (
        <LocationDetail
          location={selectedLocation}
          campaignId={campaignId}
          sessionId={sessionId}
          currentLocationId={currentLocationId}
          onClose={() => setSelectedLocation(null)}
          onTravel={(to) => {
            setTravelTarget(to)
          }}
        />
      )}

      {/* Travel dialog */}
      {travelTarget && currentLocationId && (
        <TravelDialog
          from={locations.find((l) => l.id === currentLocationId)!}
          to={travelTarget}
          campaignId={campaignId}
          sessionId={sessionId}
          onClose={() => setTravelTarget(null)}
          onTravelComplete={handleTravelComplete}
        />
      )}
    </div>
  )
}
