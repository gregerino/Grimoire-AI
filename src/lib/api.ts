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

export async function sendChatMessage(
  message: string,
  campaignId: string,
  history: { role: string; content: string }[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      campaign_id: campaignId,
      history,
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
        onDone()
        return
      }

      try {
        const parsed = JSON.parse(data)
        if (parsed.content) onChunk(parsed.content)
        if (parsed.error) onError(parsed.error)
      } catch {
        // skip malformed chunks
      }
    }
  }

  onDone()
}
