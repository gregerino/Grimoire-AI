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
