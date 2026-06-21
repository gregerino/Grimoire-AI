import { Router, Request, Response } from 'express'
import OpenAI from 'openai'
import { supabaseAdmin } from '../lib/supabase-admin'
import { withRetry } from '../lib/retry'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const ragRoutes = Router()

// POST /api/rag/search
// Takes a natural language query, converts it to an embedding,
// and finds the most similar document chunks for the campaign.
ragRoutes.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, campaign_id, user_id, match_count = 5 } = req.body

    if (!query || (!campaign_id && !user_id)) {
      res.status(400).json({ error: 'Missing query or campaign_id/user_id' })
      return
    }

    const embeddingResponse = await withRetry(
      () => openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      }),
      { maxRetries: 2, timeoutMs: 15_000 },
    )
    const queryEmbedding = embeddingResponse.data[0].embedding

    let rpcName: string
    let rpcParams: Record<string, unknown>

    if (campaign_id && user_id) {
      rpcName = 'match_documents_with_rulebooks'
      rpcParams = {
        query_embedding: JSON.stringify(queryEmbedding),
        match_campaign_id: campaign_id,
        match_user_id: user_id,
        match_count,
      }
    } else if (campaign_id) {
      rpcName = 'match_documents'
      rpcParams = {
        query_embedding: JSON.stringify(queryEmbedding),
        match_campaign_id: campaign_id,
        match_count,
      }
    } else {
      rpcName = 'match_rulebooks'
      rpcParams = {
        query_embedding: JSON.stringify(queryEmbedding),
        match_user_id: user_id,
        match_count,
      }
    }

    const { data, error } = await supabaseAdmin.rpc(rpcName, rpcParams)

    if (error) {
      res.status(500).json({ error: `Search failed: ${error.message}` })
      return
    }

    res.json({ results: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})
