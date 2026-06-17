import { Router, Request, Response } from 'express'
import multer from 'multer'
import { parseCharacterPdfFromBuffer } from '../services/character-parser'
import { supabaseAdmin } from '../lib/supabase-admin'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Only PDF files are allowed'))
  },
})

export const characterRoutes = Router()

// POST /api/character/parse — upload a DnD Beyond PDF, get structured data back
characterRoutes.post(
  '/parse',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file
      if (!file) {
        res.status(400).json({ error: 'No file uploaded' })
        return
      }

      const { sheet, fields } = await parseCharacterPdfFromBuffer(file.buffer)
      res.json({ character: sheet, fieldCount: Object.keys(fields).length })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse character PDF'
      res.status(500).json({ error: message })
    }
  },
)

// POST /api/character/save — save parsed character sheet to campaign
characterRoutes.post('/save', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaign_id, character } = req.body
    if (!campaign_id || !character) {
      res.status(400).json({ error: 'Missing campaign_id or character data' })
      return
    }

    const { error } = await supabaseAdmin
      .from('character_sheets')
      .upsert(
        {
          campaign_id,
          data: character,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'campaign_id' },
      )

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    await supabaseAdmin
      .from('campaigns')
      .update({
        character_name: character.name,
        character_class: character.class,
        character_level: character.level,
        current_hp: character.hp.current,
        max_hp: character.hp.max,
      })
      .eq('id', campaign_id)

    res.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save character'
    res.status(500).json({ error: message })
  }
})

// PATCH /api/character/:campaignId/rest — perform a short or long rest
characterRoutes.patch('/:campaignId/rest', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params
    const { type, hitDiceUsed = 0 } = req.body as { type: 'short' | 'long'; hitDiceUsed?: number }

    if (!type || (type !== 'short' && type !== 'long')) {
      res.status(400).json({ error: 'Invalid rest type' })
      return
    }

    const { data: sheet, error: sheetError } = await supabaseAdmin
      .from('character_sheets')
      .select('data')
      .eq('campaign_id', campaignId)
      .single()

    if (sheetError || !sheet?.data) {
      res.status(404).json({ error: 'No character sheet found' })
      return
    }

    const charData = sheet.data as Record<string, unknown>
    const hp = charData.hp as { current: number; max: number; temp: number }
    const spellSlots = charData.spellSlots as Record<string, { used: number; max: number }> | undefined
    const stats = charData.stats as Record<string, number> | undefined
    const conMod = stats ? Math.floor(((stats.CON ?? 10) - 10) / 2) : 0
    const charClass = ((charData.class as string) || '').toLowerCase()

    const CLASS_HIT_DICE: Record<string, number> = {
      barbarian: 12, fighter: 10, paladin: 10, ranger: 10,
      bard: 8, cleric: 8, druid: 8, monk: 8, rogue: 8, warlock: 8,
      sorcerer: 6, wizard: 6, artificer: 8, 'blood hunter': 10,
    }
    const hitDieSize = CLASS_HIT_DICE[charClass] ?? 8

    const rawHitDice = charData.hitDice
    const level = (charData.level as number) ?? 1
    if (!rawHitDice || typeof rawHitDice === 'string' || !('current' in (rawHitDice as object))) {
      charData.hitDice = { current: level, max: level }
    }
    const hd = charData.hitDice as { current: number; max: number }

    let hpHealed = 0

    if (type === 'short') {
      const diceToUse = Math.min(hitDiceUsed, hd.current)
      for (let i = 0; i < diceToUse; i++) {
        const roll = Math.max(1, Math.floor(Math.random() * hitDieSize) + 1 + conMod)
        hpHealed += roll
      }
      hp.current = Math.min(hp.max, hp.current + hpHealed)
      hd.current -= diceToUse
    } else {
      hpHealed = hp.max - hp.current
      hp.current = hp.max
      hp.temp = 0

      if (spellSlots) {
        for (const level of Object.keys(spellSlots)) {
          spellSlots[level].used = 0
        }
      }

      const recovered = Math.max(1, Math.floor(hd.max / 2))
      hd.current = Math.min(hd.max, hd.current + recovered)

      let conditions = (charData.activeConditions as string[] | undefined) ?? []
      const exhIdx = conditions.indexOf('exhaustion')
      if (exhIdx >= 0) conditions.splice(exhIdx, 1)
      charData.activeConditions = conditions
    }

    await supabaseAdmin
      .from('character_sheets')
      .update({ data: charData, updated_at: new Date().toISOString() })
      .eq('campaign_id', campaignId)

    await supabaseAdmin
      .from('campaigns')
      .update({ current_hp: hp.current })
      .eq('id', campaignId)

    res.json({
      success: true,
      type,
      hpHealed,
      newHp: hp.current,
      hitDiceRemaining: hd.current,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to perform rest'
    res.status(500).json({ error: message })
  }
})

// GET /api/character/:campaignId — get saved character sheet
characterRoutes.get('/:campaignId', async (req: Request, res: Response): Promise<void> => {
  const { campaignId } = req.params
  const { data, error } = await supabaseAdmin
    .from('character_sheets')
    .select('data, updated_at')
    .eq('campaign_id', campaignId)
    .single()

  if (error || !data) {
    res.json({ character: null })
    return
  }

  res.json({ character: data.data, updatedAt: data.updated_at })
})
