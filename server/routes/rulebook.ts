import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase-admin'
import { parsePdfToChunks } from '../services/chunker'
import { embedAndStoreRulebook } from '../services/embedder'

export const rulebookRoutes = Router()

rulebookRoutes.post('/process', async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id: userId, storage_path: storagePath, filename, total_chunks: totalChunks } = req.body

    if (!userId || !storagePath || !filename) {
      res.status(400).json({ error: 'Missing user_id, storage_path, or filename' })
      return
    }

    const { data: record, error: insertError } = await supabaseAdmin
      .from('rulebooks')
      .insert({
        user_id: userId,
        filename,
        storage_path: storagePath,
        status: 'processing',
      })
      .select()
      .single()

    if (insertError || !record) {
      res.status(500).json({ error: `DB insert failed: ${insertError?.message}` })
      return
    }

    res.json({ rulebook: record, message: 'Upload started, processing in background' })

    processInBackground(record.id, storagePath, filename, userId, totalChunks)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

async function downloadFromStorage(storagePath: string, totalChunks?: number): Promise<Buffer> {
  if (totalChunks && totalChunks > 1) {
    const parts: Buffer[] = []
    for (let i = 0; i < totalChunks; i++) {
      const { data, error } = await supabaseAdmin.storage
        .from('pdfs')
        .download(`${storagePath}/part-${i}`)
      if (error || !data) throw new Error(`Failed to download part ${i}: ${error?.message}`)
      parts.push(Buffer.from(await data.arrayBuffer()))
    }
    // Clean up chunk files
    const chunkPaths = Array.from({ length: totalChunks }, (_, i) => `${storagePath}/part-${i}`)
    await supabaseAdmin.storage.from('pdfs').remove(chunkPaths)
    return Buffer.concat(parts)
  }
  const { data, error } = await supabaseAdmin.storage.from('pdfs').download(storagePath)
  if (error || !data) throw new Error(`Failed to download from storage: ${error?.message}`)
  return Buffer.from(await data.arrayBuffer())
}

async function processInBackground(
  rulebookId: string,
  storagePath: string,
  filename: string,
  userId: string,
  totalChunks?: number
) {
  try {
    console.log(`Processing rulebook: ${filename}${totalChunks ? ` (${totalChunks} chunks)` : ''}`)

    const buffer = await downloadFromStorage(storagePath, totalChunks)
    const chunks = await parsePdfToChunks(buffer, filename)
    console.log(`Parsed ${chunks.length} chunks from rulebook ${filename}`)

    await embedAndStoreRulebook(chunks, rulebookId, userId)
    console.log(`Embedded and stored ${chunks.length} chunks for rulebook ${filename}`)

    await supabaseAdmin
      .from('rulebooks')
      .update({ status: 'indexed' })
      .eq('id', rulebookId)
  } catch (err) {
    const message = err instanceof Error ? err.stack || err.message : String(err)
    console.error(`Failed to process rulebook ${filename}:`, message)
    await supabaseAdmin
      .from('rulebooks')
      .update({ status: 'error' })
      .eq('id', rulebookId)
  }
}

rulebookRoutes.get('/list/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params

  const { data, error } = await supabaseAdmin
    .from('rulebooks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ rulebooks: data })
})

rulebookRoutes.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  const { data: rulebook, error: fetchError } = await supabaseAdmin
    .from('rulebooks')
    .select('storage_path')
    .eq('id', id)
    .single()

  if (fetchError || !rulebook) {
    res.status(404).json({ error: 'Rulebook not found' })
    return
  }

  await supabaseAdmin.storage.from('pdfs').remove([rulebook.storage_path])
  const { error } = await supabaseAdmin.from('rulebooks').delete().eq('id', id)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ success: true })
})
