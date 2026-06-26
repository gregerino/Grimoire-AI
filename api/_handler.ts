import express from 'express'
import cors from 'cors'
import { initServerSentry, Sentry } from '../server/lib/sentry'
import { pdfRoutes } from '../server/routes/pdf'
import { ragRoutes } from '../server/routes/rag'
import { chatRoutes } from '../server/routes/chat'
import { sessionRoutes } from '../server/routes/session'
import { characterRoutes } from '../server/routes/character'
import { oracleRoutes } from '../server/routes/oracle'
import { npcRoutes } from '../server/routes/npc'
import { ttsRoutes } from '../server/routes/tts'
import { imageRoutes } from '../server/routes/image'
import { locationRoutes } from '../server/routes/location'
import { factionRoutes } from '../server/routes/faction'
import { travelRoutes } from '../server/routes/travel'
import { memoryRoutes } from '../server/routes/memory'
import { tavernRoutes } from '../server/routes/tavern'
import { lootRoutes } from '../server/routes/loot'
import { rulebookRoutes } from '../server/routes/rulebook'

initServerSentry()

const app = express()

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.VITE_APP_URL,
].filter(Boolean) as string[]

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o)) || origin.endsWith('.vercel.app')) {
      cb(null, true)
    } else {
      cb(new Error(`CORS blocked: ${origin}`))
    }
  },
}))
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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

Sentry.setupExpressErrorHandler(app)

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

export default app
