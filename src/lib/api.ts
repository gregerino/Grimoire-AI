const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

async function jsonFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

// --- Sessions ---

export function createSession(campaignId: string) {
  return jsonFetch(`${API_BASE}/session`, {
    method: 'POST',
    body: JSON.stringify({ campaign_id: campaignId }),
  })
}

export function listSessions(campaignId: string) {
  return jsonFetch(`${API_BASE}/session/list/${campaignId}`)
}

export function updateSession(sessionId: string, updates: Record<string, unknown>) {
  return jsonFetch(`${API_BASE}/session/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export function summarizeSession(sessionId: string, campaignId: string, characterName?: string, userId?: string) {
  return jsonFetch(`${API_BASE}/session/${sessionId}/summarize`, {
    method: 'POST',
    body: JSON.stringify({ campaign_id: campaignId, character_name: characterName, ...(userId && { user_id: userId }) }),
  })
}

export function saveMessage(sessionId: string, campaignId: string, role: string, content: string) {
  return jsonFetch(`${API_BASE}/session/${sessionId}/message`, {
    method: 'POST',
    body: JSON.stringify({ campaign_id: campaignId, role, content }),
  })
}

export function getMessages(sessionId: string) {
  return jsonFetch(`${API_BASE}/session/${sessionId}/messages`)
}

export async function uploadPdf(
  file: File,
  campaignId: string,
  userId: string
) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('campaign_id', campaignId)
  formData.append('user_id', userId)

  const res = await fetch(`${API_BASE}/pdf/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    let msg = 'Upload failed'
    try {
      msg = JSON.parse(text).error || msg
    } catch {
      msg = text.startsWith('<') ? `Server returned HTML (status ${res.status}) — is the backend running on ${API_BASE}?` : text
    }
    throw new Error(msg)
  }

  return res.json()
}

export async function listPdfs(campaignId: string) {
  const res = await fetch(`${API_BASE}/pdf/list/${campaignId}`)

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to list PDFs')
  }

  return res.json()
}

export async function deletePdf(pdfId: string) {
  const res = await fetch(`${API_BASE}/pdf/${pdfId}`, { method: 'DELETE' })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to delete PDF')
  }

  return res.json()
}

export async function ragSearch(query: string, campaignId: string) {
  const res = await fetch(`${API_BASE}/rag/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, campaign_id: campaignId }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Search failed')
  }

  return res.json()
}

// --- Rulebooks ---

export async function uploadRulebook(file: File, userId: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('user_id', userId)

  const res = await fetch(`${API_BASE}/rulebook/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    let msg = 'Upload failed'
    try {
      msg = JSON.parse(text).error || msg
    } catch {
      msg = text.startsWith('<') ? `Server returned HTML (status ${res.status})` : text
    }
    throw new Error(msg)
  }

  return res.json()
}

export async function listRulebooks(userId: string) {
  const res = await fetch(`${API_BASE}/rulebook/list/${userId}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to list rulebooks')
  }
  return res.json()
}

export async function deleteRulebook(rulebookId: string) {
  const res = await fetch(`${API_BASE}/rulebook/${rulebookId}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to delete rulebook')
  }
  return res.json()
}

export interface GameState {
  hpChange?: number
  conditionsAdded?: string[]
  conditionsRemoved?: string[]
  lootFound?: {
    name: string
    category: string
    rarity?: string
    description?: string
    weight?: number
    value_gp?: number
    value_sp?: number
    value_cp?: number
    properties?: Record<string, unknown>
  }[]
  currencyFound?: { gp?: number; sp?: number; cp?: number }
  timeAdvance?: number
  xpGained?: number
  memoryUpdate?: string
  locationChange?: string
  chaosFactor?: number
  npcMet?: { name: string; race?: string; disposition: string; description?: string } | null
  questUpdate?: {
    title: string
    status: string
    description?: string
    sourceNpcName?: string
    targetLocationName?: string
    reward?: {
      gp?: number
      items?: string[]
      reputation?: { factionName: string; change: number }
      narrative?: string
    }
    update?: string
  } | null
  combatStart?: {
    enemies: Array<{
      name: string
      initiative: number
      hp: { current: number; max: number }
      ac: number
    }>
    playerInitiative?: number
  }
  combatEnd?: boolean
  combatDamage?: Array<{ target: string; amount: number; type?: string }>
  combatHealing?: Array<{ target: string; amount: number }>
  conditionsApplied?: Array<{ target: string; condition: string }>
  conditionsLifted?: Array<{ target: string; condition: string }>
  spellSlotUsed?: { level: number }
  deathSaveResult?: { roll: number }
  restType?: 'short' | 'long'
  hitDiceUsed?: number
  speech?: Array<{ speaker: string; text: string }>
  audio?: {
    ambient?: string
    music?: string
    sfx?: string[]
  }
  locationUpdate?: {
    name: string
    type: 'region' | 'city' | 'dungeon' | 'wilderness' | 'building'
    description?: string
    parentName?: string
    terrain?: string
    coordinates?: { x: number; y: number }
    discovered?: boolean
    connectedTo?: string[]
  }
  reputationChange?: {
    factionName: string
    change: number
    reason?: string
  }
  factionMet?: {
    name: string
    description?: string
    alignment?: string
  }
  npcInteraction?: {
    npcName: string
    type: 'conversation' | 'combat' | 'trade' | 'quest' | 'other'
    summary: string
    sentiment?: 'positive' | 'negative' | 'neutral'
  }
  travelStart?: {
    from: string
    to: string
    terrain?: string
    dangerLevel?: number
  }
}

// --- Character ---

export async function saveCharacterSheet(campaignId: string, character: unknown) {
  return jsonFetch(`${API_BASE}/character/save`, {
    method: 'POST',
    body: JSON.stringify({ campaign_id: campaignId, character }),
  })
}

export async function getCharacterSheet(campaignId: string) {
  return jsonFetch(`${API_BASE}/character/${campaignId}`)
}

export async function syncCharacterFromDndb(campaignId: string, url: string) {
  return jsonFetch(`${API_BASE}/character/sync-dndb`, {
    method: 'POST',
    body: JSON.stringify({ campaign_id: campaignId, url }),
  })
}

// --- Oracle ---

export async function rollFate(odds: string, chaosFactor: number) {
  return jsonFetch(`${API_BASE}/oracle/fate`, {
    method: 'POST',
    body: JSON.stringify({ odds, chaosFactor }),
  })
}

export async function rollEvent() {
  return jsonFetch(`${API_BASE}/oracle/event`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

// --- Rest ---

export function performRest(
  campaignId: string,
  type: 'short' | 'long',
  hitDiceUsed?: number,
) {
  return jsonFetch(`${API_BASE}/character/${campaignId}/rest`, {
    method: 'PATCH',
    body: JSON.stringify({ type, hitDiceUsed }),
  })
}

// --- NPC ---

export function aiUpdateNpc(npcId: string, context: string, userId?: string) {
  return jsonFetch(`${API_BASE}/npc/${npcId}/ai-update`, {
    method: 'POST',
    body: JSON.stringify({ context, ...(userId && { user_id: userId }) }),
  })
}

// --- Image Generation ---

export async function generateNpcPortrait(
  npcId: string,
  sessionId?: string | null,
): Promise<{ url: string | null; reason?: string }> {
  return jsonFetch(`${API_BASE}/image/npc/${npcId}`, {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  })
}

export async function generateImage(
  campaignId: string,
  type: 'npc_portrait' | 'location',
  data: Record<string, unknown>,
  sessionId?: string | null,
): Promise<{ url: string | null; reason?: string }> {
  return jsonFetch(`${API_BASE}/image/generate`, {
    method: 'POST',
    body: JSON.stringify({ campaign_id: campaignId, session_id: sessionId, type, data }),
  })
}

// --- TTS ---

export async function fetchTtsAudio(text: string, speaker: string, voiceId?: string | null, temperature?: number): Promise<Blob> {
  const res = await fetch(`${API_BASE}/tts/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speaker, ...(voiceId ? { voiceId } : {}), ...(temperature != null ? { temperature } : {}) }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'TTS failed')
  }
  return res.blob()
}

export interface TtsVoice {
  id: string
  name: string
  description: string
}

export async function fetchTtsVoices(): Promise<TtsVoice[]> {
  const res = await jsonFetch(`${API_BASE}/tts/voices`)
  return res.voices
}

// --- Locations ---

export function listLocations(campaignId: string) {
  return jsonFetch(`${API_BASE}/location/list/${campaignId}`)
}

export function createLocation(data: Record<string, unknown>) {
  return jsonFetch(`${API_BASE}/location`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateLocation(id: string, updates: Record<string, unknown>) {
  return jsonFetch(`${API_BASE}/location/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export function deleteLocation(id: string) {
  return jsonFetch(`${API_BASE}/location/${id}`, { method: 'DELETE' })
}

export function connectLocations(id: string, otherId: string) {
  return jsonFetch(`${API_BASE}/location/${id}/connect/${otherId}`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

// --- Factions ---

export function listFactions(campaignId: string) {
  return jsonFetch(`${API_BASE}/faction/list/${campaignId}`)
}

export function createFaction(data: Record<string, unknown>) {
  return jsonFetch(`${API_BASE}/faction`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateFactionReputation(factionId: string, campaignId: string, change: number) {
  return jsonFetch(`${API_BASE}/faction/${factionId}/reputation`, {
    method: 'PATCH',
    body: JSON.stringify({ campaign_id: campaignId, change }),
  })
}

// --- Travel ---

export function startTravel(campaignId: string, fromId: string, toId: string, sessionId?: string) {
  return jsonFetch(`${API_BASE}/travel/start`, {
    method: 'POST',
    body: JSON.stringify({
      campaign_id: campaignId,
      from_id: fromId,
      to_id: toId,
      session_id: sessionId || null,
    }),
  })
}

// --- Memory ---

export function listMemories(campaignId: string) {
  return jsonFetch(`${API_BASE}/memory/list/${campaignId}`)
}

export function createMemory(data: Record<string, unknown>) {
  return jsonFetch(`${API_BASE}/memory`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateMemory(id: string, updates: Record<string, unknown>) {
  return jsonFetch(`${API_BASE}/memory/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export function deleteMemory(id: string) {
  return jsonFetch(`${API_BASE}/memory/${id}`, { method: 'DELETE' })
}

// --- Tavern ---

export function generateTavern(campaignId: string, regionName?: string, userId?: string) {
  return jsonFetch(`${API_BASE}/tavern/generate`, {
    method: 'POST',
    body: JSON.stringify({ campaign_id: campaignId, region_name: regionName, ...(userId && { user_id: userId }) }),
  })
}

// --- Chat ---

export interface SpeechSegment {
  speaker: string
  text: string
}

export async function sendChatMessage(
  message: string,
  campaignId: string,
  sessionId: string | null,
  history: { role: string; content: string }[],
  onChunk: (text: string) => void,
  onGameState: (gs: GameState) => void,
  onDone: (speechSegments?: SpeechSegment[]) => void,
  onError: (error: string) => void,
  provider?: 'claude' | 'openai',
  ttsLanguage?: string,
  onSpeechSegments?: (segments: SpeechSegment[]) => void,
  userId?: string,
) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      campaign_id: campaignId,
      session_id: sessionId,
      history,
      ...(provider && { provider }),
      ...(ttsLanguage && { ttsLanguage }),
      ...(userId && { user_id: userId }),
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    onError(err.error || 'Chat failed')
    return
  }

  const reader = res.body?.getReader()
  if (!reader) {
    onError('No response stream')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let speechSegments: SpeechSegment[] | undefined

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)

      if (data === '[DONE]') {
        onDone(speechSegments)
        return
      }

      try {
        const parsed = JSON.parse(data)
        if (parsed.content) onChunk(parsed.content)
        if (parsed.gameState) onGameState(parsed.gameState)
        if (parsed.speechSegments) {
          speechSegments = parsed.speechSegments
          onSpeechSegments?.(parsed.speechSegments)
        }
        if (parsed.error) onError(parsed.error)
      } catch {
        // skip malformed chunks
      }
    }
  }

  onDone(speechSegments)
}
