import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase-admin'
import { rollFateChart, rollRandomEvent, type OddsLevel } from '../../src/lib/fate-chart'

export const travelRoutes = Router()

const DANGER_TO_ODDS: Record<number, OddsLevel> = {
  1: 'impossible',
  2: 'very_unlikely',
  3: 'unlikely',
  4: '50/50',
  5: 'likely',
}

const TERRAIN_SPEED: Record<string, number> = {
  plains: 1.0,
  forest: 1.5,
  mountain: 2.0,
  desert: 1.8,
  swamp: 2.0,
  coastal: 1.2,
  underground: 1.5,
  urban: 0.5,
  arctic: 1.8,
}

// POST /api/travel/start
travelRoutes.post('/start', async (req: Request, res: Response) => {
  const { campaign_id, from_id, to_id, session_id } = req.body

  if (!campaign_id || !from_id || !to_id) {
    res.status(400).json({ error: 'Missing campaign_id, from_id, or to_id' })
    return
  }

  const [fromResult, toResult, campaignResult] = await Promise.all([
    supabaseAdmin.from('world_locations').select('*').eq('id', from_id).single(),
    supabaseAdmin.from('world_locations').select('*').eq('id', to_id).single(),
    supabaseAdmin.from('campaigns').select('chaos_factor').eq('id', campaign_id).single(),
  ])

  if (!fromResult.data || !toResult.data) {
    res.status(404).json({ error: 'One or both locations not found' })
    return
  }

  const from = fromResult.data
  const to = toResult.data
  const chaosFactor = campaignResult.data?.chaos_factor ?? 5

  const dx = to.coordinates_x - from.coordinates_x
  const dy = to.coordinates_y - from.coordinates_y
  const distance = Math.sqrt(dx * dx + dy * dy)

  const terrainMod = TERRAIN_SPEED[to.terrain || 'plains'] || 1.0
  const durationHours = Math.max(0.5, Math.round((distance / 100) * terrainMod * 2) / 2)

  const dangerLevel = Math.max(from.danger_level, to.danger_level)
  const odds = DANGER_TO_ODDS[dangerLevel] || 'Unlikely'
  const fateResult = rollFateChart(odds, chaosFactor)

  const encounterTriggered = fateResult.result === 'exceptional_yes' || fateResult.result === 'yes'

  let encounter = null
  if (encounterTriggered) {
    const event = rollRandomEvent()
    encounter = {
      type: event.focus,
      action: event.action,
      subject: event.subject,
    }
  }

  await supabaseAdmin.from('travel_events').insert({
    campaign_id,
    session_id: session_id || null,
    from_location_id: from_id,
    to_location_id: to_id,
    encounter_type: encounterTriggered ? 'combat' : 'peaceful',
    description: encounter ? `${encounter.type}: ${encounter.action} ${encounter.subject}` : 'Uneventful journey',
  })

  await supabaseAdmin
    .from('campaigns')
    .update({ current_location_id: to_id })
    .eq('id', campaign_id)

  await supabaseAdmin
    .from('world_locations')
    .update({
      discovered: true,
      visit_count: to.visit_count + 1,
    })
    .eq('id', to_id)

  res.json({
    duration: durationHours,
    distance: Math.round(distance),
    terrain: to.terrain || 'plains',
    dangerLevel,
    encounter: {
      triggered: encounterTriggered,
      event: encounter,
      fateResult,
    },
    from: { id: from.id, name: from.name },
    to: { id: to.id, name: to.name },
  })
})
