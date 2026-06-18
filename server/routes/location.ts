import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase-admin'

export const locationRoutes = Router()

// GET /api/location/list/:campaignId
locationRoutes.get('/list/:campaignId', async (req: Request, res: Response) => {
  const { campaignId } = req.params

  const { data, error } = await supabaseAdmin
    .from('world_locations')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ locations: data })
})

// GET /api/location/:id
locationRoutes.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  const { data, error } = await supabaseAdmin
    .from('world_locations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    res.status(404).json({ error: 'Location not found' })
    return
  }

  const { data: children } = await supabaseAdmin
    .from('world_locations')
    .select('id, name, type, discovered')
    .eq('parent_id', id)

  res.json({ location: data, children: children || [] })
})

// POST /api/location
locationRoutes.post('/', async (req: Request, res: Response) => {
  const { campaign_id, name, type, parent_id, description, coordinates_x, coordinates_y, terrain, danger_level } = req.body

  if (!campaign_id || !name) {
    res.status(400).json({ error: 'Missing campaign_id or name' })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('world_locations')
    .insert({
      campaign_id,
      name,
      type: type || 'building',
      parent_id: parent_id || null,
      description: description || null,
      coordinates_x: coordinates_x ?? Math.random() * 800 + 100,
      coordinates_y: coordinates_y ?? Math.random() * 600 + 100,
      terrain: terrain || null,
      danger_level: danger_level ?? 1,
      discovered: true,
      visit_count: 0,
    })
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ location: data })
})

// PATCH /api/location/:id
locationRoutes.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body

  const { data, error } = await supabaseAdmin
    .from('world_locations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ location: data })
})

// DELETE /api/location/:id
locationRoutes.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  const { error } = await supabaseAdmin
    .from('world_locations')
    .delete()
    .eq('id', id)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ success: true })
})

// POST /api/location/:id/connect/:otherId
locationRoutes.post('/:id/connect/:otherId', async (req: Request, res: Response) => {
  const { id, otherId } = req.params

  const [locA, locB] = await Promise.all([
    supabaseAdmin.from('world_locations').select('id, connected_locations').eq('id', id).single(),
    supabaseAdmin.from('world_locations').select('id, connected_locations').eq('id', otherId).single(),
  ])

  if (!locA.data || !locB.data) {
    res.status(404).json({ error: 'One or both locations not found' })
    return
  }

  const aConns = (locA.data.connected_locations as string[]) || []
  const bConns = (locB.data.connected_locations as string[]) || []

  const updates = []
  if (!aConns.includes(otherId)) {
    updates.push(
      supabaseAdmin.from('world_locations').update({ connected_locations: [...aConns, otherId] }).eq('id', id),
    )
  }
  if (!bConns.includes(id)) {
    updates.push(
      supabaseAdmin.from('world_locations').update({ connected_locations: [...bConns, id] }).eq('id', otherId),
    )
  }

  await Promise.all(updates)
  res.json({ success: true })
})
