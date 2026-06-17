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
  created_at: string
}

export interface Quest {
  id: string
  campaign_id: string
  title: string
  description: string | null
  status: 'active' | 'completed' | 'failed' | 'abandoned'
  priority: 'main' | 'side' | 'personal'
  created_at: string
  updated_at: string
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

export interface InventoryItem {
  id: string
  campaign_id: string
  name: string
  description: string | null
  quantity: number
  category: 'weapon' | 'armor' | 'potion' | 'scroll' | 'gear' | 'treasure' | 'other'
  is_equipped: boolean
  created_at: string
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
