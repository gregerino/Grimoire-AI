import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Send, Loader2, Scroll, Plus, History,
  User, Swords, ScrollText, Package, FileText,
  PanelLeftOpen, PanelLeftClose,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  sendChatMessage,
  createSession,
  listSessions,
  updateSession,
  saveMessage,
  getMessages,
} from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { OverviewTab } from '@/components/campaign/tabs/OverviewTab'
import { NpcTab } from '@/components/campaign/tabs/NpcTab'
import { QuestTab } from '@/components/campaign/tabs/QuestTab'
import { InventoryTab } from '@/components/campaign/tabs/InventoryTab'
import { PdfLibrary } from '@/components/pdf/PdfLibrary'
import type { Session, Campaign } from '@/types/database'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type SidebarPanel = 'history' | 'overview' | 'npcs' | 'quests' | 'inventory' | 'library' | null

const panelTabs = [
  { id: 'overview' as const, icon: User, label: 'Overview' },
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
        if (data) setCampaign(data as Campaign)
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

  const handleSend = async () => {
    const text = input.trim()
    if (!text || streaming) return

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
      () => {
        setStreaming(false)
        saveMessage(session!.id, id, 'assistant', fullResponse)
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
      }
    )
  }

  const endSession = async () => {
    if (!currentSession) return
    const firstUserMsg = messages.find((m) => m.role === 'user')
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 60) + (firstUserMsg.content.length > 60 ? '...' : '')
      : 'Untitled session'
    await updateSession(currentSession.id, {
      ended_at: new Date().toISOString(),
      title,
    })
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
            onClick={() => togglePanel(sidebarPanel ? null : 'npcs')}
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
          {currentSession && (
            <button
              onClick={endSession}
              className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-navy hover:text-parchment transition-colors"
            >
              End Session
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
              {panelTabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => togglePanel(tab.id)}
                    className={`flex flex-1 items-center justify-center p-2 transition-colors ${
                      sidebarPanel === tab.id
                        ? 'border-b-2 border-gold text-gold'
                        : 'text-gray-600 hover:text-gray-400'
                    }`}
                    title={tab.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                )
              })}
            </div>

            {/* Sidebar content */}
            <div className="flex-1 overflow-y-auto p-4">
              {sidebarPanel === 'history' && (
                <div>
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                    Past Sessions
                  </h3>
                  {sessions.length === 0 ? (
                    <p className="text-xs text-gray-600">No sessions yet</p>
                  ) : (
                    <div className="space-y-1">
                      {sessions.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => loadSession(s)}
                          className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                            currentSession?.id === s.id
                              ? 'bg-navy text-parchment'
                              : 'text-gray-400 hover:bg-navy/50 hover:text-gray-300'
                          }`}
                        >
                          <div className="truncate text-sm">
                            {s.title || 'Untitled session'}
                          </div>
                          <div className="text-xs text-gray-600">
                            {new Date(s.started_at).toLocaleDateString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {sidebarPanel === 'overview' && campaign && <OverviewTab campaign={campaign} />}
              {sidebarPanel === 'npcs' && <NpcTab campaignId={id} />}
              {sidebarPanel === 'quests' && <QuestTab campaignId={id} />}
              {sidebarPanel === 'inventory' && <InventoryTab campaignId={id} />}
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
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {msg.content}
                        {streaming && i === messages.length - 1 && msg.role === 'assistant' && (
                          <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-gold/60" />
                        )}
                      </div>
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
