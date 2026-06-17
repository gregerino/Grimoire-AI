import { Router, Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../lib/supabase-admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const npcRoutes = Router()

// POST /api/npc/:id/ai-update — AI-driven NPC update based on session context
npcRoutes.post('/:id/ai-update', async (req: Request, res: Response) => {
  const { id } = req.params
  const { context } = req.body

  const { data: npc, error } = await supabaseAdmin
    .from('npcs')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !npc) {
    res.status(404).json({ error: 'NPC not found' })
    return
  }

  const result = await anthropic.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are analyzing an NPC in a D&D campaign. Based on the context provided, update the NPC's information.

CURRENT NPC DATA:
Name: ${npc.name}
Race: ${npc.race || 'Unknown'}
Occupation: ${npc.occupation || 'Unknown'}
Disposition: ${npc.disposition}
Description: ${npc.description || 'None'}
Location: ${npc.location || 'Unknown'}
Backstory: ${npc.backstory || 'None'}
Relationship to player: ${npc.relationship || 'None'}
Alive: ${npc.is_alive}
Notes: ${npc.notes || 'None'}

CONTEXT / RECENT EVENTS:
${context}

Respond with ONLY a JSON object containing the fields that should be updated. Only include fields that have meaningfully changed based on the context. Valid fields: description, disposition (friendly/neutral/hostile), location, backstory, relationship, notes, is_alive, occupation.

Example: {"disposition": "friendly", "relationship": "The party saved her village, she now considers them allies", "location": "Silverymoon marketplace"}`,
      },
    ],
  })

  const text = result.content[0].type === 'text' ? result.content[0].text : '{}'

  let updates: Record<string, unknown>
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    updates = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  } catch {
    res.status(400).json({ error: 'Failed to parse AI response' })
    return
  }

  const allowedFields = ['description', 'disposition', 'location', 'backstory', 'relationship', 'notes', 'is_alive', 'occupation']
  const filtered: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) filtered[key] = value
  }

  if (Object.keys(filtered).length === 0) {
    res.json({ npc, updates: {} })
    return
  }

  const { data: updated } = await supabaseAdmin
    .from('npcs')
    .update(filtered)
    .eq('id', id)
    .select()
    .single()

  res.json({ npc: updated, updates: filtered })
})
