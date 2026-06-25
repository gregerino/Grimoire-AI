import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase-admin'
import { resolveProvider, createCompletion } from '../lib/ai-provider'

export const tavernRoutes = Router()

interface TavernGuest {
  name: string
  race: string
  occupation: string
  rumor: string
}

interface TavernResult {
  name: string
  description: string
  host: {
    name: string
    race: string
    personality: string
  }
  guests: TavernGuest[]
  specialty: string
  event: string | null
}

tavernRoutes.post('/generate', async (req: Request, res: Response) => {
  try {
    const { campaign_id, region_name, user_id } = req.body
    if (!campaign_id) {
      res.status(400).json({ error: 'Missing campaign_id' })
      return
    }

    const provider = resolveProvider(user_id)

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('setting')
      .eq('id', campaign_id)
      .single()

    const setting = campaign?.setting || 'Standard fantasy'
    const region = region_name || setting

    const text = await createCompletion({
      provider,
      maxTokens: 1024,
      messages: [{
        role: 'user',
        content: `Generate a unique fantasy tavern for the region "${region}" in a ${setting} setting. Include:

* A creative name with a connection to the region
* A short atmospheric description (2-3 sentences)
* An innkeeper: name, race, personality trait
* 2-3 guests, each with: name, race, occupation, and one rumor or secret
* A house specialty (food or drink)
* An optional ongoing event or activity (or null)

Return ONLY valid JSON with this exact structure, no other text:
{
  "name": "string",
  "description": "string",
  "host": { "name": "string", "race": "string", "personality": "string" },
  "guests": [{ "name": "string", "race": "string", "occupation": "string", "rumor": "string" }],
  "specialty": "string",
  "event": "string or null"
}`
      }],
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      res.status(500).json({ error: 'Failed to parse tavern response' })
      return
    }

    const tavern: TavernResult = JSON.parse(jsonMatch[0])
    res.json({ tavern })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate tavern' })
  }
})
