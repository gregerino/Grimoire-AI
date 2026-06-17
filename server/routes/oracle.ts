import { Router, Request, Response } from 'express'

// The Fate Chart logic lives in shared frontend code, but we expose
// a server endpoint so the AI DM can call it during chat processing.

import {
  rollFateChart,
  rollRandomEvent,
  type OddsLevel,
  ODDS_ORDER,
} from '../../src/lib/fate-chart'

export const oracleRoutes = Router()

// POST /api/oracle/fate — roll the Fate Chart
oracleRoutes.post('/fate', (req: Request, res: Response) => {
  const { odds, chaosFactor } = req.body

  if (!odds || !ODDS_ORDER.includes(odds as OddsLevel)) {
    res.status(400).json({ error: `Invalid odds. Must be one of: ${ODDS_ORDER.join(', ')}` })
    return
  }

  const cf = Math.max(1, Math.min(9, parseInt(chaosFactor, 10) || 5))
  const result = rollFateChart(odds as OddsLevel, cf)
  res.json(result)
})

// POST /api/oracle/event — roll a Random Event
oracleRoutes.post('/event', (_req: Request, res: Response) => {
  const event = rollRandomEvent()
  res.json(event)
})
