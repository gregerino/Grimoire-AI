import { describe, it, expect } from 'vitest'

function parseSpeechSegments(text: string): Array<{ speaker: string; text: string }> | null {
  const match = text.match(/```speech\s*\n([\s\S]*?)\n```/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1])
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
    return null
  } catch {
    return null
  }
}

function parseGameState(text: string): Record<string, unknown> | null {
  const match = text.match(/```gamestate\s*\n([\s\S]*?)\n```/)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

describe('parseSpeechSegments', () => {
  it('parses valid speech block', () => {
    const text = `Du går in i grottan.

\`\`\`speech
[
  { "speaker": "narrator", "text": "Du går in i grottan." },
  { "speaker": "villain", "text": "Vem vågar störa mig?" }
]
\`\`\``
    const result = parseSpeechSegments(text)
    expect(result).toHaveLength(2)
    expect(result![0].speaker).toBe('narrator')
    expect(result![1].speaker).toBe('villain')
    expect(result![1].text).toBe('Vem vågar störa mig?')
  })

  it('returns null when no speech block', () => {
    expect(parseSpeechSegments('Just some text.')).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    const text = '```speech\n{ broken json }\n```'
    expect(parseSpeechSegments(text)).toBeNull()
  })

  it('returns null for empty array', () => {
    const text = '```speech\n[]\n```'
    expect(parseSpeechSegments(text)).toBeNull()
  })

  it('coexists with gamestate block', () => {
    const text = `Narrativ text.

\`\`\`speech
[{ "speaker": "narrator", "text": "Narrativ text." }]
\`\`\`

\`\`\`gamestate
{ "hpChange": -5 }
\`\`\``
    const speech = parseSpeechSegments(text)
    const gs = parseGameState(text)
    expect(speech).toHaveLength(1)
    expect(gs).not.toBeNull()
    expect(gs!.hpChange).toBe(-5)
  })
})

describe('parseGameState', () => {
  it('parses valid gamestate block', () => {
    const text = '```gamestate\n{"hpChange": -3, "locationChange": "dungeon"}\n```'
    const result = parseGameState(text)
    expect(result).toEqual({ hpChange: -3, locationChange: 'dungeon' })
  })

  it('returns null when no gamestate block', () => {
    expect(parseGameState('hello')).toBeNull()
  })
})
