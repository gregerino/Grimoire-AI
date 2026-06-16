import { Router, Request, Response } from 'express'
import OpenAI from 'openai'
import { supabaseAdmin } from '../lib/supabase-admin'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const ragRoutes = Router()

// POST /api/rag/search
// Takes a natural language query, converts it to an embedding,
// and finds the most similar document chunks for the campaign.
ragRoutes.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, campaign_id, match_count = 5 } = req.body

    if (!query || !campaign_id) {
      res.status(400).json({ error: 'Missing query or campaign_id' })
      return
    }

    // Convert the search query to a vector
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })
    const queryEmbedding = embeddingResponse.data[0].embedding

    // Use our Supabase RPC function for vector similarity search
    const { data, error } = await supabaseAdmin.rpc('match_documents', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_campaign_id: campaign_id,
      match_count: match_count,
    })

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
