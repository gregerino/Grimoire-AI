import { create } from 'zustand'
import type { WorldLocation } from '@/types/database'

interface LocationTreeNode extends WorldLocation {
  children: LocationTreeNode[]
}

interface WorldState {
  locations: WorldLocation[]
  currentLocationId: string | null
  loading: boolean

  setLocations: (locations: WorldLocation[]) => void
  setCurrentLocationId: (id: string | null) => void
  addLocation: (location: WorldLocation) => void
  updateLocation: (id: string, updates: Partial<WorldLocation>) => void
  removeLocation: (id: string) => void
  getLocationTree: () => LocationTreeNode[]
  getDiscoveredLocations: () => WorldLocation[]
  getLocationById: (id: string) => WorldLocation | undefined
  getConnectedLocations: (id: string) => WorldLocation[]
}

export const useWorldStore = create<WorldState>((set, get) => ({
  locations: [],
  currentLocationId: null,
  loading: false,

  setLocations: (locations) => set({ locations }),
  setCurrentLocationId: (id) => set({ currentLocationId: id }),

  addLocation: (location) =>
    set((state) => ({ locations: [...state.locations, location] })),

  updateLocation: (id, updates) =>
    set((state) => ({
      locations: state.locations.map((l) =>
        l.id === id ? { ...l, ...updates } : l,
      ),
    })),

  removeLocation: (id) =>
    set((state) => ({
      locations: state.locations.filter((l) => l.id !== id),
    })),

  getLocationTree: () => {
    const { locations } = get()
    const map = new Map<string, LocationTreeNode>()
    const roots: LocationTreeNode[] = []

    for (const loc of locations) {
      map.set(loc.id, { ...loc, children: [] })
    }

    for (const node of map.values()) {
      if (node.parent_id && map.has(node.parent_id)) {
        map.get(node.parent_id)!.children.push(node)
      } else {
        roots.push(node)
      }
    }

    return roots
  },

  getDiscoveredLocations: () => get().locations.filter((l) => l.discovered),

  getLocationById: (id) => get().locations.find((l) => l.id === id),

  getConnectedLocations: (id) => {
    const location = get().locations.find((l) => l.id === id)
    if (!location) return []
    return get().locations.filter((l) => location.connected_locations.includes(l.id))
  },
}))
