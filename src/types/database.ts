export interface User {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export type AiProvider = 'claude' | 'openai'

export interface Campaign {
  id: string
  user_id: string
  name: string
  description: string | null
  setting: string | null
  character_name: string | null
  character_class: string | null
  character_level: number
  ai_provider: AiProvider
  chaos_factor: number
  current_hp: number | null
  max_hp: number | null
  image_generation_enabled: boolean
  current_location_id: string | null
  world_day: number
  world_hour: number
  status: 'active' | 'paused' | 'completed'
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  campaign_id: string
  title: string | null
  summary: string | null
  started_at: string
  ended_at: string | null
}

export interface Npc {
  id: string
  campaign_id: string
  name: string
  description: string | null
  race: string | null
  occupation: string | null
  disposition: 'friendly' | 'neutral' | 'hostile'
  is_alive: boolean
  notes: string | null
  location: string | null
  backstory: string | null
  relationship: string | null
  portrait_url: string | null
  last_seen_session_id: string | null
  location_id: string | null
  created_at: string
}

export interface QuestReward {
  gp?: number
  items?: string[]
  reputation?: { factionId: string; change: number }
  narrative?: string
}

export interface QuestUpdate {
  timestamp: string
  text: string
}

export interface Quest {
  id: string
  campaign_id: string
  title: string
  description: string | null
  status: 'rumor' | 'active' | 'completed' | 'failed'
  priority: 'main' | 'side' | 'personal'
  source_npc_id: string | null
  target_location_id: string | null
  reward: QuestReward | null
  updates: QuestUpdate[]
  created_at: string
  completed_at: string | null
  updated_at: string
}

export type MemoryCategory = 'plot' | 'npc' | 'world' | 'character' | 'item'
export type MemoryImportance = 'high' | 'medium' | 'low'

export interface MemoryEntry {
  id: string
  campaign_id: string
  category: MemoryCategory
  content: string
  importance: MemoryImportance
  source: 'ai' | 'user'
  created_at: string
}

export interface Note {
  id: string
  campaign_id: string
  session_id: string | null
  title: string
  content: string
  category: 'lore' | 'event' | 'location' | 'item' | 'other'
  created_at: string
}

export type ItemCategory = 'weapon' | 'armor' | 'potion' | 'scroll' | 'gear' | 'treasure' | 'tool' | 'other'
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary'

export interface InventoryItem {
  id: string
  campaign_id: string
  name: string
  description: string | null
  quantity: number
  category: ItemCategory
  is_equipped: boolean
  weight: number
  value_gp: number
  value_sp: number
  value_cp: number
  rarity: ItemRarity
  properties: Record<string, unknown>
  sort_order: number
  created_at: string
}

export interface CampaignCurrency {
  id: string
  campaign_id: string
  gp: number
  sp: number
  cp: number
  updated_at: string
}

export type TimeOfDay = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'evening' | 'night' | 'midnight'

export interface WorldTime {
  day: number
  hour: number
  timeOfDay: TimeOfDay
}

export interface Pdf {
  id: string
  user_id: string
  campaign_id: string
  filename: string
  storage_path: string
  status: 'processing' | 'indexed' | 'error'
  created_at: string
}

export interface RagResult {
  content: string
  similarity: number
  metadata: {
    page_start: number
    page_end: number
    chunk_index: number
    filename: string
  }
}

export type LocationType = 'region' | 'city' | 'dungeon' | 'wilderness' | 'building'
export type TerrainType = 'plains' | 'forest' | 'mountain' | 'desert' | 'swamp' | 'coastal' | 'underground' | 'urban' | 'arctic'
export type ReputationTier = 'enemy' | 'unfriendly' | 'neutral' | 'friendly' | 'honored' | 'exalted'
export type InteractionType = 'conversation' | 'combat' | 'trade' | 'quest' | 'other'

export interface WorldLocation {
  id: string
  campaign_id: string
  name: string
  type: LocationType
  parent_id: string | null
  description: string | null
  discovered: boolean
  visit_count: number
  coordinates_x: number
  coordinates_y: number
  image_url: string | null
  connected_locations: string[]
  npcs: string[]
  active_quests: string[]
  terrain: TerrainType | null
  danger_level: number
  created_at: string
  updated_at: string
}

export interface Faction {
  id: string
  campaign_id: string
  name: string
  description: string | null
  alignment: string | null
  headquarters_location_id: string | null
  created_at: string
}

export interface FactionReputation {
  id: string
  campaign_id: string
  faction_id: string
  score: number
  created_at: string
  updated_at: string
}

export interface NpcInteractionLog {
  id: string
  campaign_id: string
  npc_id: string
  session_id: string | null
  location_id: string | null
  interaction_type: InteractionType
  summary: string
  sentiment: 'positive' | 'negative' | 'neutral' | null
  disposition_before: string | null
  disposition_after: string | null
  created_at: string
}

export interface TravelEvent {
  id: string
  campaign_id: string
  session_id: string | null
  from_location_id: string | null
  to_location_id: string | null
  encounter_type: 'combat' | 'social' | 'discovery' | 'hazard' | 'peaceful' | null
  description: string | null
  created_at: string
}
