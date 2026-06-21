import OpenAI from 'openai'
import { supabaseAdmin } from '../lib/supabase-admin'
import type { Chunk } from './chunker'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Generates a 1536-dimensional vector for each text string.
// We batch in groups of 100 to stay within OpenAI's rate limits.
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const batchSize = 100
  const allEmbeddings: number[][] = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    })
    allEmbeddings.push(...response.data.map((d) => d.embedding))
  }

  return allEmbeddings
}

export async function embedAndStore(
  chunks: Chunk[],
  pdfId: string,
  campaignId: string
): Promise<void> {
  const texts = chunks.map((c) => c.content)
  const embeddings = await generateEmbeddings(texts)

  const rows = chunks.map((chunk, i) => ({
    pdf_id: pdfId,
    campaign_id: campaignId,
    content: chunk.content,
    embedding: JSON.stringify(embeddings[i]),
    metadata: chunk.metadata,
  }))

  // Insert in batches of 50 to avoid payload size limits
  const insertBatchSize = 50
  for (let i = 0; i < rows.length; i += insertBatchSize) {
    const batch = rows.slice(i, i + insertBatchSize)
    const { error } = await supabaseAdmin
      .from('document_chunks')
      .insert(batch)

    if (error) {
      throw new Error(`Failed to insert chunks: ${error.message}`)
    }
  }
}

export async function embedAndStoreRulebook(
  chunks: Chunk[],
  rulebookId: string,
  userId: string
): Promise<void> {
  const texts = chunks.map((c) => c.content)
  const embeddings = await generateEmbeddings(texts)

  const rows = chunks.map((chunk, i) => ({
    rulebook_id: rulebookId,
    user_id: userId,
    content: chunk.content,
    embedding: JSON.stringify(embeddings[i]),
    metadata: chunk.metadata,
  }))

  const insertBatchSize = 50
  for (let i = 0; i < rows.length; i += insertBatchSize) {
    const batch = rows.slice(i, i + insertBatchSize)
    const { error } = await supabaseAdmin
      .from('rulebook_chunks')
      .insert(batch)

    if (error) {
      throw new Error(`Failed to insert rulebook chunks: ${error.message}`)
    }
  }
}
