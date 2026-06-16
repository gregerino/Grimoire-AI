import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase-admin'

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
