import { Router, Request, Response } from 'express'
import { withRetry } from '../lib/retry'

const INWORLD_BASE = 'https://api.inworld.ai'

export const ttsRoutes = Router()

const DEFAULT_VOICE_ID = 'lime-fern-6875__amelia_tyler_bg3'
const DEFAULT_MODEL_ID = 'inworld-tts-2'

function resolveVoiceId(speaker: string, overrideVoiceId?: string): string {
  if (overrideVoiceId) return overrideVoiceId
  return DEFAULT_VOICE_ID
}

// ── TTS-2 narrative steering ────────────────────────────────

interface SteeringRule {
  pattern: RegExp
  tag: string
}

const STEERING_RULES: SteeringRule[] = [
  { pattern: /\bwhisper|hush|quiet(ly)?|murmur|under .* breath\b/i, tag: '[whisper in a hushed, secretive tone]' },
  { pattern: /\bscream|shout|roar|bellow|yell|cries out\b/i, tag: '[loud and forceful with intensity]' },
  { pattern: /\btremble|shak(e|ing|y)|fear|terrif|dread|horror|chill.* spine\b/i, tag: '[say with a trembling, fearful voice]' },
  { pattern: /\blaugh|chuckle|grin|smirk|amuse|giggle\b/i, tag: '[say with warmth and a hint of amusement]' },
  { pattern: /\bsob|weep|tear|cry|grief|mourn|sorrow\b/i, tag: '[say sadly with deliberate pauses in a low, heavy voice]' },
  { pattern: /\brage|fury|furious|anger|wrath|snarl\b/i, tag: '[speak as if barely holding back rage, forcing every word through gritted teeth]' },
  { pattern: /\bthunder|crash|explo|rumble|quake|erupts?\b/i, tag: '[deep and booming with dramatic weight]' },
  { pattern: /\bmyster|shadow|dark(ness|ened)?|omen|forebod|eerie|uncanny\b/i, tag: '[slow and ominous with an unsettling edge]' },
  { pattern: /\bsacred|holy|divine|prayer|bless|celestial|radian(t|ce)\b/i, tag: '[reverent and solemn with quiet awe]' },
  { pattern: /\btavern|feast|drink|ale|cheer|celebrat|toast\b/i, tag: '[warm and jovial like a storyteller by the hearth]' },
  { pattern: /\bsteel|blade|sword|clash|strike|combat|battle|fight\b/i, tag: '[urgent and sharp with rising intensity]' },
  { pattern: /\bdead|death|dying|corpse|grave|tomb|lifeless\b/i, tag: '[grave and measured, each word weighted by solemnity]' },
  { pattern: /\bwonder|awe|marvel|breathtak|magnificent|vast\b/i, tag: '[filled with wonder and quiet amazement]' },
]

function addSteeringTags(text: string): string {
  const lower = text.toLowerCase()

  // Insert inline non-verbals where they fit naturally
  let steered = text
    .replace(/\b(laughs?|chuckles?)\b/gi, '[laugh]')
    .replace(/\b(sighs?|exhales? (?:deeply|slowly|heavily))\b/gi, '[sigh]')
    .replace(/\b(clears? (?:his|her|their|its) throat)\b/gi, '[clear throat]')
    .replace(/\b(coughs?|coughing)\b/gi, '[cough]')
    .replace(/\b(yawns?)\b/gi, '[yawn]')

  // Pick the best-matching delivery steering tag for the opening
  for (const rule of STEERING_RULES) {
    if (rule.pattern.test(lower)) {
      steered = `${rule.tag} ${steered}`
      break
    }
  }

  return steered
}

async function inworldStream(text: string, voiceId: string, res: Response, temperature?: number) {
  const response = await fetch(`${INWORLD_BASE}/tts/v1/voice:stream`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${process.env.INWORLD_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voiceId,
      modelId: DEFAULT_MODEL_ID,
      audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 24000 },
      ...(temperature != null && { temperature }),
    }),
  })

  if (!response.ok || !response.body) {
    const err = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(err.message || err.detail || 'Inworld TTS stream failed')
  }

  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('Transfer-Encoding', 'chunked')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const data = JSON.parse(line)
        if (data.result?.audioContent) {
          const chunk = Buffer.from(data.result.audioContent, 'base64')
          res.write(chunk)
        }
      } catch {
        // skip malformed NDJSON lines
      }
    }
  }

  if (buffer.trim()) {
    try {
      const data = JSON.parse(buffer)
      if (data.result?.audioContent) {
        res.write(Buffer.from(data.result.audioContent, 'base64'))
      }
    } catch {
      // skip
    }
  }

  res.end()
}

async function inworldSynth(text: string, voiceId: string, res: Response, temperature?: number) {
  const response = await withRetry(
    () => fetch(`${INWORLD_BASE}/tts/v1/voice`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${process.env.INWORLD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voiceId,
        modelId: DEFAULT_MODEL_ID,
        audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 24000 },
        ...(temperature != null && { temperature }),
      }),
    }),
    { maxRetries: 2, timeoutMs: 30_000 },
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(err.message || err.detail || 'Inworld TTS failed')
  }

  const data = await response.json() as { audioContent: string }
  const audioBuffer = Buffer.from(data.audioContent, 'base64')

  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('Content-Length', audioBuffer.length)
  res.send(audioBuffer)
}

async function inworldVoices(res: Response) {
  const response = await fetch(`${INWORLD_BASE}/voices/v1/voices`, {
    headers: {
      'Authorization': `Basic ${process.env.INWORLD_API_KEY}`,
    },
  })

  if (!response.ok) throw new Error('Failed to fetch Inworld voices')

  const data = await response.json() as { voices: Array<{ voiceId: string; displayName: string; gender?: string; accent?: string }> }
  const voices = (data.voices || []).map((v) => ({
    id: v.voiceId,
    name: v.displayName || v.voiceId,
    description: [v.gender, v.accent].filter(Boolean).join(' · '),
  }))

  res.json({ voices })
}

// ── Routes ───────────────────────────────────────────────────

ttsRoutes.get('/voices', async (_req: Request, res: Response) => {
  try {
    if (!process.env.INWORLD_API_KEY) {
      res.status(500).json({ error: 'No INWORLD_API_KEY configured' })
      return
    }
    await inworldVoices(res)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch voices'
    res.status(500).json({ error: message })
  }
})

ttsRoutes.post('/stream', async (req: Request, res: Response) => {
  try {
    const { text, speaker, voiceId: overrideVoiceId, temperature } = req.body
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Missing text' })
      return
    }
    if (!process.env.INWORLD_API_KEY) {
      res.status(500).json({ error: 'No INWORLD_API_KEY configured' })
      return
    }

    const voiceId = resolveVoiceId(speaker, overrideVoiceId)
    await inworldStream(addSteeringTags(text), voiceId, res, temperature)
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
    const { text, speaker, voiceId: overrideVoiceId, temperature } = req.body
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Missing text' })
      return
    }
    if (!process.env.INWORLD_API_KEY) {
      res.status(500).json({ error: 'No INWORLD_API_KEY configured' })
      return
    }

    const voiceId = resolveVoiceId(speaker, overrideVoiceId)
    await inworldSynth(addSteeringTags(text), voiceId, res, temperature)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TTS failed'
    console.error('TTS error:', message)
    if (!res.headersSent) {
      res.status(500).json({ error: message })
    }
  }
})
