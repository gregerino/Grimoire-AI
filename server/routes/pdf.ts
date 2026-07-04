import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase-admin'
import { parsePdfToChunks } from '../services/chunker'
import { embedAndStore } from '../services/embedder'

export const pdfRoutes = Router()

// POST /api/pdf/process
// Client already uploaded the (possibly chunked) file directly to Supabase
// Storage — this just records it and parses/embeds it in the background.
pdfRoutes.post('/process', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      user_id: userId,
      campaign_id: campaignId,
      storage_path: storagePath,
      filename,
      total_chunks: totalChunks,
    } = req.body

    if (!userId || !campaignId || !storagePath || !filename) {
      res.status(400).json({ error: 'Missing user_id, campaign_id, storage_path, or filename' })
      return
    }

    const { data: pdfRecord, error: insertError } = await supabaseAdmin
      .from('pdfs')
      .insert({
        user_id: userId,
        campaign_id: campaignId,
        filename,
        storage_path: storagePath,
        status: 'processing',
      })
      .select()
      .single()

    if (insertError || !pdfRecord) {
      res.status(500).json({ error: `DB insert failed: ${insertError?.message}` })
      return
    }

    res.json({ pdf: pdfRecord, message: 'Upload started, processing in background' })

    processInBackground(pdfRecord.id, storagePath, filename, campaignId, totalChunks)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

let lastProcessingError: string | null = null

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
    const chunkPaths = Array.from({ length: totalChunks }, (_, i) => `${storagePath}/part-${i}`)
    await supabaseAdmin.storage.from('pdfs').remove(chunkPaths)
    return Buffer.concat(parts)
  }
  const { data, error } = await supabaseAdmin.storage.from('pdfs').download(storagePath)
  if (error || !data) throw new Error(`Failed to download from storage: ${error?.message}`)
  return Buffer.from(await data.arrayBuffer())
}

async function processInBackground(
  pdfId: string,
  storagePath: string,
  filename: string,
  campaignId: string,
  totalChunks?: number
) {
  try {
    console.log(`Processing PDF: ${filename}${totalChunks ? ` (${totalChunks} chunks)` : ''}`)
    const buffer = await downloadFromStorage(storagePath, totalChunks)
    const chunks = await parsePdfToChunks(buffer, filename)
    console.log(`Parsed ${chunks.length} chunks from ${filename}`)

    await embedAndStore(chunks, pdfId, campaignId)
    console.log(`Embedded and stored ${chunks.length} chunks for ${filename}`)

    lastProcessingError = null
    await supabaseAdmin
      .from('pdfs')
      .update({ status: 'indexed' })
      .eq('id', pdfId)
  } catch (err) {
    const message = err instanceof Error ? err.stack || err.message : String(err)
    lastProcessingError = message
    console.error(`Failed to process PDF ${filename}:`, message)
    await supabaseAdmin
      .from('pdfs')
      .update({ status: 'error' })
      .eq('id', pdfId)
  }
}

// Debug endpoint to see last processing error
pdfRoutes.get('/last-error', (_req: Request, res: Response) => {
  res.json({ error: lastProcessingError })
})

// GET /api/pdf/list/:campaignId
pdfRoutes.get('/list/:campaignId', async (req: Request, res: Response) => {
  const { campaignId } = req.params

  const { data, error } = await supabaseAdmin
    .from('pdfs')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ pdfs: data })
})

// DELETE /api/pdf/:id
pdfRoutes.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  const { data: pdf, error: fetchError } = await supabaseAdmin
    .from('pdfs')
    .select('storage_path')
    .eq('id', id)
    .single()

  if (fetchError || !pdf) {
    res.status(404).json({ error: 'PDF not found' })
    return
  }

  // Delete from storage, then from DB (cascade deletes chunks)
  await supabaseAdmin.storage.from('pdfs').remove([pdf.storage_path])
  const { error } = await supabaseAdmin.from('pdfs').delete().eq('id', id)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ success: true })
})
