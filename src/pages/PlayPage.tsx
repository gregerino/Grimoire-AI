import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Send, Loader2, Scroll, Plus, History,
  User, Swords, ScrollText, Package, FileText,
  PanelLeftOpen, PanelLeftClose, Bot, Gauge, Dices, Shield,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useCombatStore } from '@/stores/combatStore'
import {
  sendChatMessage,
  createSession,
  listSessions,
  updateSession,
  summarizeSession,
  saveMessage,
  getMessages,
  getCharacterSheet,
} from '@/lib/api'
import type { GameState } from '@/lib/api'
import type { Condition } from '@/types/combat'
import {
  rollFateChart,
  rollRandomEvent,
  ODDS_ORDER,
  ODDS_LABELS,
  type OddsLevel,
} from '@/lib/fate-chart'
import { supabase } from '@/lib/supabase'
import { NpcTab } from '@/components/campaign/tabs/NpcTab'
import { QuestTab } from '@/components/campaign/tabs/QuestTab'
import { InventoryTab } from '@/components/campaign/tabs/InventoryTab'
import { PdfLibrary } from '@/components/pdf/PdfLibrary'
import { GameStatePanel } from '@/components/chat/GameStatePanel'
import { Markdown } from '@/components/chat/Markdown'
import { FateChartPanel } from '@/components/oracle/FateChartPanel'
import { CharacterPanel } from '@/components/character/CharacterPanel'
import { CombatTracker } from '@/components/combat/CombatTracker'
import { SessionHistory } from '@/components/session/SessionHistory'
import type { Session, Campaign, AiProvider } from '@/types/database'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type SidebarPanel = 'gamestate' | 'history' | 'overview' | 'npcs' | 'quests' | 'inventory' | 'library' | 'oracle' | 'character' | 'combat' | null

const panelTabs = [
  { id: 'gamestate' as const, icon: Gauge, label: 'Game State' },
  { id: 'combat' as const, icon: Shield, label: 'Combat' },
  { id: 'character' as const, icon: User, label: 'Character' },
  { id: 'oracle' as const, icon: Dices, label: 'Oracle' },
  { id: 'npcs' as const, icon: Swords, label: 'NPCs' },
  { id: 'quests' as const, icon: ScrollText, label: 'Quests' },
  { id: 'inventory' as const, icon: Package, label: 'Inventory' },
  { id: 'library' as const, icon: FileText, label: 'PDFs' },
  { id: 'history' as const, icon: History, label: 'Sessions' },
]

export function PlayPage() {
  const { id } = useParams()
  const user = useAuthStore((s) => s.user)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [sidebarPanel, setSidebarPanel] = useState<SidebarPanel>(null)
  const [loadingSession, setLoadingSession] = useState(false)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [aiProvider, setAiProvider] = useState<AiProvider>('claude')
  const [summarizing, setSummarizing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!id) return
    supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCampaign(data as Campaign)
          setAiProvider((data as Campaign).ai_provider || 'claude')
        }
      })
  }, [id])

  const fetchSessions = useCallback(async () => {
    if (!id) return
    const { sessions: data } = await listSessions(id)
    setSessions(data)
  }, [id])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  if (!id || !user) return null

  const togglePanel = (panel: SidebarPanel) => {
    setSidebarPanel((prev) => (prev === panel ? null : panel))
  }

  const startNewSession = async () => {
    setLoadingSession(true)
    const { session } = await createSession(id)
    setCurrentSession(session)
    setMessages([])
    setSidebarPanel(null)
    setLoadingSession(false)
    await fetchSessions()
    inputRef.current?.focus()
  }

  const loadSession = async (session: Session) => {
    setLoadingSession(true)
    setCurrentSession(session)
    const { messages: data } = await getMessages(session.id)
    setMessages(data.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })))
    setLoadingSession(false)
    inputRef.current?.focus()
  }

  const handleOracleCommand = (text: string): boolean => {
    const match = text.match(/^\/oracle\s*(.*)/i)
    if (!match) return false

    const arg = match[1].trim().toLowerCase().replace(/[\s_-]+/g, '_')
    const oddsMap: Record<string, OddsLevel> = {}
    for (const o of ODDS_ORDER) {
      oddsMap[o.replace(/\//g, '_')] = o
      oddsMap[ODDS_LABELS[o].toLowerCase().replace(/[\s_-]+/g, '_')] = o
    }
    const odds: OddsLevel = oddsMap[arg] || '50/50'
    const cf = campaign?.chaos_factor ?? 5

    const result = rollFateChart(odds, cf)
    const style = {
      exceptional_yes: 'Exceptional Yes!',
      yes: 'Yes',
      no: 'No',
      exceptional_no: 'Exceptional No!',
    }

    let response = `**Oracle (${ODDS_LABELS[odds]}, CF ${cf}):** ${style[result.result]} (rolled ${result.roll})`
    if (result.randomEvent) {
      const event = rollRandomEvent()
      response += `\n\n**Random Event:** ${event.focus} — *${event.action} + ${event.subject}*`
    }

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: response },
    ])
    setInput('')
    return true
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || streaming) return

    if (handleOracleCommand(text)) return

    let session = currentSession
    if (!session) {
      const { session: newSession } = await createSession(id)
      session = newSession
      setCurrentSession(newSession)
      await fetchSessions()
    }

    setInput('')
    setStreaming(true)

    const userMessage: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])
    saveMessage(session!.id, id, 'user', text)

    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages((prev) => [...prev, assistantMessage])

    const history = messages.map((m) => ({ role: m.role, content: m.content }))
    let fullResponse = ''

    await sendChatMessage(
      text,
      id,
      session!.id,
      history,
      (chunk) => {
        fullResponse += chunk
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + chunk }
          }
          return updated
        })
      },
      async (gameState: GameState) => {
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: last.content.replace(/```gamestate[\s\S]*?```/g, '').trim(),
            }
          }
          return updated
        })

        const combat = useCombatStore.getState()

        if (gameState.combatStart) {
          let charData: Record<string, unknown> | null = null
          try {
            const result = await getCharacterSheet(id)
            charData = result.character
          } catch { /* no character sheet — use campaign defaults */ }

          if (charData) {
            const dexMod = Math.floor((((charData.stats as Record<string, number>)?.DEX ?? 10) - 10) / 2)
            const playerInit = gameState.combatStart.playerInitiative ?? (Math.floor(Math.random() * 20) + 1 + dexMod)
            combat.startCombat(gameState.combatStart.enemies, {
              name: (charData.name as string) || campaign?.character_name || 'Player',
              initiative: playerInit,
              hp: { current: (charData.hp as { current: number; max: number })?.current ?? campaign?.current_hp ?? 20, max: (charData.hp as { current: number; max: number })?.max ?? campaign?.max_hp ?? 20 },
              ac: (charData.ac as number) ?? 10,
              conditions: (charData.activeConditions as Condition[]) ?? [],
            })
          } else {
            combat.startCombat(gameState.combatStart.enemies, {
              name: campaign?.character_name || 'Player',
              initiative: gameState.combatStart.playerInitiative ?? 10,
              hp: { current: campaign?.current_hp ?? 20, max: campaign?.max_hp ?? 20 },
              ac: 10,
            })
          }
          setSidebarPanel('combat')
          setSidebarOpen(true)
        }

        if (gameState.combatEnd) combat.endCombat()

        if (gameState.combatDamage) {
          for (const d of gameState.combatDamage) combat.applyDamage(d.target, d.amount)
        }

        if (gameState.combatHealing) {
          for (const h of gameState.combatHealing) combat.applyHealing(h.target, h.amount)
        }

        if (gameState.conditionsApplied) {
          for (const c of gameState.conditionsApplied) combat.addCondition(c.target, c.condition as Condition)
        }

        if (gameState.conditionsLifted) {
          for (const c of gameState.conditionsLifted) combat.removeCondition(c.target, c.condition as Condition)
        }

        if (gameState.deathSaveResult) combat.rollDeathSave(gameState.deathSaveResult.roll)
      },
      () => {
        setStreaming(false)
        const cleanResponse = fullResponse.replace(/```gamestate[\s\S]*?```/g, '').trim()
        saveMessage(session!.id, id, 'assistant', cleanResponse)
        inputRef.current?.focus()
      },
      (error) => {
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `*Error: ${error}*`,
          }
          return updated
        })
        setStreaming(false)
      },
      aiProvider,
    )
  }

  const endSession = async () => {
    if (!currentSession || !id) return
    setSummarizing(true)
    try {
      await summarizeSession(currentSession.id, id, campaign?.character_name ?? undefined)
    } catch {
      await updateSession(currentSession.id, { ended_at: new Date().toISOString() })
    }
    setSummarizing(false)
    setCurrentSession(null)
    setMessages([])
    await fetchSessions()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-navy bg-dark-navy/50 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => togglePanel(sidebarPanel ? null : 'gamestate')}
            className={`rounded p-1.5 transition-colors ${sidebarPanel ? 'bg-navy text-gold' : 'text-gray-500 hover:bg-navy hover:text-parchment'}`}
            title={sidebarPanel ? 'Close panel' : 'Open panel'}
          >
            {sidebarPanel ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          <div className="mx-1 h-4 w-px bg-navy" />
          <Link
            to={`/campaign/${id}`}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gold transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Campaign
          </Link>
          {campaign && (
            <span className="text-xs text-gray-600">
              {campaign.character_name} · Lvl {campaign.character_level} {campaign.character_class}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const next: AiProvider = aiProvider === 'claude' ? 'openai' : 'claude'
              setAiProvider(next)
              if (id) {
                supabase
                  .from('campaigns')
                  .update({ ai_provider: next })
                  .eq('id', id)
                  .then()
              }
            }}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-gray-500 hover:bg-navy hover:text-parchment transition-colors"
            title={`Using ${aiProvider === 'claude' ? 'Claude' : 'GPT-4o mini'} — click to switch`}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>{aiProvider === 'claude' ? 'Claude' : 'GPT-4o'}</span>
          </button>
          <div className="h-4 w-px bg-navy" />
          {currentSession && (
            <button
              onClick={endSession}
              disabled={summarizing}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-gray-500 hover:bg-navy hover:text-parchment disabled:opacity-50 transition-colors"
            >
              {summarizing && <Loader2 className="h-3 w-3 animate-spin" />}
              {summarizing ? 'Writing diary...' : 'End Session'}
            </button>
          )}
          <button
            onClick={startNewSession}
            disabled={loadingSession}
            className="rounded p-1.5 text-gray-500 hover:bg-navy hover:text-parchment transition-colors"
            title="New session"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        {sidebarPanel && (
          <div className="flex w-80 shrink-0 flex-col border-r border-navy bg-dark-navy/30">
            {/* Sidebar tab bar */}
            <div className="flex border-b border-navy">
              {panelTabs.map((tab) => (
                <SidebarTabButton
                  key={tab.id}
                  tab={tab}
                  isActive={sidebarPanel === tab.id}
                  onToggle={() => togglePanel(tab.id)}
                />
              ))}
            </div>

            {/* Sidebar content */}
            <div className="flex-1 overflow-y-auto p-4">
              {sidebarPanel === 'history' && (
                <SessionHistory sessions={sessions} onLoadSession={loadSession} />
              )}
              {sidebarPanel === 'gamestate' && campaign && (
                <GameStatePanel campaign={campaign} />
              )}
              {sidebarPanel === 'npcs' && <NpcTab campaignId={id} />}
              {sidebarPanel === 'quests' && <QuestTab campaignId={id} />}
              {sidebarPanel === 'inventory' && <InventoryTab campaignId={id} />}
              {sidebarPanel === 'character' && (
                <CharacterPanel campaignId={id} />
              )}
              {sidebarPanel === 'oracle' && campaign && (
                <FateChartPanel
                  chaosFactor={campaign.chaos_factor ?? 5}
                  onOracleResult={(text) => {
                    setMessages((prev) => [...prev, { role: 'assistant', content: text }])
                  }}
                  onChaosFactorChange={(newCf) => {
                    supabase
                      .from('campaigns')
                      .update({ chaos_factor: newCf })
                      .eq('id', id)
                      .then(() => {
                        setCampaign((prev) => prev ? { ...prev, chaos_factor: newCf } : prev)
                      })
                  }}
                />
              )}
              {sidebarPanel === 'combat' && <CombatTracker />}
              {sidebarPanel === 'library' && <PdfLibrary campaignId={id} userId={user.id} />}
            </div>
          </div>
        )}

        {/* Chat area */}
        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {loadingSession ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gold/50" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Scroll className="mb-4 h-12 w-12 text-gold/30" />
                <h2 className="text-lg font-bold text-parchment">The Adventure Awaits</h2>
                <p className="mt-2 max-w-md text-sm text-gray-500">
                  Your AI Dungeon Master is ready. Describe your character or say what you do to begin.
                  Context from your uploaded PDFs will be used automatically.
                </p>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-6">
                {messages.map((msg, i) => (
                  <div key={i} className={msg.role === 'user' ? 'flex justify-end' : ''}>
                    <div
                      className={`rounded-xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'max-w-[80%] bg-gold/10 border border-gold/20 text-parchment'
                          : 'text-gray-300'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="mb-1 text-xs font-medium text-gold">Dungeon Master</div>
                      )}
                      {msg.role === 'assistant' ? (
                        <div>
                          <Markdown text={msg.content} />
                          {streaming && i === messages.length - 1 && (
                            <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-gold/60" />
                          )}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-navy bg-dark-navy/50 px-4 py-3">
            <div className="mx-auto flex max-w-3xl items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What do you do?"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-navy bg-dark-navy px-4 py-3 text-sm text-parchment placeholder-gray-600 focus:border-gold/50 focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || streaming}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold text-dark-navy transition-colors hover:bg-gold-light disabled:opacity-30"
              >
                {streaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function SidebarTabButton({
  tab,
  isActive,
  onToggle,
}: {
  tab: { id: string; icon: React.ComponentType<{ className?: string }>; label: string }
  isActive: boolean
  onToggle: () => void
}) {
  const inCombat = useCombatStore((s) => s.inCombat)
  const showDot = tab.id === 'combat' && inCombat
  const Icon = tab.icon

  return (
    <button
      onClick={onToggle}
      className={`relative flex flex-1 items-center justify-center p-2 transition-colors ${
        isActive
          ? 'border-b-2 border-gold text-gold'
          : showDot
            ? 'text-red-400'
            : 'text-gray-600 hover:text-gray-400'
      }`}
      title={tab.label}
    >
      <Icon className="h-4 w-4" />
      {showDot && (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
      )}
    </button>
  )
}
