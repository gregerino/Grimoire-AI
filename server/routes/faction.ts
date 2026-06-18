import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase-admin'

export const factionRoutes = Router()

// GET /api/faction/list/:campaignId — list factions with reputation scores
factionRoutes.get('/list/:campaignId', async (req: Request, res: Response) => {
  const { campaignId } = req.params

  const [factionsResult, reputationResult] = await Promise.all([
    supabaseAdmin
      .from('factions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('faction_reputation')
      .select('*')
      .eq('campaign_id', campaignId),
  ])

  if (factionsResult.error) {
    res.status(500).json({ error: factionsResult.error.message })
    return
  }

  res.json({
    factions: factionsResult.data || [],
    reputations: reputationResult.data || [],
  })
})

// POST /api/faction
factionRoutes.post('/', async (req: Request, res: Response) => {
  const { campaign_id, name, description, alignment } = req.body

  if (!campaign_id || !name) {
    res.status(400).json({ error: 'Missing campaign_id or name' })
    return
  }

  const { data: faction, error } = await supabaseAdmin
    .from('factions')
    .insert({
      campaign_id,
      name,
      description: description || null,
      alignment: alignment || null,
    })
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  await supabaseAdmin.from('faction_reputation').insert({
    campaign_id,
    faction_id: faction.id,
    score: 50,
  })

  res.json({ faction })
})

// PATCH /api/faction/:id
factionRoutes.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body

  const { data, error } = await supabaseAdmin
    .from('factions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ faction: data })
})

// PATCH /api/faction/:id/reputation — adjust reputation score
factionRoutes.patch('/:id/reputation', async (req: Request, res: Response) => {
  const { id } = req.params
  const { change, campaign_id } = req.body

  if (change === undefined || !campaign_id) {
    res.status(400).json({ error: 'Missing change or campaign_id' })
    return
  }

  const { data: rep } = await supabaseAdmin
    .from('faction_reputation')
    .select('score')
    .eq('campaign_id', campaign_id)
    .eq('faction_id', id)
    .single()

  if (!rep) {
    res.status(404).json({ error: 'Reputation record not found' })
    return
  }

  const newScore = Math.max(0, Math.min(100, rep.score + change))

  const { data, error } = await supabaseAdmin
    .from('faction_reputation')
    .update({ score: newScore })
    .eq('campaign_id', campaign_id)
    .eq('faction_id', id)
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ reputation: data })
})
