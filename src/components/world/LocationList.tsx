import { useState, useEffect, useMemo } from 'react'
import {
  Search, X, Plus, MapPin, Users, ScrollText,
  Pencil, StickyNote, Eye, Image, Loader2, Navigation, Maximize2,
  Castle, Swords, TreePine, Landmark, Waves, Shield, Church, Home,
  Mountain, Building2,
} from 'lucide-react'
import Fuse from 'fuse.js'
import { supabase } from '@/lib/supabase'
import { useWorldStore } from '@/stores/worldStore'
import { useTimeStore } from '@/stores/timeStore'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { generateImage } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import type { WorldLocation, LocationType, LocationStatus, Npc, Quest } from '@/types/database'

interface Props {
  campaignId: string
  sessionId: string | null
}

const TYPE_CONFIG: Record<LocationType, { icon: typeof Castle; label: string }> = {
  city: { icon: Castle, label: 'Stad' },
  dungeon: { icon: Swords, label: 'Dungeon' },
  forest: { icon: TreePine, label: 'Skog' },
  ruin: { icon: Landmark, label: 'Ruin' },
  sea: { icon: Waves, label: 'Hav' },
  fort: { icon: Shield, label: 'Fort' },
  temple: { icon: Church, label: 'Tempel' },
  village: { icon: Home, label: 'By' },
  region: { icon: Mountain, label: 'Region' },
  wilderness: { icon: TreePine, label: 'Vildmark' },
  building: { icon: Building2, label: 'Byggnad' },
}

const STATUS_CONFIG: Record<LocationStatus, { color: string; dot: string; label: string; variant: 'default' | 'gold' | 'success' | 'mystic' }> = {
  undiscovered: { color: 'text-gray-500', dot: 'bg-gray-500', label: 'Ej upptäckt', variant: 'default' },
  known: { color: 'text-amber-400', dot: 'bg-amber-400', label: 'Känd', variant: 'gold' },
  visited: { color: 'text-blue-400', dot: 'bg-blue-400', label: 'Besökt', variant: 'mystic' },
  completed: { color: 'text-green-400', dot: 'bg-green-400', label: 'Avslutad', variant: 'success' },
}

const TYPE_FILTERS: (LocationType | 'all')[] = ['all', 'city', 'dungeon', 'forest', 'ruin', 'fort', 'temple', 'village', 'sea']
const STATUS_FILTERS: (LocationStatus | 'all')[] = ['all', 'visited', 'known', 'undiscovered', 'completed']

function isDayTime(hour: number): boolean {
  return hour >= 6 && hour < 20
}

export function LocationList({ campaignId, sessionId }: Props) {
  const { locations, setLocations, currentLocationId, selectedLocationId, setSelectedLocationId, search, setSearch, filterType, setFilterType, filterStatus, setFilterStatus } = useWorldStore()
  const worldTime = useTimeStore((s) => s.worldTime)
  const { rows } = useRealtimeTable<WorldLocation>({ table: 'world_locations', campaignId })
  const { rows: npcs } = useRealtimeTable<Npc>({ table: 'npcs', campaignId })
  const { rows: quests } = useRealtimeTable<Quest>({ table: 'quests', campaignId })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'city' as LocationType, description: '' })
  const [generatingImage, setGeneratingImage] = useState<string | null>(null)

  useEffect(() => {
    setLocations(rows)
  }, [rows, setLocations])

  const fuse = useMemo(
    () => new Fuse(locations, { keys: ['name', 'description', 'terrain'], threshold: 0.3 }),
    [locations],
  )

  const filtered = useMemo(() => {
    let result = search.trim() ? fuse.search(search).map((r) => r.item) : locations
    if (filterType !== 'all') {
      result = result.filter((l) => l.type === filterType)
    }
    if (filterStatus !== 'all') {
      result = result.filter((l) => l.status === filterStatus)
    }
    return result.sort((a, b) => {
      if (a.id === currentLocationId) return -1
      if (b.id === currentLocationId) return 1
      const statusOrder: Record<LocationStatus, number> = { visited: 0, known: 1, undiscovered: 2, completed: 3 }
      return (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4)
    })
  }, [locations, search, filterType, filterStatus, fuse, currentLocationId])

  const selectedLocation = selectedLocationId ? locations.find((l) => l.id === selectedLocationId) : null

  function getNpcsAtLocation(loc: WorldLocation): Npc[] {
    return npcs.filter((n) => n.location_id === loc.id || loc.npcs.includes(n.id))
  }

  function getQuestsAtLocation(loc: WorldLocation): Quest[] {
    return quests.filter((q) => q.target_location_id === loc.id || loc.active_quests.includes(q.id))
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    await supabase.from('world_locations').insert({
      campaign_id: campaignId,
      name: form.name,
      type: form.type,
      description: form.description || null,
      status: 'known',
      discovered: true,
    })
    setForm({ name: '', type: 'city', description: '' })
    setShowForm(false)
  }

  const handleUpdateStatus = async (loc: WorldLocation, status: LocationStatus) => {
    await supabase.from('world_locations').update({
      status,
      discovered: status !== 'undiscovered',
      visit_count: status === 'visited' ? Math.max(loc.visit_count, 1) : loc.visit_count,
    }).eq('id', loc.id)
  }

  const handleSaveField = async (loc: WorldLocation, field: string, value: string) => {
    await supabase.from('world_locations').update({ [field]: value }).eq('id', loc.id)
  }

  const handleAddNote = async (loc: WorldLocation, note: string) => {
    const notes = [...(loc.notes || []), note]
    await supabase.from('world_locations').update({ notes }).eq('id', loc.id)
  }

  const handleRemoveNote = async (loc: WorldLocation, idx: number) => {
    const notes = (loc.notes || []).filter((_, i) => i !== idx)
    await supabase.from('world_locations').update({ notes }).eq('id', loc.id)
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

  const handleTravel = async (loc: WorldLocation) => {
    await supabase.from('campaigns').update({ current_location_id: loc.id }).eq('id', campaignId)
    await handleUpdateStatus(loc, 'visited')
  }

  const inputClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/40 transition-colors'

  if (selectedLocation) {
    return (
      <LocationDetail
        location={selectedLocation}
        isCurrent={selectedLocation.id === currentLocationId}
        isDay={isDayTime(worldTime.hour)}
        npcs={getNpcsAtLocation(selectedLocation)}
        quests={getQuestsAtLocation(selectedLocation)}
        generatingImage={generatingImage === selectedLocation.id}
        onBack={() => setSelectedLocationId(null)}
        onUpdateStatus={handleUpdateStatus}
        onSaveField={handleSaveField}
        onAddNote={handleAddNote}
        onRemoveNote={handleRemoveNote}
        onGenerateImage={() => handleGenerateImage(selectedLocation)}
        onTravel={() => handleTravel(selectedLocation)}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-500">{locations.length} platser</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1 rounded-lg bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
          >
            {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {showForm ? 'Avbryt' : 'Lägg till'}
          </button>
        </div>

        {/* Search */}
        {locations.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" aria-hidden="true" />
            <input
              type="text"
              className={inputClass + ' pl-9'}
              placeholder="Sök plats..."
              aria-label="Sök bland platser"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 focus-ring"
                aria-label="Rensa sökning"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Type filter chips */}
        {locations.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {TYPE_FILTERS.map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`rounded-lg px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  filterType === t
                    ? 'bg-navy text-parchment'
                    : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                {t === 'all' ? 'Alla' : TYPE_CONFIG[t]?.label ?? t}
              </button>
            ))}
          </div>
        )}

        {/* Status filter chips */}
        {locations.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`rounded-lg px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  filterStatus === s
                    ? 'bg-navy text-parchment'
                    : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                {s === 'all' ? 'Status' : STATUS_CONFIG[s]?.label ?? s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-navy bg-dark-navy p-4">
          <input className={inputClass} placeholder="Platsnamn *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className={inputClass + ' w-auto'} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LocationType })}>
            {Object.entries(TYPE_CONFIG).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <textarea className={inputClass + ' resize-none'} rows={2} placeholder="Beskrivning" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button type="submit" className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-dark-navy hover:bg-gold-light transition-colors">Lägg till</button>
        </form>
      )}

      {/* Location cards */}
      {locations.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-10 w-10" />}
          title="Inga platser ännu"
          description="Platser du besöker eller hör talas om dyker upp här. Lägg till manuellt eller låt DM:en skapa dem under spel."
          cta="Lägg till plats"
          onAction={() => setShowForm(true)}
        />
      ) : filtered.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-600">Inga platser matchar din sökning.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              isCurrent={loc.id === currentLocationId}
              isDay={isDayTime(worldTime.hour)}
              npcCount={getNpcsAtLocation(loc).length}
              questCount={getQuestsAtLocation(loc).length}
              onClick={() => setSelectedLocationId(loc.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LocationCard({
  location,
  isCurrent,
  isDay,
  npcCount,
  questCount,
  onClick,
}: {
  location: WorldLocation
  isCurrent: boolean
  isDay: boolean
  npcCount: number
  questCount: number
  onClick: () => void
}) {
  const typeConf = TYPE_CONFIG[location.type] || TYPE_CONFIG.building
  const statusConf = STATUS_CONFIG[location.status] || STATUS_CONFIG.undiscovered
  const Icon = typeConf.icon

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-xl border bg-dark-navy p-3 transition-all hover:border-gold/20 hover:shadow-card-hover ${
        isCurrent ? 'border-gold/30' : 'border-navy'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-navy bg-midnight ${statusConf.color}`}>
          <Icon className="h-5 w-5" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${statusConf.dot}`} />
            <span className="font-medium text-parchment truncate">{location.name}</span>
            {isCurrent && (
              <span className="shrink-0 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-medium text-gold">
                HÄR
              </span>
            )}
          </div>

          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
            <span>{typeConf.label}</span>
            {location.description && (
              <>
                <span className="text-gray-700">·</span>
                <span className="truncate">{location.description.slice(0, 40)}{location.description.length > 40 ? '…' : ''}</span>
              </>
            )}
          </div>
        </div>

        {/* Day/night indicator */}
        <span className="shrink-0 text-sm" title={isDay ? 'Dag' : 'Natt'}>
          {isDay ? '☀️' : '🌙'}
        </span>
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center gap-2">
        <Badge variant={statusConf.variant} size="sm" dot>{statusConf.label}</Badge>
        {npcCount > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
            <Users className="h-3 w-3" />
            {npcCount}
          </span>
        )}
        {questCount > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
            <ScrollText className="h-3 w-3" />
            {questCount}
          </span>
        )}
      </div>
    </div>
  )
}

function LocationDetail({
  location,
  isCurrent,
  isDay,
  npcs,
  quests,
  generatingImage,
  onBack,
  onUpdateStatus,
  onSaveField,
  onAddNote,
  onRemoveNote,
  onGenerateImage,
  onTravel,
}: {
  location: WorldLocation
  isCurrent: boolean
  isDay: boolean
  npcs: Npc[]
  quests: Quest[]
  generatingImage: boolean
  onBack: () => void
  onUpdateStatus: (loc: WorldLocation, status: LocationStatus) => void
  onSaveField: (loc: WorldLocation, field: string, value: string) => void
  onAddNote: (loc: WorldLocation, note: string) => void
  onRemoveNote: (loc: WorldLocation, idx: number) => void
  onGenerateImage: () => void
  onTravel: () => void
}) {
  const typeConf = TYPE_CONFIG[location.type] || TYPE_CONFIG.building
  const statusConf = STATUS_CONFIG[location.status] || STATUS_CONFIG.undiscovered
  const Icon = typeConf.icon
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(location.name)
  const [editDesc, setEditDesc] = useState(location.description ?? '')
  const [editType, setEditType] = useState(location.type)
  const [noteInput, setNoteInput] = useState('')
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    setEditName(location.name)
    setEditDesc(location.description ?? '')
    setEditType(location.type)
  }, [location])

  const handleSaveEdit = () => {
    if (editName.trim() !== location.name) onSaveField(location, 'name', editName.trim())
    if (editDesc !== (location.description ?? '')) onSaveField(location, 'description', editDesc)
    if (editType !== location.type) onSaveField(location, 'type', editType)
    setEditing(false)
  }

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteInput.trim()) return
    onAddNote(location, noteInput.trim())
    setNoteInput('')
  }

  const inputClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/40 transition-colors'

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-parchment transition-colors"
      >
        ← Tillbaka
      </button>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-navy bg-midnight ${statusConf.color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input className={inputClass} value={editName} onChange={(e) => setEditName(e.target.value)} />
          ) : (
            <h2 className="font-display text-lg font-bold text-parchment">{location.name}</h2>
          )}
          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
            {editing ? (
              <select className={inputClass + ' w-auto text-xs py-1'} value={editType} onChange={(e) => setEditType(e.target.value as LocationType)}>
                {Object.entries(TYPE_CONFIG).map(([val, { label }]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            ) : (
              <span>{typeConf.label}</span>
            )}
            <span className="text-gray-700">·</span>
            <Badge variant={statusConf.variant} size="sm" dot>{statusConf.label}</Badge>
            <span className="text-gray-700">·</span>
            <span>{isDay ? '☀️ Dag' : '🌙 Natt'}</span>
          </div>
        </div>
      </div>

      {/* Image */}
      {location.image_url ? (
        <>
          <div
            className="group relative w-full h-40 cursor-zoom-in overflow-hidden rounded-lg border border-navy"
            onClick={() => setLightbox(true)}
          >
            <img
              src={location.image_url}
              alt={location.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
              <Maximize2 className="h-6 w-6 text-white drop-shadow" />
            </div>
          </div>

          {lightbox && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
              onClick={() => setLightbox(false)}
            >
              <button
                className="absolute top-4 right-4 rounded-lg bg-black/60 p-2 text-gray-300 hover:text-white transition-colors"
                onClick={() => setLightbox(false)}
                aria-label="Stäng"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={location.image_url}
                alt={location.name}
                className="max-h-[90vh] max-w-[90vw] rounded-xl border border-navy object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-gray-400">{location.name}</p>
            </div>
          )}
        </>
      ) : (
        <button
          onClick={onGenerateImage}
          disabled={generatingImage}
          className="w-full h-24 border-2 border-dashed border-navy rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-gray-500 transition-colors disabled:opacity-50"
        >
          {generatingImage ? (
            <Loader2 className="h-5 w-5 text-gray-500 animate-spin" />
          ) : (
            <Image className="h-5 w-5 text-gray-500" />
          )}
          <span className="text-xs text-gray-500">
            {generatingImage ? 'Genererar...' : 'Generera bild'}
          </span>
        </button>
      )}

      {/* Description */}
      {editing ? (
        <textarea
          className={inputClass + ' resize-none'}
          rows={3}
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          placeholder="Beskrivning..."
        />
      ) : location.description ? (
        <p className="text-sm text-gray-300 leading-relaxed font-body italic">
          {location.description}
        </p>
      ) : (
        <p className="text-sm text-gray-600 italic">Ingen beskrivning.</p>
      )}

      {/* Status selector */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status</h4>
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(STATUS_CONFIG) as [LocationStatus, typeof STATUS_CONFIG.undiscovered][]).map(([s, conf]) => (
            <button
              key={s}
              onClick={() => onUpdateStatus(location, s)}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors border ${
                location.status === s
                  ? `${conf.color} border-current bg-current/10`
                  : 'text-gray-600 border-transparent hover:text-gray-400'
              }`}
            >
              {conf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visit count & danger */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          Besökt {location.visit_count} {location.visit_count === 1 ? 'gång' : 'gånger'}
        </span>
        {location.danger_level > 1 && (
          <span className="text-amber-500">
            {'☠'.repeat(location.danger_level)} Fara {location.danger_level}/5
          </span>
        )}
      </div>

      {/* Linked NPCs */}
      {npcs.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <Users className="h-3 w-3" />
            NPCer ({npcs.length})
          </h4>
          <div className="space-y-1">
            {npcs.map((npc) => (
              <div
                key={npc.id}
                className={`flex items-center gap-2 rounded-lg bg-midnight/50 px-2.5 py-1.5 ${!npc.is_alive ? 'opacity-50' : ''}`}
              >
                {npc.portrait_url ? (
                  <img src={npc.portrait_url} alt={npc.name} className="h-6 w-6 rounded object-cover border border-navy" />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded border border-navy bg-navy text-[10px] font-display text-gold/40">
                    {npc.name.charAt(0)}
                  </div>
                )}
                <span className="text-sm text-parchment truncate">{npc.name}</span>
                {npc.occupation && <span className="text-xs text-gray-500 truncate">{npc.occupation}</span>}
                <span className={`ml-auto text-[10px] ${
                  npc.disposition === 'friendly' ? 'text-green-400' : npc.disposition === 'hostile' ? 'text-red-400' : 'text-gray-500'
                }`}>
                  {npc.disposition === 'friendly' ? 'Vänlig' : npc.disposition === 'hostile' ? 'Fientlig' : 'Neutral'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked Quests */}
      {quests.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <ScrollText className="h-3 w-3" />
            Uppdrag ({quests.length})
          </h4>
          <div className="space-y-1">
            {quests.map((q) => (
              <div key={q.id} className="flex items-center gap-2 rounded-lg bg-midnight/50 px-2.5 py-1.5">
                <span className={`h-2 w-2 rounded-full ${
                  q.status === 'active' ? 'bg-blue-400' : q.status === 'completed' ? 'bg-green-400' : q.status === 'failed' ? 'bg-red-400' : 'bg-amber-400'
                }`} />
                <span className="text-sm text-parchment truncate">{q.title}</span>
                <span className="ml-auto text-[10px] text-gray-500 capitalize">{q.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
          <StickyNote className="h-3 w-3" />
          Noteringar
        </h4>
        {(location.notes || []).length > 0 && (
          <div className="space-y-1 mb-2">
            {location.notes.map((note, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-midnight/50 px-2.5 py-1.5">
                <span className="text-sm text-gray-300 flex-1">{note}</span>
                <button
                  onClick={() => onRemoveNote(location, i)}
                  className="shrink-0 text-gray-600 hover:text-red-400 transition-colors focus-ring"
                  aria-label="Ta bort notering"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleAddNote} className="flex gap-2">
          <input
            className={inputClass + ' flex-1'}
            placeholder="Lägg till notering..."
            aria-label="Ny notering"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!noteInput.trim()}
            className="rounded-lg bg-navy px-3 py-2 text-xs text-parchment hover:bg-gold/10 transition-colors disabled:opacity-30 focus-ring"
            aria-label="Lägg till notering"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </form>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-navy">
        {!isCurrent && (
          <button
            onClick={onTravel}
            className="flex items-center gap-1.5 rounded-lg bg-gold/10 px-3 py-2 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
          >
            <Navigation className="h-3.5 w-3.5" />
            Res hit
          </button>
        )}
        <button
          onClick={() => {
            if (editing) handleSaveEdit()
            else setEditing(true)
          }}
          className="flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-xs font-medium text-parchment hover:bg-gold/10 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          {editing ? 'Spara' : 'Redigera'}
        </button>
        {editing && (
          <button
            onClick={() => { setEditing(false); setEditName(location.name); setEditDesc(location.description ?? ''); setEditType(location.type) }}
            className="flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-xs font-medium text-gray-500 hover:text-parchment transition-colors"
          >
            Avbryt
          </button>
        )}
      </div>
    </div>
  )
}
