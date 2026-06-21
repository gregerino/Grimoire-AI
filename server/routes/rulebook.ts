import { Router, Request, Response } from 'express'
import multer from 'multer'
import { supabaseAdmin } from '../lib/supabase-admin'
import { parsePdfToChunks } from '../services/chunker'
import { embedAndStoreRulebook } from '../services/embedder'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 400 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only PDF files are allowed'))
    }
  },
})

export const rulebookRoutes = Router()

rulebookRoutes.post(
  '/upload',
  (req: Request, res: Response, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        const msg = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
          ? 'File too large (max 400MB)'
          : err.message || 'Upload error'
        res.status(413).json({ error: msg })
        return
      }
      next()
    })
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file
      const userId = req.body.user_id

      if (!file || !userId) {
        res.status(400).json({ error: 'Missing file or user_id' })
        return
      }

      const storagePath = `${userId}/rulebooks/${Date.now()}-${file.originalname}`

      let storageUploaded = false
      const { error: storageError } = await supabaseAdmin.storage
        .from('pdfs')
        .upload(storagePath, file.buffer, { contentType: 'application/pdf' })

      if (storageError) {
        console.warn(`Storage upload skipped for ${file.originalname}: ${storageError.message}`)
      } else {
        storageUploaded = true
      }

      const { data: record, error: insertError } = await supabaseAdmin
        .from('rulebooks')
        .insert({
          user_id: userId,
          filename: file.originalname,
          storage_path: storageUploaded ? storagePath : `local-only/${file.originalname}`,
          status: 'processing',
        })
        .select()
        .single()

      if (insertError || !record) {
        res.status(500).json({ error: `DB insert failed: ${insertError?.message}` })
        return
      }

      const msg = storageUploaded
        ? 'Upload started, processing in background'
        : 'File too large for storage — indexing directly'
      res.json({ rulebook: record, message: msg })

      processInBackground(record.id, file.buffer, file.originalname, userId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      res.status(500).json({ error: message })
    }
  }
)

async function processInBackground(
  rulebookId: string,
  buffer: Buffer,
  filename: string,
  userId: string
) {
  try {
    console.log(`Processing rulebook: ${filename}`)
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
