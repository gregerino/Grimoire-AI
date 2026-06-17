import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { pdfRoutes } from './routes/pdf'
import { ragRoutes } from './routes/rag'
import { chatRoutes } from './routes/chat'
import { sessionRoutes } from './routes/session'
import { characterRoutes } from './routes/character'
import { oracleRoutes } from './routes/oracle'
import { npcRoutes } from './routes/npc'

dotenv.config()

const app = express()
const PORT = process.env.SERVER_PORT || 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'] }))
app.use(express.json())

app.use('/api/pdf', pdfRoutes)
app.use('/api/rag', ragRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/session', sessionRoutes)
app.use('/api/character', characterRoutes)
app.use('/api/oracle', oracleRoutes)
app.use('/api/npc', npcRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Grimoire server running on port ${PORT}`)
})
