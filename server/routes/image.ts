import { Router, Request, Response } from 'express'
import OpenAI from 'openai'
import crypto from 'crypto'
import { supabaseAdmin } from '../lib/supabase-admin'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const imageRoutes = Router()

const SESSION_IMAGE_COUNTS = new Map<string, number>()
const MAX_IMAGES_PER_SESSION = 10

function hashPrompt(prompt: string): string {
  return crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16)
}

function buildNpcPortraitPrompt(npc: {
  name: string
  race?: string | null
  occupation?: string | null
  description?: string | null
}): string {
  const parts = [`Fantasy character portrait of ${npc.name}`]
  if (npc.race || npc.occupation) {
    parts[0] += `, a ${[npc.race, npc.occupation].filter(Boolean).join(' ')}`
  }
  if (npc.description) parts.push(npc.description)
  parts.push('Style: detailed fantasy oil painting, dramatic lighting, dark background.')
  parts.push('Do not include any text, labels, or watermarks. Square format, bust portrait.')
  return parts.join('. ')
}

function buildLocationPrompt(location: {
  name: string
  description?: string | null
  timeOfDay?: string
  weather?: string
}): string {
  const parts = [`Fantasy environment: ${location.name}`]
  if (location.description) parts.push(location.description)
  if (location.timeOfDay) parts.push(`Time of day: ${location.timeOfDay}`)
  if (location.weather) parts.push(`Weather: ${location.weather}`)
  parts.push('Style: detailed fantasy concept art, atmospheric, cinematic lighting.')
  parts.push('Do not include any text, labels, or watermarks. Wide format landscape.')
  return parts.join('. ')
}

async function getCachedImage(
  campaignId: string,
  promptHash: string,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('generated_images')
    .select('public_url')
    .eq('campaign_id', campaignId)
    .eq('prompt_hash', promptHash)
    .single()
  return data?.public_url ?? null
}

async function generateAndStore(
  campaignId: string,
  prompt: string,
  imageType: 'npc_portrait' | 'location',
  size: '1024x1024' | '1536x1024' = '1024x1024',
): Promise<string> {
  const promptHash = hashPrompt(prompt)

  const cached = await getCachedImage(campaignId, promptHash)
  if (cached) return cached

  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size,
    quality: 'low',
  })

  const b64 = response.data[0].b64_json
  if (!b64) throw new Error('No image data returned')
  const buffer = Buffer.from(b64, 'base64')
  const storagePath = `${campaignId}/${imageType}/${promptHash}.png`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('generated-images')
    .upload(storagePath, buffer, {
      contentType: 'image/png',
      upsert: true,
    })

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

  const { data: urlData } = supabaseAdmin.storage
    .from('generated-images')
    .getPublicUrl(storagePath)

  const publicUrl = urlData.publicUrl

  await supabaseAdmin.from('generated_images').upsert({
    campaign_id: campaignId,
    prompt_hash: promptHash,
    image_type: imageType,
    storage_path: storagePath,
    public_url: publicUrl,
  }, { onConflict: 'campaign_id,prompt_hash' })

  return publicUrl
}

function checkRateLimit(sessionId: string): boolean {
  const count = SESSION_IMAGE_COUNTS.get(sessionId) ?? 0
  if (count >= MAX_IMAGES_PER_SESSION) return false
  SESSION_IMAGE_COUNTS.set(sessionId, count + 1)
  return true
}

// POST /api/image/generate — generate an image
imageRoutes.post('/generate', async (req: Request, res: Response) => {
  try {
    const { campaign_id, session_id, type, data } = req.body

    if (!campaign_id || !type) {
      res.status(400).json({ error: 'Missing campaign_id or type' })
      return
    }

    if (type !== 'npc_portrait' && type !== 'location') {
      res.status(400).json({ error: 'Invalid type. Must be npc_portrait or location.' })
      return
    }

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('image_generation_enabled')
      .eq('id', campaign_id)
      .single()

    if (!campaign?.image_generation_enabled) {
      res.status(200).json({ url: null, reason: 'disabled' })
      return
    }

    if (session_id && !checkRateLimit(session_id)) {
      res.status(200).json({ url: null, reason: 'rate_limited' })
      return
    }

    let prompt: string
    let size: '1024x1024' | '1536x1024' = '1024x1024'
    const imageType = type as 'npc_portrait' | 'location'

    if (type === 'npc_portrait') {
      prompt = buildNpcPortraitPrompt(data)
    } else {
      prompt = buildLocationPrompt(data)
      size = '1536x1024'
    }

    const url = await generateAndStore(campaign_id, prompt, imageType, size)
    res.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image generation failed'
    console.error('Image generation error:', message)
    res.status(500).json({ error: message })
  }
})

// POST /api/image/npc/:id — generate portrait for existing NPC
imageRoutes.post('/npc/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { session_id } = req.body

    const { data: npc, error } = await supabaseAdmin
      .from('npcs')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !npc) {
      res.status(404).json({ error: 'NPC not found' })
      return
    }

    if (npc.portrait_url) {
      res.json({ url: npc.portrait_url })
      return
    }

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('image_generation_enabled')
      .eq('id', npc.campaign_id)
      .single()

    if (!campaign?.image_generation_enabled) {
      res.json({ url: null, reason: 'disabled' })
      return
    }

    if (session_id && !checkRateLimit(session_id)) {
      res.json({ url: null, reason: 'rate_limited' })
      return
    }

    const prompt = buildNpcPortraitPrompt(npc)
    const url = await generateAndStore(npc.campaign_id, prompt, 'npc_portrait')

    await supabaseAdmin
      .from('npcs')
      .update({ portrait_url: url })
      .eq('id', id)

    res.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Portrait generation failed'
    console.error('NPC portrait error:', message)
    res.status(500).json({ error: message })
  }
})
