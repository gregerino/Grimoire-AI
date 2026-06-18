import { Router, Request, Response } from 'express'

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'

export const ttsRoutes = Router()

const ELEVENLABS_SPEAKER_MAP: Record<string, string> = {
  narrator: 'JBFqnCBsd6RMkjVDRZzb',
}

function resolveVoiceId(speaker: string, overrideVoiceId?: string): string {
  if (overrideVoiceId) return overrideVoiceId
  return ELEVENLABS_SPEAKER_MAP[speaker] || ELEVENLABS_SPEAKER_MAP.narrator
}

async function elevenLabsStream(text: string, voiceId: string, res: Response) {
  const response = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}/stream`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.4, use_speaker_boost: true },
      optimize_streaming_latency: 3,
    }),
  })

  if (!response.ok || !response.body) {
    const err = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail))
  }

  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('Transfer-Encoding', 'chunked')

  const reader = response.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    res.write(value)
  }
  res.end()
}

async function elevenLabsSynth(text: string, voiceId: string, res: Response) {
  const response = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.4, use_speaker_boost: true },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail))
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('Content-Length', buffer.length)
  res.send(buffer)
}

async function elevenLabsVoices(res: Response) {
  const response = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! },
  })

  if (!response.ok) throw new Error('Failed to fetch ElevenLabs voices')

  const data = await response.json() as { voices: Array<{ voice_id: string; name: string; labels: Record<string, string> }> }
  const voices = data.voices.map((v) => ({
    id: v.voice_id,
    name: v.name,
    description: [v.labels?.description, v.labels?.accent, v.labels?.use_case].filter(Boolean).join(' · '),
  }))

  res.json({ voices })
}

// ── Routes ───────────────────────────────────────────────────

ttsRoutes.get('/voices', async (_req: Request, res: Response) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      res.status(500).json({ error: 'No ELEVENLABS_API_KEY configured' })
      return
    }
    await elevenLabsVoices(res)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch voices'
    res.status(500).json({ error: message })
  }
})

ttsRoutes.post('/stream', async (req: Request, res: Response) => {
  try {
    const { text, speaker, voiceId: overrideVoiceId } = req.body
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Missing text' })
      return
    }
    if (!process.env.ELEVENLABS_API_KEY) {
      res.status(500).json({ error: 'No ELEVENLABS_API_KEY configured' })
      return
    }

    const voiceId = resolveVoiceId(speaker, overrideVoiceId)
    await elevenLabsStream(text, voiceId, res)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TTS stream failed'
    console.error('TTS stream error:', message)
    if (!res.headersSent) {
      res.status(500).json({ error: message })
    }
  }
})

ttsRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { text, speaker, voiceId: overrideVoiceId } = req.body
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Missing text' })
      return
    }
    if (!process.env.ELEVENLABS_API_KEY) {
      res.status(500).json({ error: 'No ELEVENLABS_API_KEY configured' })
      return
    }

    const voiceId = resolveVoiceId(speaker, overrideVoiceId)
    await elevenLabsSynth(text, voiceId, res)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TTS failed'
    console.error('TTS error:', message)
    if (!res.headersSent) {
      res.status(500).json({ error: message })
    }
  }
})
