import { Router, Request, Response } from 'express'
import OpenAI from 'openai'
import { supabaseAdmin } from '../lib/supabase-admin'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const chatRoutes = Router()

const SYSTEM_PROMPT = `You are an expert Dungeon Master running a solo D&D 5.5e campaign. You are dramatic, descriptive, and fair. You:

- Narrate the world vividly with sensory details
- Voice NPCs with distinct personalities
- Track combat with clear initiative and HP
- Present meaningful choices to the player
- Use the provided source material faithfully when available
- Roll dice when needed and explain the results
- Keep the story moving and engaging

When source material is provided as context, use it to inform your descriptions, NPCs, locations, and plot — but weave it naturally into the narrative. Never quote the source material directly or break immersion.

Respond in the same language the player uses.`

// POST /api/chat
// Sends a message to the AI DM with RAG context from uploaded PDFs.
chatRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { message, campaign_id, history = [] } = req.body

    if (!message || !campaign_id) {
      res.status(400).json({ error: 'Missing message or campaign_id' })
      return
    }

    // 1. Generate embedding for the player's message
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message,
    })
    const queryEmbedding = embeddingResponse.data[0].embedding

    // 2. Find relevant context from uploaded PDFs
    const { data: ragResults } = await supabaseAdmin.rpc('match_documents', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_campaign_id: campaign_id,
      match_count: 5,
    })

    // 3. Build context block from RAG results
    let contextBlock = ''
    if (ragResults && ragResults.length > 0) {
      const relevantChunks = ragResults
        .filter((r: { similarity: number }) => r.similarity > 0.3)
        .map((r: { content: string }) => r.content)
        .join('\n\n---\n\n')

      if (relevantChunks) {
        contextBlock = `\n\n[SOURCE MATERIAL — use to inform your response, do not quote directly]\n${relevantChunks}\n[END SOURCE MATERIAL]`
      }
    }

    // 4. Build messages array for OpenAI
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT + contextBlock },
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: message },
    ]

    // 5. Stream response
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      stream: true,
      max_tokens: 1000,
      temperature: 0.9,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Chat error:', message)
    if (!res.headersSent) {
      res.status(500).json({ error: message })
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`)
      res.end()
    }
  }
})
