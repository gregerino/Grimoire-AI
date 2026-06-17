import { Router, Request, Response } from 'express'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'

export const ttsRoutes = Router()

const SPEAKER_VOICE_MAP: Record<string, string> = {
  narrator: 'JBFqnCBsd6RMkjVDRZzb',   // George — Warm, Captivating Storyteller
  villain:  'gpfkPsCDQR1A1crX3dah',   // Smoky Sam — Cold-hearted Villain
  elder:    'pqHfZKP75CvOlQylNhV4',   // Bill — Wise, Mature, Balanced
  warrior:  'SOYHLrjzK2X1ezoPC6cr',   // Harry — Fierce Warrior
  mystic:   'pFZP5JQG7iQjIQuC4Bku',   // Lily — Velvety Actress
  merchant: 'N2lVS1w4EtoT3dr4eOWO',   // Callum — Husky Trickster
}

ttsRoutes.get('/voices', async (_req: Request, res: Response) => {
  try {
    if (!ELEVENLABS_API_KEY) {
      res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' })
      return
    }

    const response = await fetch(`${ELEVENLABS_BASE}/voices`, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    })

    if (!response.ok) {
      res.status(response.status).json({ error: 'Failed to fetch voices' })
      return
    }

    const data = await response.json() as { voices: Array<{ voice_id: string; name: string; labels: Record<string, string> }> }
    const voices = data.voices.map((v) => ({
      id: v.voice_id,
      name: v.name,
      description: [v.labels?.description, v.labels?.accent, v.labels?.use_case]
        .filter(Boolean)
        .join(' · '),
    }))

    res.json({ voices })
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

    if (!ELEVENLABS_API_KEY) {
      res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' })
      return
    }

    const voiceId = overrideVoiceId || SPEAKER_VOICE_MAP[speaker] || SPEAKER_VOICE_MAP.narrator

    const response = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.4,
          use_speaker_boost: true,
        },
        optimize_streaming_latency: 3,
      }),
    })

    if (!response.ok || !response.body) {
      const err = await response.json().catch(() => ({ detail: response.statusText }))
      const msg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail)
      res.status(response.status).json({ error: msg })
      return
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

    if (!ELEVENLABS_API_KEY) {
      res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' })
      return
    }

    const voiceId = overrideVoiceId || SPEAKER_VOICE_MAP[speaker] || SPEAKER_VOICE_MAP.narrator

    const response = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.4,
          use_speaker_boost: true,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }))
      const msg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail)
      res.status(response.status).json({ error: msg })
      return
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', buffer.length)
    res.send(buffer)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TTS failed'
    console.error('TTS error:', message)
    if (!res.headersSent) {
      res.status(500).json({ error: message })
    }
  }
})
