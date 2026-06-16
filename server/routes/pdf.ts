import { Router, Request, Response } from 'express'
import multer from 'multer'
import { supabaseAdmin } from '../lib/supabase-admin'
import { parsePdfToChunks } from '../services/chunker'
import { embedAndStore } from '../services/embedder'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only PDF files are allowed'))
    }
  },
})

export const pdfRoutes = Router()

// POST /api/pdf/upload
// Uploads PDF to Supabase Storage, parses it, chunks it, and embeds it.
pdfRoutes.post(
  '/upload',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file
      const campaignId = req.body.campaign_id
      const userId = req.body.user_id

      if (!file || !campaignId || !userId) {
        res.status(400).json({ error: 'Missing file, campaign_id, or user_id' })
        return
      }

      const storagePath = `${userId}/${campaignId}/${Date.now()}-${file.originalname}`

      // 1. Upload to Supabase Storage
      const { error: storageError } = await supabaseAdmin.storage
        .from('pdfs')
        .upload(storagePath, file.buffer, {
          contentType: 'application/pdf',
        })

      if (storageError) {
        res.status(500).json({ error: `Storage upload failed: ${storageError.message}` })
        return
      }

      // 2. Create PDF record with status "processing"
      const { data: pdfRecord, error: insertError } = await supabaseAdmin
        .from('pdfs')
        .insert({
          user_id: userId,
          campaign_id: campaignId,
          filename: file.originalname,
          storage_path: storagePath,
          status: 'processing',
        })
        .select()
        .single()

      if (insertError || !pdfRecord) {
        res.status(500).json({ error: `DB insert failed: ${insertError?.message}` })
        return
      }

      // Return immediately — processing happens in background
      res.json({ pdf: pdfRecord, message: 'Upload started, processing in background' })

      // 3. Parse, chunk, embed in background
      processInBackground(pdfRecord.id, file.buffer, file.originalname, campaignId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      res.status(500).json({ error: message })
    }
  }
)

let lastProcessingError: string | null = null

async function processInBackground(
  pdfId: string,
  buffer: Buffer,
  filename: string,
  campaignId: string
) {
  try {
    console.log(`Processing PDF: ${filename}`)
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
