import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initServerSentry, Sentry } from './lib/sentry'
import { pdfRoutes } from './routes/pdf'
import { ragRoutes } from './routes/rag'
import { chatRoutes } from './routes/chat'
import { sessionRoutes } from './routes/session'
import { characterRoutes } from './routes/character'
import { oracleRoutes } from './routes/oracle'
import { npcRoutes } from './routes/npc'
import { ttsRoutes } from './routes/tts'
import { imageRoutes } from './routes/image'
import { locationRoutes } from './routes/location'
import { factionRoutes } from './routes/faction'
import { travelRoutes } from './routes/travel'
import { memoryRoutes } from './routes/memory'
import { tavernRoutes } from './routes/tavern'
import { lootRoutes } from './routes/loot'
import { rulebookRoutes } from './routes/rulebook'
import { sidekickRoutes } from './routes/sidekick'

dotenv.config()
initServerSentry()

const app = express()
const PORT = process.env.SERVER_PORT || 3001

app.use(cors({ origin: /^http:\/\/localhost:\d+$/ }))
app.use(express.json())

app.use('/api/pdf', pdfRoutes)
app.use('/api/rag', ragRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/session', sessionRoutes)
app.use('/api/character', characterRoutes)
app.use('/api/oracle', oracleRoutes)
app.use('/api/npc', npcRoutes)
app.use('/api/tts', ttsRoutes)
app.use('/api/image', imageRoutes)
app.use('/api/location', locationRoutes)
app.use('/api/faction', factionRoutes)
app.use('/api/travel', travelRoutes)
app.use('/api/memory', memoryRoutes)
app.use('/api/tavern', tavernRoutes)
app.use('/api/loot', lootRoutes)
app.use('/api/rulebook', rulebookRoutes)
app.use('/api/sidekick', sidekickRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

Sentry.setupExpressErrorHandler(app)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: import('express').Request, res: import('express').Response, _next: import('express').NextFunction) => {
  console.error('Unhandled error:', err.message)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, async () => {
  console.log(`Grimoire server running on port ${PORT}`)

  const { supabaseAdmin } = await import('./lib/supabase-admin')
  await supabaseAdmin.storage.updateBucket('pdfs', { fileSizeLimit: 524288000 })
    .then(() => console.log('PDF bucket size limit set to 500MB'))
    .catch((err: unknown) => console.warn('Could not update PDF bucket limit:', err))
})
