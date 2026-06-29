import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import OpenAI from 'openai'
import { supabaseAdmin } from '../lib/supabase-admin'
import { withRetry } from '../lib/retry'
import { anthropic, openai, resolveProvider } from '../lib/ai-provider'
import { buildSystemPrompt, MAX_HISTORY_MESSAGES, MAX_RESPONSE_TOKENS, type WorldContext } from '../prompts/dm-system'
import type { Campaign, AiProvider } from '../../src/types/database'

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
        model: 'gpt-5.5',
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
    const { message, campaign_id, session_id, history = [], provider: overrideProvider, ttsLanguage } = req.body

    if (!message || !campaign_id) {
      res.status(400).json({ error: 'Missing message or campaign_id' })
      return
    }

    const [campaignResult, ragResults, memoriesResult, locationsResult, factionsResult, reputationsResult, questsResult] = await Promise.all([
      supabaseAdmin
        .from('campaigns')
        .select('*')
        .eq('id', campaign_id)
        .single(),
      getRAGContext(message, campaign_id, req.body.user_id),
      supabaseAdmin
        .from('campaign_memories')
        .select('content, category, importance')
        .eq('campaign_id', campaign_id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('world_locations')
        .select('id, name, type, description, discovered')
        .eq('campaign_id', campaign_id)
        .eq('discovered', true),
      supabaseAdmin
        .from('factions')
        .select('id, name')
        .eq('campaign_id', campaign_id),
      supabaseAdmin
        .from('faction_reputation')
        .select('faction_id, score')
        .eq('campaign_id', campaign_id),
      supabaseAdmin
        .from('quests')
        .select('title, status, description')
        .eq('campaign_id', campaign_id)
        .in('status', ['rumor', 'active']),
    ])

    const campaign = campaignResult.data as Campaign | null
    const memories = (memoriesResult.data || []).map(
      (m: { content: string; category?: string; importance?: string }) => {
        const prefix = m.category ? `[${m.category}${m.importance === 'high' ? ' ★' : ''}] ` : ''
        return prefix + m.content
      },
    )

    const locations = locationsResult.data || []
    const factions = factionsResult.data || []
    const reputations = reputationsResult.data || []

    const tierFromScore = (score: number) => {
      if (score <= 10) return 'enemy'
      if (score <= 25) return 'unfriendly'
      if (score <= 50) return 'neutral'
      if (score <= 70) return 'friendly'
      if (score <= 90) return 'honored'
      return 'exalted'
    }

    const currentLoc = campaign?.current_location_id
      ? locations.find((l: { id: string }) => l.id === campaign.current_location_id) || null
      : null

    const activeQuests = (questsResult.data || []) as Array<{ title: string; status: string; description: string | null }>

    const resolveTimeOfDay = (h: number) =>
      h >= 5 && h < 7 ? 'dawn' : h >= 7 && h < 10 ? 'morning' : h >= 10 && h < 14 ? 'midday'
        : h >= 14 && h < 17 ? 'afternoon' : h >= 17 && h < 19 ? 'dusk' : h >= 19 && h < 21 ? 'evening'
        : (h >= 21 || h < 1) ? 'night' : 'midnight'

    const worldContext: WorldContext = {
      worldTime: campaign ? { day: campaign.world_day ?? 1, hour: campaign.world_hour ?? 8, timeOfDay: resolveTimeOfDay(campaign.world_hour ?? 8) } : undefined,
      currentLocation: currentLoc ? { name: currentLoc.name, type: currentLoc.type, description: currentLoc.description } : null,
      factionReputations: factions.map((f: { id: string; name: string }) => {
        const rep = reputations.find((r: { faction_id: string }) => r.faction_id === f.id)
        const score = rep?.score ?? 50
        return { name: f.name, score, tier: tierFromScore(score) }
      }),
      discoveredLocations: locations.map((l: { name: string }) => l.name),
      activeQuests: activeQuests.map((q) => ({ title: q.title, status: q.status, description: q.description })),
    }

    const campaignProvider: AiProvider =
      overrideProvider === 'openai' || overrideProvider === 'claude'
        ? overrideProvider
        : campaign?.ai_provider ?? 'claude'
    const provider = resolveProvider(req.body.user_id, campaignProvider)

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

    const systemPrompt = buildSystemPrompt(campaign, ragResults, memories, activeConditions, ttsLanguage, worldContext)

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
        const speechSegments = parseSpeechSegments(fullResponse)
        if (speechSegments) {
          res.write(`data: ${JSON.stringify({ speechSegments })}\n\n`)
        }
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
  userId?: string,
): Promise<string> {
  try {
    const embeddingResponse = await withRetry(
      () => openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      }),
      { maxRetries: 2, timeoutMs: 15_000 },
    )
    const queryEmbedding = embeddingResponse.data[0].embedding

    const rpcName = userId ? 'match_documents_with_rulebooks' : 'match_documents'
    const rpcParams = userId
      ? {
          query_embedding: JSON.stringify(queryEmbedding),
          match_campaign_id: campaignId,
          match_user_id: userId,
          match_count: 8,
        }
      : {
          query_embedding: JSON.stringify(queryEmbedding),
          match_campaign_id: campaignId,
          match_count: 5,
        }

    const { data: ragResults } = await supabaseAdmin.rpc(rpcName, rpcParams)

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
    type: 'region' | 'city' | 'dungeon' | 'wilderness' | 'building' | 'forest' | 'ruin' | 'sea' | 'fort' | 'temple' | 'village'
    status?: 'undiscovered' | 'known' | 'visited' | 'completed'
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
    const memoryCategory = gs.memoryUpdate.startsWith('[')
      ? gs.memoryUpdate.match(/^\[(plot|npc|world|character|item)\]/i)?.[1]?.toLowerCase() || 'plot'
      : 'plot'
    const memoryContent = gs.memoryUpdate.replace(/^\[(plot|npc|world|character|item)\]\s*/i, '')

    await supabaseAdmin.from('campaign_memories').insert({
      campaign_id: campaignId,
      session_id: sessionId || null,
      content: memoryContent,
      category: memoryCategory,
      importance: 'medium',
      source: 'ai',
    })
  }

  if (gs.npcMet) {
    const { data: newNpc } = await supabaseAdmin.from('npcs').insert({
      campaign_id: campaignId,
      name: gs.npcMet.name,
      race: gs.npcMet.race || null,
      description: gs.npcMet.description || null,
      disposition: gs.npcMet.disposition || 'neutral',
    }).select('id, campaign_id, name, race, occupation, description').single()

    if (newNpc) {
      generateNpcPortraitAsync(newNpc)
    }
  }

  if (gs.questUpdate) {
    const { data: existing } = await supabaseAdmin
      .from('quests')
      .select('id, updates, status')
      .eq('campaign_id', campaignId)
      .eq('title', gs.questUpdate.title)
      .single()

    let sourceNpcId: string | null = null
    if (gs.questUpdate.sourceNpcName) {
      const { data: npc } = await supabaseAdmin
        .from('npcs')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('name', gs.questUpdate.sourceNpcName)
        .single()
      sourceNpcId = npc?.id ?? null
    }

    let targetLocationId: string | null = null
    if (gs.questUpdate.targetLocationName) {
      const { data: loc } = await supabaseAdmin
        .from('world_locations')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('name', gs.questUpdate.targetLocationName)
        .single()
      targetLocationId = loc?.id ?? null
    }

    let reward = null
    if (gs.questUpdate.reward) {
      const r = gs.questUpdate.reward
      let repData = null
      if (r.reputation) {
        const { data: faction } = await supabaseAdmin
          .from('factions')
          .select('id')
          .eq('campaign_id', campaignId)
          .eq('name', r.reputation.factionName)
          .single()
        if (faction) repData = { factionId: faction.id, change: r.reputation.change }
      }
      reward = {
        ...(r.gp != null && { gp: r.gp }),
        ...(r.items && { items: r.items }),
        ...(repData && { reputation: repData }),
        ...(r.narrative && { narrative: r.narrative }),
      }
    }

    if (existing) {
      const prevUpdates = (existing.updates as Array<{ timestamp: string; text: string }>) || []
      const newUpdate = gs.questUpdate.update
        ? [...prevUpdates, { timestamp: new Date().toISOString(), text: gs.questUpdate.update }]
        : prevUpdates

      const questPatch: Record<string, unknown> = {
        status: gs.questUpdate.status,
        updates: newUpdate,
      }
      if (gs.questUpdate.description) questPatch.description = gs.questUpdate.description
      if (sourceNpcId) questPatch.source_npc_id = sourceNpcId
      if (targetLocationId) questPatch.target_location_id = targetLocationId
      if (reward && Object.keys(reward).length > 0) questPatch.reward = reward
      if (gs.questUpdate.status === 'completed' || gs.questUpdate.status === 'failed') {
        questPatch.completed_at = new Date().toISOString()
      }

      await supabaseAdmin
        .from('quests')
        .update(questPatch)
        .eq('id', existing.id)
    } else {
      const initialUpdates = gs.questUpdate.update
        ? [{ timestamp: new Date().toISOString(), text: gs.questUpdate.update }]
        : []

      await supabaseAdmin.from('quests').insert({
        campaign_id: campaignId,
        title: gs.questUpdate.title,
        description: gs.questUpdate.description || null,
        status: gs.questUpdate.status || 'rumor',
        source_npc_id: sourceNpcId,
        target_location_id: targetLocationId,
        reward: reward && Object.keys(reward).length > 0 ? reward : null,
        updates: initialUpdates,
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

  let resolvedLocationId: string | null = null

  if (gs.locationUpdate) {
    const loc = gs.locationUpdate
    const { data: existing } = await supabaseAdmin
      .from('world_locations')
      .select('id, visit_count')
      .eq('campaign_id', campaignId)
      .eq('name', loc.name)
      .single()

    if (existing) {
      resolvedLocationId = existing.id
      const resolvedStatus = loc.status || 'visited'
      const locUpdates: Record<string, unknown> = {
        discovered: resolvedStatus !== 'undiscovered',
        visit_count: resolvedStatus === 'visited' ? existing.visit_count + 1 : existing.visit_count,
        status: resolvedStatus,
      }
      if (loc.description) locUpdates.description = loc.description
      if (loc.terrain) locUpdates.terrain = loc.terrain
      if (loc.type) locUpdates.type = loc.type
      await supabaseAdmin
        .from('world_locations')
        .update(locUpdates)
        .eq('id', existing.id)
    } else {
      let parentId: string | null = null
      if (loc.parentName) {
        const { data: parent } = await supabaseAdmin
          .from('world_locations')
          .select('id')
          .eq('campaign_id', campaignId)
          .eq('name', loc.parentName)
          .single()
        parentId = parent?.id ?? null
      }

      const coords = loc.coordinates ?? {
        x: Math.random() * 800 + 100,
        y: Math.random() * 600 + 100,
      }

      const resolvedStatus = loc.status || 'visited'

      const { data: newLoc } = await supabaseAdmin
        .from('world_locations')
        .insert({
          campaign_id: campaignId,
          name: loc.name,
          type: loc.type || 'building',
          status: resolvedStatus,
          parent_id: parentId,
          description: loc.description || null,
          discovered: resolvedStatus !== 'undiscovered',
          visit_count: resolvedStatus === 'visited' ? 1 : 0,
          coordinates_x: coords.x,
          coordinates_y: coords.y,
          terrain: loc.terrain || null,
        })
        .select('id, campaign_id, name, type, description')
        .single()

      if (newLoc) {
        resolvedLocationId = newLoc.id
        generateLocationImageAsync(newLoc)
      }
    }

    if (loc.connectedTo && resolvedLocationId) {
      for (const connName of loc.connectedTo) {
        const { data: connLoc } = await supabaseAdmin
          .from('world_locations')
          .select('id, connected_locations')
          .eq('campaign_id', campaignId)
          .eq('name', connName)
          .single()
        if (connLoc) {
          const connIds = connLoc.connected_locations as string[] || []
          if (!connIds.includes(resolvedLocationId)) {
            await supabaseAdmin
              .from('world_locations')
              .update({ connected_locations: [...connIds, resolvedLocationId] })
              .eq('id', connLoc.id)
          }
          const { data: thisLoc } = await supabaseAdmin
            .from('world_locations')
            .select('connected_locations')
            .eq('id', resolvedLocationId)
            .single()
          const thisConnIds = (thisLoc?.connected_locations as string[]) || []
          if (!thisConnIds.includes(connLoc.id)) {
            await supabaseAdmin
              .from('world_locations')
              .update({ connected_locations: [...thisConnIds, connLoc.id] })
              .eq('id', resolvedLocationId)
          }
        }
      }
    }

    if (resolvedLocationId) {
      await supabaseAdmin
        .from('campaigns')
        .update({ current_location_id: resolvedLocationId })
        .eq('id', campaignId)
    }
  }

  if (gs.factionMet) {
    const { data: existing } = await supabaseAdmin
      .from('factions')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('name', gs.factionMet.name)
      .single()

    if (!existing) {
      const { data: newFaction } = await supabaseAdmin
        .from('factions')
        .insert({
          campaign_id: campaignId,
          name: gs.factionMet.name,
          description: gs.factionMet.description || null,
          alignment: gs.factionMet.alignment || null,
        })
        .select('id')
        .single()

      if (newFaction) {
        await supabaseAdmin.from('faction_reputation').insert({
          campaign_id: campaignId,
          faction_id: newFaction.id,
          score: 50,
        })
      }
    }
  }

  if (gs.reputationChange) {
    const { data: faction } = await supabaseAdmin
      .from('factions')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('name', gs.reputationChange.factionName)
      .single()

    if (faction) {
      const { data: rep } = await supabaseAdmin
        .from('faction_reputation')
        .select('score')
        .eq('campaign_id', campaignId)
        .eq('faction_id', faction.id)
        .single()

      if (rep) {
        const newScore = Math.max(0, Math.min(100, rep.score + gs.reputationChange.change))
        await supabaseAdmin
          .from('faction_reputation')
          .update({ score: newScore })
          .eq('campaign_id', campaignId)
          .eq('faction_id', faction.id)
      }
    }
  }

  if (gs.npcInteraction) {
    const { data: npc } = await supabaseAdmin
      .from('npcs')
      .select('id, disposition')
      .eq('campaign_id', campaignId)
      .eq('name', gs.npcInteraction.npcName)
      .single()

    if (npc) {
      const { data: campaign } = await supabaseAdmin
        .from('campaigns')
        .select('current_location_id')
        .eq('id', campaignId)
        .single()

      await supabaseAdmin.from('npc_interaction_logs').insert({
        campaign_id: campaignId,
        npc_id: npc.id,
        session_id: sessionId || null,
        location_id: campaign?.current_location_id || null,
        interaction_type: gs.npcInteraction.type || 'conversation',
        summary: gs.npcInteraction.summary,
        sentiment: gs.npcInteraction.sentiment || null,
        disposition_before: npc.disposition,
        disposition_after: npc.disposition,
      })
    }
  }

  if (gs.travelStart) {
    const [fromResult, toResult] = await Promise.all([
      supabaseAdmin
        .from('world_locations')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('name', gs.travelStart.from)
        .single(),
      supabaseAdmin
        .from('world_locations')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('name', gs.travelStart.to)
        .single(),
    ])

    await supabaseAdmin.from('travel_events').insert({
      campaign_id: campaignId,
      session_id: sessionId || null,
      from_location_id: fromResult.data?.id || null,
      to_location_id: toResult.data?.id || null,
    })
  }

  if (gs.npcMet && resolvedLocationId) {
    const { data: npcRecord } = await supabaseAdmin
      .from('npcs')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('name', gs.npcMet.name)
      .single()

    if (npcRecord) {
      await supabaseAdmin
        .from('npcs')
        .update({ location_id: resolvedLocationId })
        .eq('id', npcRecord.id)
    }
  }
}

function generateNpcPortraitAsync(npc: {
  id: string
  campaign_id: string
  name: string
  race?: string | null
  occupation?: string | null
  description?: string | null
}) {
  supabaseAdmin
    .from('campaigns')
    .select('image_generation_enabled')
    .eq('id', npc.campaign_id)
    .single()
    .then(async ({ data: camp }) => {
      if (!camp?.image_generation_enabled) return

      const parts = [`Fantasy character portrait of ${npc.name}`]
      if (npc.race || npc.occupation) {
        parts[0] += `, a ${[npc.race, npc.occupation].filter(Boolean).join(' ')}`
      }
      if (npc.description) parts.push(npc.description)
      parts.push('Style: detailed fantasy oil painting, dramatic lighting, dark background.')
      parts.push('Do not include any text, labels, or watermarks. Square format, bust portrait.')
      const prompt = parts.join('. ')
      const promptHash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16)

      try {
        const response = await withRetry(
          () => openai.images.generate({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
            response_format: 'b64_json',
          }),
          { maxRetries: 2, timeoutMs: 60_000 },
        )

        const b64 = response.data?.[0].b64_json
        if (!b64) return

        const buffer = Buffer.from(b64, 'base64')
        const storagePath = `${npc.campaign_id}/npc_portrait/${promptHash}.png`

        await supabaseAdmin.storage
          .from('generated-images')
          .upload(storagePath, buffer, { contentType: 'image/png', upsert: true })

        const { data: urlData } = supabaseAdmin.storage
          .from('generated-images')
          .getPublicUrl(storagePath)

        await supabaseAdmin.from('generated_images').upsert({
          campaign_id: npc.campaign_id,
          prompt_hash: promptHash,
          image_type: 'npc_portrait',
          storage_path: storagePath,
          public_url: urlData.publicUrl,
        }, { onConflict: 'campaign_id,prompt_hash' })

        await supabaseAdmin
          .from('npcs')
          .update({ portrait_url: urlData.publicUrl })
          .eq('id', npc.id)
      } catch (err) {
        console.error('Auto portrait generation failed:', err instanceof Error ? err.message : err)
      }
    })
}

function generateLocationImageAsync(location: {
  id: string
  campaign_id: string
  name: string
  type: string
  description?: string | null
}) {
  const run = supabaseAdmin
    .from('campaigns')
    .select('image_generation_enabled')
    .eq('id', location.campaign_id)
    .single()
    .then(async ({ data: camp }) => {
      if (!camp?.image_generation_enabled) return

      const parts = [`Fantasy environment: ${location.name}`]
      if (location.description) parts.push(location.description)
      parts.push('Style: detailed fantasy concept art, atmospheric, cinematic lighting.')
      parts.push('Do not include any text, labels, or watermarks. Wide format landscape.')
      const prompt = parts.join('. ')
      const promptHash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16)

      try {
        const response = await withRetry(
          () => openai.images.generate({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size: '1792x1024',
            quality: 'standard',
            response_format: 'b64_json',
          }),
          { maxRetries: 2, timeoutMs: 60_000 },
        )

        const b64 = response.data?.[0].b64_json
        if (!b64) return

        const buffer = Buffer.from(b64, 'base64')
        const storagePath = `${location.campaign_id}/location/${promptHash}.png`

        await supabaseAdmin.storage
          .from('generated-images')
          .upload(storagePath, buffer, { contentType: 'image/png', upsert: true })

        const { data: urlData } = supabaseAdmin.storage
          .from('generated-images')
          .getPublicUrl(storagePath)

        await supabaseAdmin.from('generated_images').upsert({
          campaign_id: location.campaign_id,
          prompt_hash: promptHash,
          image_type: 'location',
          storage_path: storagePath,
          public_url: urlData.publicUrl,
        }, { onConflict: 'campaign_id,prompt_hash' })

        await supabaseAdmin
          .from('world_locations')
          .update({ image_url: urlData.publicUrl })
          .eq('id', location.id)
      } catch (err) {
        console.error('Auto location image generation failed:', err instanceof Error ? err.message : err)
      }
    })
  void run
}
