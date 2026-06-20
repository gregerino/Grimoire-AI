import { Router, Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { supabaseAdmin } from '../lib/supabase-admin'
import { resolveFateRoll, type FateResult } from '../../src/lib/fate-chart'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const lootRoutes = Router()

interface LootItem {
  name: string
  category: 'weapon' | 'armor' | 'potion' | 'scroll' | 'gear' | 'treasure' | 'tool' | 'other'
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary'
  description: string
  weight: number
  value_gp: number
  value_sp: number
  value_cp: number
  properties: Record<string, unknown>
}

interface LootResult {
  items: LootItem[]
  currency: { gp: number; sp: number; cp: number }
  narrative: string
  fateResult: FateResult
}

function determineLootQuality(fateResult: FateResult): { rarityPool: string[]; itemCount: number; currencyMultiplier: number } {
  switch (fateResult) {
    case 'exceptional_yes':
      return { rarityPool: ['rare', 'very_rare', 'legendary'], itemCount: 3, currencyMultiplier: 3 }
    case 'yes':
      return { rarityPool: ['uncommon', 'rare'], itemCount: 2, currencyMultiplier: 1.5 }
    case 'no':
      return { rarityPool: ['common', 'uncommon'], itemCount: 1, currencyMultiplier: 1 }
    case 'exceptional_no':
      return { rarityPool: ['common'], itemCount: 0, currencyMultiplier: 0.5 }
  }
}

lootRoutes.post('/generate', async (req: Request, res: Response) => {
  try {
    const { campaign_id, monster_name, monster_cr, context, chaos_factor = 5 } = req.body

    if (!campaign_id || !monster_name) {
      res.status(400).json({ error: 'Missing campaign_id or monster_name' })
      return
    }

    const fateRoll = Math.floor(Math.random() * 100) + 1
    const fateResult = resolveFateRoll(fateRoll, '50/50', chaos_factor)
    const lootQuality = determineLootQuality(fateResult.result)

    let ragContext = ''
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: `${monster_name} loot treasure drops items CR ${monster_cr ?? ''}`,
      })
      const queryEmbedding = embeddingResponse.data[0].embedding

      const { data: ragResults } = await supabaseAdmin.rpc('match_documents', {
        query_embedding: JSON.stringify(queryEmbedding),
        match_campaign_id: campaign_id,
        match_count: 3,
      })

      if (ragResults?.length) {
        ragContext = ragResults.map((r: { content: string }) => r.content).join('\n\n')
      }
    } catch {
      // RAG is best-effort
    }

    const prompt = `Generate loot for defeating a ${monster_name}${monster_cr ? ` (CR ${monster_cr})` : ''}.

Fate Chart result: ${fateResult.result} (this determines loot quality).
Maximum rarity pool: ${lootQuality.rarityPool.join(', ')}
Number of items to generate: ${lootQuality.itemCount}
Currency multiplier: ${lootQuality.currencyMultiplier}x

${ragContext ? `SOURCE MATERIAL for reference:\n${ragContext}\n` : ''}
${context ? `Scene context: ${context}\n` : ''}

Respond with ONLY a JSON object (no markdown, no backticks):
{
  "items": [
    {
      "name": "item name",
      "category": "weapon|armor|potion|scroll|gear|treasure|tool|other",
      "rarity": "common|uncommon|rare|very_rare|legendary",
      "description": "evocative 1-2 sentence description",
      "weight": 0,
      "value_gp": 0,
      "value_sp": 0,
      "value_cp": 0,
      "properties": {}
    }
  ],
  "currency": { "gp": 0, "sp": 0, "cp": 0 },
  "narrative": "A dramatic 2-3 sentence description of finding the loot, written in second person."
}

Rules:
- Items must be appropriate for the monster type and CR
- Rarity must not exceed the maximum rarity pool
- Currency should be appropriate for the CR (use D&D 5e treasure tables as reference)
- Apply the currency multiplier to the base amount
- For weapons, include damage in properties: { "damage": "1d8", "damageType": "slashing" }
- For armor, include AC in properties: { "ac": 14, "type": "medium" }
- For potions/scrolls, include effect: { "effect": "description" }
- The narrative should feel like a discovery moment — dramatic and immersive
- Weight in pounds, following D&D 5e standards`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      temperature: 0.8,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const lootData: LootResult = { ...JSON.parse(text), fateResult: fateResult.result }

    if (lootData.items.length > 0) {
      const inserts = lootData.items.map((item) => ({
        campaign_id,
        name: item.name,
        category: item.category,
        description: item.description,
        rarity: item.rarity,
        weight: item.weight,
        value_gp: item.value_gp,
        value_sp: item.value_sp,
        value_cp: item.value_cp,
        properties: item.properties,
        quantity: 1,
      }))
      await supabaseAdmin.from('inventory_items').insert(inserts)
    }

    if (lootData.currency.gp > 0 || lootData.currency.sp > 0 || lootData.currency.cp > 0) {
      const { data: existing } = await supabaseAdmin
        .from('campaign_currency')
        .select('*')
        .eq('campaign_id', campaign_id)
        .single()

      if (existing) {
        await supabaseAdmin
          .from('campaign_currency')
          .update({
            gp: existing.gp + lootData.currency.gp,
            sp: existing.sp + lootData.currency.sp,
            cp: existing.cp + lootData.currency.cp,
            updated_at: new Date().toISOString(),
          })
          .eq('campaign_id', campaign_id)
      } else {
        await supabaseAdmin
          .from('campaign_currency')
          .insert({ campaign_id, ...lootData.currency })
      }
    }

    res.json(lootData)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})
