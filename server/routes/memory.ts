import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase-admin'

export const memoryRoutes = Router()

memoryRoutes.get('/list/:campaignId', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('campaign_memories')
      .select('*')
      .eq('campaign_id', req.params.campaignId)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ memories: data })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list memories' })
  }
})

memoryRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { campaign_id, content, category, importance, source } = req.body
    if (!campaign_id || !content) {
      res.status(400).json({ error: 'Missing campaign_id or content' })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('campaign_memories')
      .insert({
        campaign_id,
        content,
        category: category || 'plot',
        importance: importance || 'medium',
        source: source || 'user',
      })
      .select()
      .single()

    if (error) throw error
    res.json({ memory: data })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create memory' })
  }
})

memoryRoutes.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { content, category, importance } = req.body

    const updates: Record<string, unknown> = {}
    if (content !== undefined) updates.content = content
    if (category !== undefined) updates.category = category
    if (importance !== undefined) updates.importance = importance

    const { data, error } = await supabaseAdmin
      .from('campaign_memories')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json({ memory: data })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update memory' })
  }
})

memoryRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin
      .from('campaign_memories')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete memory' })
  }
})
