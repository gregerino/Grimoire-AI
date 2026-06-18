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

export function summarizeSession(sessionId: string, campaignId: string, characterName?: string) {
  return jsonFetch(`${API_BASE}/session/${sessionId}/summarize`, {
    method: 'POST',
    body: JSON.stringify({ campaign_id: campaignId, character_name: characterName }),
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
    const err = await res.json()
    throw new Error(err.error || 'Upload failed')
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

export interface GameState {
  hpChange?: number
  conditionsAdded?: string[]
  conditionsRemoved?: string[]
  lootFound?: { name: string; category: string; description?: string }[]
  xpGained?: number
  memoryUpdate?: string
  locationChange?: string
  chaosFactor?: number
  npcMet?: { name: string; race?: string; disposition: string; description?: string } | null
  questUpdate?: { title: string; status: string; description?: string } | null
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
}

// --- Character ---

export async function parseCharacterPdf(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/character/parse`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to parse character')
  }

  return res.json()
}

export async function saveCharacterSheet(campaignId: string, character: unknown) {
  return jsonFetch(`${API_BASE}/character/save`, {
    method: 'POST',
    body: JSON.stringify({ campaign_id: campaignId, character }),
  })
}

export async function getCharacterSheet(campaignId: string) {
  return jsonFetch(`${API_BASE}/character/${campaignId}`)
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

export function aiUpdateNpc(npcId: string, context: string) {
  return jsonFetch(`${API_BASE}/npc/${npcId}/ai-update`, {
    method: 'POST',
    body: JSON.stringify({ context }),
  })
}

// --- TTS ---

export async function fetchTtsAudio(text: string, speaker: string, voiceId?: string | null): Promise<Blob> {
  const res = await fetch(`${API_BASE}/tts/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speaker, ...(voiceId ? { voiceId } : {}) }),
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
