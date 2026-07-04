import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase-admin'
import { abilityModifier, proficiencyBonusForLevel, maxHpForLevel, armorClass } from '../services/sidekick'
import type { SidekickKit, SidekickStats } from '../../src/types/database'

export const sidekickRoutes = Router()

// GET /api/sidekick/list/:campaignId
sidekickRoutes.get('/list/:campaignId', async (req: Request, res: Response) => {
  const { campaignId } = req.params

  const { data, error } = await supabaseAdmin
    .from('sidekicks')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ sidekicks: data || [] })
})

// POST /api/sidekick — create a sidekick from a kit, applying Tasha's formulas
sidekickRoutes.post('/', async (req: Request, res: Response) => {
  const {
    campaign_id,
    npc_id,
    name,
    kit,
    base_creature,
    level = 1,
    stats,
    speed = 30,
    armor_base_ac = 10,
    dex_cap,
    has_shield = false,
  }: {
    campaign_id: string
    npc_id?: string | null
    name: string
    kit: SidekickKit
    base_creature?: string | null
    level?: number
    stats: SidekickStats
    speed?: number
    armor_base_ac?: number
    dex_cap?: number
    has_shield?: boolean
  } = req.body

  if (!campaign_id || !name || !kit || !stats) {
    res.status(400).json({ error: 'Missing campaign_id, name, kit, or stats' })
    return
  }

  const proficiency_bonus = proficiencyBonusForLevel(level)
  const conModifier = abilityModifier(stats.con)
  const dexModifier = abilityModifier(stats.dex)
  const max_hp = maxHpForLevel(kit, level, conModifier)
  const ac = armorClass(dexModifier, armor_base_ac, dex_cap ?? Infinity, has_shield)

  const { data, error } = await supabaseAdmin
    .from('sidekicks')
    .insert({
      campaign_id,
      npc_id: npc_id || null,
      name,
      kit,
      base_creature: base_creature || null,
      level,
      proficiency_bonus,
      stats,
      current_hp: max_hp,
      max_hp,
      ac,
      speed,
    })
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ sidekick: data })
})

// PATCH /api/sidekick/:id — freeform update (name, notes, is_active, current_hp, features, ...)
sidekickRoutes.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body

  const { data, error } = await supabaseAdmin
    .from('sidekicks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ sidekick: data })
})

// PATCH /api/sidekick/:id/level — level up, recomputing proficiency bonus and max HP
sidekickRoutes.patch('/:id/level', async (req: Request, res: Response) => {
  const { id } = req.params
  const { level }: { level: number } = req.body

  if (!level) {
    res.status(400).json({ error: 'Missing level' })
    return
  }

  const { data: sidekick, error: fetchError } = await supabaseAdmin
    .from('sidekicks')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !sidekick) {
    res.status(404).json({ error: 'Sidekick not found' })
    return
  }

  const conModifier = abilityModifier(sidekick.stats.con)
  const proficiency_bonus = proficiencyBonusForLevel(level)
  const max_hp = maxHpForLevel(sidekick.kit, level, conModifier)
  const hpGained = max_hp - sidekick.max_hp
  const current_hp = Math.min(max_hp, sidekick.current_hp + hpGained)

  const { data, error } = await supabaseAdmin
    .from('sidekicks')
    .update({ level, proficiency_bonus, max_hp, current_hp })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ sidekick: data })
})

// DELETE /api/sidekick/:id
sidekickRoutes.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  const { error } = await supabaseAdmin.from('sidekicks').delete().eq('id', id)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ success: true })
})
