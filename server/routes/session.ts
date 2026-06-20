import { Router, Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../lib/supabase-admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const sessionRoutes = Router()

// POST /api/session — create a new session
sessionRoutes.post('/', async (req: Request, res: Response) => {
  const { campaign_id } = req.body

  if (!campaign_id) {
    res.status(400).json({ error: 'Missing campaign_id' })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .insert({ campaign_id })
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ session: data })
})

// GET /api/session/list/:campaignId — list sessions for a campaign
sessionRoutes.get('/list/:campaignId', async (req: Request, res: Response) => {
  const { campaignId } = req.params

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('started_at', { ascending: false })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ sessions: data })
})

// PATCH /api/session/:id — end a session (set ended_at, title, summary)
sessionRoutes.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ session: data })
})

// POST /api/session/:id/message — save a chat message
sessionRoutes.post('/:id/message', async (req: Request, res: Response) => {
  const { id } = req.params
  const { campaign_id, role, content } = req.body

  if (!campaign_id || !role || !content) {
    res.status(400).json({ error: 'Missing campaign_id, role, or content' })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({ session_id: id, campaign_id, role, content })
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ message: data })
})

// GET /api/session/:id/messages — get all messages for a session
sessionRoutes.get('/:id/messages', async (req: Request, res: Response) => {
  const { id } = req.params

  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('session_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ messages: data })
})

// POST /api/session/:id/summarize — generate a diary-style summary
sessionRoutes.post('/:id/summarize', async (req: Request, res: Response) => {
  const { id } = req.params
  const { campaign_id, character_name } = req.body

  const { data: msgs } = await supabaseAdmin
    .from('messages')
    .select('role, content')
    .eq('session_id', id)
    .order('created_at', { ascending: true })

  if (!msgs || msgs.length === 0) {
    res.json({ summary: null })
    return
  }

  const transcript = msgs
    .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'PLAYER' : 'DM'}: ${m.content}`)
    .join('\n\n')

  const result = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a chronicler writing a journal entry for a D&D adventurer${character_name ? ` named ${character_name}` : ''}. Based on the session transcript below:

1. Write a short, evocative title (3-7 words) that captures the essence of this session — like a chapter name in a novel. Examples: "The Goblin's Bargain", "Shadows Over Cragmaw", "A Deal in Firelight". Output this on the FIRST line prefixed with "TITLE: ".

2. Then write a first-person diary entry (2-4 paragraphs) that captures the key events, encounters, discoveries, and emotional moments. Write in an evocative, atmospheric style — as if the character is reflecting on the day's events by candlelight. Include specific details from the session. Do not include a date header or "Dear Diary" — start directly with the narrative.

SESSION TRANSCRIPT:
${transcript}`,
      },
    ],
  })

  const raw = result.content[0].type === 'text' ? result.content[0].text : ''
  const titleMatch = raw.match(/^TITLE:\s*(.+)/m)
  const title = titleMatch ? titleMatch[1].trim().replace(/^["']|["']$/g, '') : 'Untitled Session'
  const summary = raw.replace(/^TITLE:\s*.+\n+/m, '').trim()

  await supabaseAdmin
    .from('sessions')
    .update({ summary, title, ended_at: new Date().toISOString() })
    .eq('id', id)

  if (campaign_id) {
    await supabaseAdmin
      .from('campaign_memories')
      .insert({ campaign_id, session_id: id, content: `Session summary: ${summary.slice(0, 500)}` })
  }

  res.json({ summary, title })
})
