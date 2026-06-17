import { Router, Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { supabaseAdmin } from '../lib/supabase-admin'
import { buildSystemPrompt, MAX_HISTORY_MESSAGES, MAX_RESPONSE_TOKENS } from '../prompts/dm-system'
import type { Campaign, AiProvider } from '../../src/types/database'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const chatRoutes = Router()

type OnText = (text: string) => void
type OnEnd = () => void
type OnError = (err: Error) => void

interface StreamOpts {
  systemPrompt: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  onText: OnText
  onEnd: OnEnd
  onError: OnError
}

function streamClaude({ systemPrompt, messages, onText, onEnd, onError }: StreamOpts) {
  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: MAX_RESPONSE_TOKENS,
    temperature: 1,
    system: systemPrompt,
    messages,
  })
  stream.on('text', onText)
  stream.on('end', onEnd)
  stream.on('error', onError)
}

function streamOpenAI({ systemPrompt, messages, onText, onEnd, onError }: StreamOpts) {
  const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  ;(async () => {
    try {
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        stream: true,
        max_tokens: MAX_RESPONSE_TOKENS,
        temperature: 0.9,
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) onText(content)
      }
      onEnd()
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)))
    }
  })()
}

chatRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { message, campaign_id, session_id, history = [], provider: overrideProvider } = req.body

    if (!message || !campaign_id) {
      res.status(400).json({ error: 'Missing message or campaign_id' })
      return
    }

    const [campaignResult, ragResults, memoriesResult] = await Promise.all([
      supabaseAdmin
        .from('campaigns')
        .select('*')
        .eq('id', campaign_id)
        .single(),
      getRAGContext(message, campaign_id),
      supabaseAdmin
        .from('campaign_memories')
        .select('content')
        .eq('campaign_id', campaign_id)
        .order('created_at', { ascending: false })
        .limit(15),
    ])

    const campaign = campaignResult.data as Campaign | null
    const memories = (memoriesResult.data || []).map(
      (m: { content: string }) => m.content,
    )

    const provider: AiProvider =
      overrideProvider === 'openai' || overrideProvider === 'claude'
        ? overrideProvider
        : campaign?.ai_provider ?? 'claude'

    let activeConditions: string[] = []
    if (campaign) {
      const { data: sheet } = await supabaseAdmin
        .from('character_sheets')
        .select('data')
        .eq('campaign_id', campaign_id)
        .single()
      if (sheet?.data) {
        activeConditions = ((sheet.data as Record<string, unknown>).activeConditions as string[]) ?? []
      }
    }

    const systemPrompt = buildSystemPrompt(campaign, ragResults, memories, activeConditions)

    const trimmedHistory = history.slice(-MAX_HISTORY_MESSAGES)
    const chatMessages = [
      ...trimmedHistory.map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ]

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    let fullResponse = ''

    const streamFn = provider === 'openai' ? streamOpenAI : streamClaude

    streamFn({
      systemPrompt,
      messages: chatMessages,
      onText(text) {
        fullResponse += text
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`)
      },
      async onEnd() {
        const gameState = parseGameState(fullResponse)
        if (gameState) {
          res.write(`data: ${JSON.stringify({ gameState })}\n\n`)
          await processGameState(gameState, campaign_id, session_id)
        }
        res.write('data: [DONE]\n\n')
        res.end()
      },
      onError(error) {
        const msg = error.message || 'Stream error'
        console.error(`${provider} stream error:`, msg)
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: msg })}\n\n`)
          res.end()
        }
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Chat error:', message)
    if (!res.headersSent) {
      res.status(500).json({ error: message })
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`)
      res.end()
    }
  }
})

async function getRAGContext(
  query: string,
  campaignId: string,
): Promise<string> {
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })
    const queryEmbedding = embeddingResponse.data[0].embedding

    const { data: ragResults } = await supabaseAdmin.rpc('match_documents', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_campaign_id: campaignId,
      match_count: 5,
    })

    if (!ragResults || ragResults.length === 0) return ''

    return ragResults
      .filter((r: { similarity: number }) => r.similarity > 0.3)
      .map((r: { content: string }) => r.content)
      .join('\n\n---\n\n')
  } catch {
    return ''
  }
}

interface GameState {
  hpChange?: number
  conditionsAdded?: string[]
  conditionsRemoved?: string[]
  lootFound?: { name: string; category: string; description?: string }[]
  xpGained?: number
  memoryUpdate?: string
  locationChange?: string
  chaosFactor?: number
  npcMet?: {
    name: string
    race?: string
    disposition: string
    description?: string
  } | null
  questUpdate?: {
    title: string
    status: string
    description?: string
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
}

function parseGameState(text: string): GameState | null {
  const match = text.match(/```gamestate\s*\n([\s\S]*?)\n```/)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

async function processGameState(
  gs: GameState,
  campaignId: string,
  sessionId?: string,
): Promise<void> {
  const updates: Record<string, unknown> = {}

  if (gs.chaosFactor) {
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('chaos_factor')
      .eq('id', campaignId)
      .single()
    if (campaign) {
      const newChaos = Math.max(1, Math.min(9, campaign.chaos_factor + gs.chaosFactor))
      updates.chaos_factor = newChaos
    }
  }

  if (gs.hpChange && gs.hpChange !== 0) {
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('current_hp')
      .eq('id', campaignId)
      .single()
    if (campaign?.current_hp != null) {
      updates.current_hp = campaign.current_hp + gs.hpChange
    }
  }

  if (Object.keys(updates).length > 0) {
    await supabaseAdmin
      .from('campaigns')
      .update(updates)
      .eq('id', campaignId)
  }

  if (gs.memoryUpdate) {
    await supabaseAdmin.from('campaign_memories').insert({
      campaign_id: campaignId,
      session_id: sessionId || null,
      content: gs.memoryUpdate,
    })
  }

  if (gs.npcMet) {
    await supabaseAdmin.from('npcs').insert({
      campaign_id: campaignId,
      name: gs.npcMet.name,
      race: gs.npcMet.race || null,
      description: gs.npcMet.description || null,
      disposition: gs.npcMet.disposition || 'neutral',
    })
  }

  if (gs.questUpdate) {
    const { data: existing } = await supabaseAdmin
      .from('quests')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('title', gs.questUpdate.title)
      .single()

    if (existing) {
      await supabaseAdmin
        .from('quests')
        .update({ status: gs.questUpdate.status })
        .eq('id', existing.id)
    } else {
      await supabaseAdmin.from('quests').insert({
        campaign_id: campaignId,
        title: gs.questUpdate.title,
        description: gs.questUpdate.description || null,
        status: gs.questUpdate.status || 'active',
      })
    }
  }

  if (gs.lootFound && gs.lootFound.length > 0) {
    const items = gs.lootFound.map((item) => ({
      campaign_id: campaignId,
      name: item.name,
      description: item.description || null,
      category: item.category || 'other',
      quantity: 1,
    }))
    await supabaseAdmin.from('inventory_items').insert(items)
  }

  if (gs.spellSlotUsed) {
    const { data: sheet } = await supabaseAdmin
      .from('character_sheets')
      .select('data')
      .eq('campaign_id', campaignId)
      .single()

    if (sheet?.data) {
      const charData = sheet.data as Record<string, unknown>
      const slots = charData.spellSlots as Record<string, { used: number; max: number }> | undefined
      const level = String(gs.spellSlotUsed.level)
      if (slots?.[level] && slots[level].used < slots[level].max) {
        slots[level].used += 1
        await supabaseAdmin
          .from('character_sheets')
          .update({ data: charData, updated_at: new Date().toISOString() })
          .eq('campaign_id', campaignId)
      }
    }
  }

  if (gs.hpChange && gs.hpChange !== 0) {
    const { data: sheet } = await supabaseAdmin
      .from('character_sheets')
      .select('data')
      .eq('campaign_id', campaignId)
      .single()

    if (sheet?.data) {
      const charData = sheet.data as Record<string, unknown>
      const hp = charData.hp as { current: number; max: number; temp: number } | undefined
      if (hp) {
        hp.current = Math.max(0, Math.min(hp.max, hp.current + gs.hpChange))
        await supabaseAdmin
          .from('character_sheets')
          .update({ data: charData, updated_at: new Date().toISOString() })
          .eq('campaign_id', campaignId)
      }
    }
  }

  if (gs.conditionsApplied || gs.conditionsLifted) {
    const { data: sheet } = await supabaseAdmin
      .from('character_sheets')
      .select('data')
      .eq('campaign_id', campaignId)
      .single()

    if (sheet?.data) {
      const charData = sheet.data as Record<string, unknown>
      let conditions = (charData.activeConditions as string[] | undefined) ?? []

      for (const c of gs.conditionsApplied ?? []) {
        if (c.target === 'player' && !conditions.includes(c.condition)) {
          conditions.push(c.condition)
        }
      }
      for (const c of gs.conditionsLifted ?? []) {
        if (c.target === 'player') {
          conditions = conditions.filter((cond) => cond !== c.condition)
        }
      }

      charData.activeConditions = conditions
      await supabaseAdmin
        .from('character_sheets')
        .update({ data: charData, updated_at: new Date().toISOString() })
        .eq('campaign_id', campaignId)
    }
  }
}
