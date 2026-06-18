import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Send, Loader2, Scroll, Plus, History,
  User, Swords, ScrollText, Package, FileText,
  PanelLeftOpen, PanelLeftClose, Bot, Gauge, Shield,
  Volume2, VolumeX, Square, Pause, Play, Dices, Music,
  Map, Flag,
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
import { supabase } from '@/lib/supabase'
import { NpcTab } from '@/components/campaign/tabs/NpcTab'
import { QuestTab } from '@/components/campaign/tabs/QuestTab'
import { InventoryTab } from '@/components/campaign/tabs/InventoryTab'
import { PdfLibrary } from '@/components/pdf/PdfLibrary'
import { GameStatePanel } from '@/components/chat/GameStatePanel'
import { Markdown } from '@/components/chat/Markdown'

import { CharacterPanel } from '@/components/character/CharacterPanel'
import { CombatTracker } from '@/components/combat/CombatTracker'
import { SessionHistory } from '@/components/session/SessionHistory'
import { SessionReader } from '@/components/session/SessionReader'
import { SpeechSettingsPanel } from '@/components/settings/SpeechSettingsPanel'
import { useSpeech } from '@/hooks/useSpeech'
import { useSpeechStore } from '@/stores/speechStore'
import { MicButton } from '@/components/chat/MicButton'
import { AudioMixer } from '@/components/audio/AudioMixer'
import { useAudio } from '@/hooks/useAudio'
import type { AmbientType, MusicMood, SfxType } from '@/stores/audioStore'
import type { SttLanguage } from '@/hooks/useSpeechRecognition'
import { WorldMap } from '@/components/world/WorldMap'
import { ReputationPanel } from '@/components/world/ReputationPanel'

import type { Session, Campaign, AiProvider } from '@/types/database'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type SidebarPanel = 'gamestate' | 'history' | 'overview' | 'npcs' | 'quests' | 'inventory' | 'library' | 'character' | 'combat' | 'speech' | 'audio' | 'reputation' | null

const panelTabs = [
  { id: 'gamestate' as const, icon: Gauge, label: 'Game State' },
  { id: 'combat' as const, icon: Shield, label: 'Combat' },
  { id: 'character' as const, icon: User, label: 'Character' },
  { id: 'npcs' as const, icon: Swords, label: 'NPCs' },
  { id: 'quests' as const, icon: ScrollText, label: 'Quests' },
  { id: 'inventory' as const, icon: Package, label: 'Inventory' },
  { id: 'library' as const, icon: FileText, label: 'PDFs' },
  { id: 'history' as const, icon: History, label: 'Sessions' },
  { id: 'speech' as const, icon: Volume2, label: 'Röst' },
  { id: 'audio' as const, icon: Music, label: 'Ljud' },
  { id: 'reputation' as const, icon: Flag, label: 'Factions' },
]

export function PlayPage() {
  const { id } = useParams()
  const user = useAuthStore((s) => s.user)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [skillInput, setSkillInput] = useState('')
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
  const { speakPlain, enqueueSentence, stop: stopSpeech, pause: pauseSpeech, resume: resumeSpeech, resetStopped, speaking, paused: speechPaused } = useSpeech()
  const ttsBufferRef = useRef('')
  const speechEnabled = useSpeechStore((s) => s.enabled)
  const autoRead = useSpeechStore((s) => s.autoRead)
  const ttsLanguage = useSpeechStore((s) => s.ttsLanguage)
  const [micListening, setMicListening] = useState(false)
  const [readingSession, setReadingSession] = useState<Session | null>(null)
  const [showMap, setShowMap] = useState(false)
  const sttLang: SttLanguage = ttsLanguage === 'sv' ? 'sv-SE' : 'en-US'
  const { playAmbient, playMusic, playSfx, stopAll: stopAudio, tryUnlock: unlockAudio } = useAudio()
  const autoSavingRef = useRef(false)

  const autoSaveSession = useCallback(async () => {
    if (autoSavingRef.current || !currentSession || !id || messages.length === 0) return
    autoSavingRef.current = true
    try {
      await summarizeSession(currentSession.id, id, campaign?.character_name ?? undefined)
    } catch {
      await updateSession(currentSession.id, { ended_at: new Date().toISOString() })
    }
  }, [currentSession, id, messages.length, campaign?.character_name])

  // Auto-save on browser close / tab close
  useEffect(() => {
    const handler = () => {
      if (!currentSession || !id || messages.length === 0) return
      const body = JSON.stringify({
        campaign_id: id,
        character_name: campaign?.character_name ?? undefined,
      })
      navigator.sendBeacon(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/session/${currentSession.id}/summarize`,
        new Blob([body], { type: 'application/json' }),
      )
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [currentSession, id, messages.length, campaign?.character_name])

  // Auto-save on component unmount (back button within SPA)
  const autoSaveRef = useRef(autoSaveSession)
  autoSaveRef.current = autoSaveSession
  useEffect(() => {
    return () => { autoSaveRef.current() }
  }, [])

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

  const stripOracleText = (text: string) =>
    text
      .replace(/\[Oracle:.*?\]/g, '')
      .replace(/^>?\s*Roll:\s*\d+.*$/gim, '')
      .replace(/^>?\s*\d+\s*[—–-]\s*(Exceptional\s+)?(Yes|No|Extreme\s+Yes|Extreme\s+No)\.?.*$/gim, '')
      .replace(/\n{3,}/g, '\n\n')

  const cleanForSpeech = (text: string) =>
    text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^#{1,3}\s+.+$/gm, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/^>?\s*Roll:\s*\d+.*$/gim, '')
      .replace(/^>?\s*\d+\s*[—–-]\s*(Exceptional\s+)?(Yes|No|Extreme\s+Yes|Extreme\s+No)\.?.*$/gim, '')
      .trim()

  const flushTtsBuffer = useCallback(() => {
    const text = cleanForSpeech(ttsBufferRef.current)
    ttsBufferRef.current = ''
    if (text) enqueueSentence(text)
  }, [enqueueSentence])

  const handleStreamChunkForTts = useCallback(
    (chunk: string) => {
      if (!speechEnabled || !autoRead) return
      ttsBufferRef.current += chunk
      const parts = ttsBufferRef.current.split(/\n\n+/)
      if (parts.length > 1) {
        for (let i = 0; i < parts.length - 1; i++) {
          const cleaned = cleanForSpeech(parts[i])
          if (cleaned) enqueueSentence(cleaned)
        }
        ttsBufferRef.current = parts[parts.length - 1]
      }
    },
    [speechEnabled, autoRead, enqueueSentence],
  )

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

  const handleSend = async (opts?: { text?: string; displayText?: string; muteResponse?: boolean }) => {
    const text = (opts?.text ?? input).trim()
    if (!text || streaming) return
    unlockAudio()
    const mute = opts?.muteResponse ?? false
    const display = opts?.displayText ?? text

    let session = currentSession
    if (!session) {
      const { session: newSession } = await createSession(id)
      session = newSession
      setCurrentSession(newSession)
      await fetchSessions()
    }

    if (!opts?.text) setInput('')
    setStreaming(true)
    ttsBufferRef.current = ''
    if (speaking) stopSpeech()
    if (!mute) resetStopped()

    const userMessage: Message = { role: 'user', content: display }
    setMessages((prev) => [...prev, userMessage])
    saveMessage(session!.id, id, 'user', display)

    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages((prev) => [...prev, assistantMessage])

    const history = messages.map((m) => ({ role: m.role, content: m.content }))
    let fullResponse = ''
    let prevDisplayLen = 0

    await sendChatMessage(
      text,
      id,
      session!.id,
      history,
      (chunk) => {
        fullResponse += chunk
        const display = stripOracleText(
          fullResponse
            .replace(/```gamestate[\s\S]*?```/g, '')
            .replace(/```speech[\s\S]*?```/g, '')
            .replace(/```(?:gamestate|speech)[\s\S]*$/g, '')
        ).trim()
        if (!mute && display.length > prevDisplayLen) {
          handleStreamChunkForTts(display.slice(prevDisplayLen))
          prevDisplayLen = display.length
        }
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: display }
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
              content: stripOracleText(
                last.content
                  .replace(/```gamestate[\s\S]*?```/g, '')
                  .replace(/```speech[\s\S]*?```/g, '')
              ).trim(),
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

        if (gameState.audio) {
          if (gameState.audio.ambient !== undefined) {
            playAmbient(gameState.audio.ambient as AmbientType | null)
          }
          if (gameState.audio.music !== undefined) {
            playMusic(gameState.audio.music as MusicMood | null)
          }
          if (gameState.audio.sfx) {
            for (const sfx of gameState.audio.sfx) {
              playSfx(sfx as SfxType)
            }
          }
        }
      },
      () => {
        setStreaming(false)
        if (!mute) flushTtsBuffer()
        const cleanResponse = stripOracleText(
          fullResponse
            .replace(/```gamestate[\s\S]*?```/g, '')
            .replace(/```speech[\s\S]*?```/g, '')
        ).trim()
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: cleanResponse }
          }
          return updated
        })
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
      ttsLanguage,
    )
  }

  const endSession = async () => {
    if (!currentSession || !id) return
    const endedSession = { ...currentSession }
    autoSavingRef.current = true
    setSummarizing(true)
    try {
      await summarizeSession(currentSession.id, id, campaign?.character_name ?? undefined)
    } catch {
      await updateSession(currentSession.id, { ended_at: new Date().toISOString() })
    }
    setSummarizing(false)
    setCurrentSession(null)
    setMessages([])
    stopAudio()
    const { sessions: refreshed } = await listSessions(id)
    setSessions(refreshed)
    autoSavingRef.current = false
    const updated = refreshed.find((s: Session) => s.id === endedSession.id)
    if (updated) setReadingSession(updated)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSkillSend = () => {
    const text = skillInput.trim()
    if (!text || streaming) return
    setSkillInput('')

    const num = Number(text)
    const isResult = Number.isInteger(num) && num >= 1 && num <= 30

    if (isResult) {
      handleSend({ text: `[Skill Check Result: ${num}] The player rolled a ${num}. Narrate the outcome.`, displayText: `🎲 ${num}`, muteResponse: false })
    } else {
      handleSend({ text: `[Skill Check Request] ${text}`, displayText: text, muteResponse: false })
    }
  }

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSkillSend()
    }
  }

  const handleSttTranscript = useCallback((text: string) => {
    setInput((prev) => {
      const trimmed = prev.trimEnd()
      return trimmed ? `${trimmed} ${text}` : text
    })
  }, [])

  const handleSttInterim = useCallback((text: string) => {
    // Interim text is shown as placeholder-style feedback via micListening state
    if (text && inputRef.current) {
      inputRef.current.placeholder = text || 'What do you do?'
    }
    if (!text && inputRef.current) {
      inputRef.current.placeholder = 'What do you do?'
    }
  }, [])

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
            onClick={() => setShowMap(true)}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-gray-500 hover:bg-navy hover:text-parchment transition-colors"
            title="World Map"
          >
            <Map className="h-3.5 w-3.5" />
            <span>Map</span>
          </button>
          <div className="h-4 w-px bg-navy" />
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
          <button
            onClick={() => useSpeechStore.getState().setEnabled(!speechEnabled)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
              speechEnabled ? 'text-gold hover:bg-navy' : 'text-gray-600 hover:bg-navy hover:text-gray-400'
            }`}
            title={speechEnabled ? 'Stäng av röst' : 'Sätt på röst'}
          >
            {speechEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          {speaking && (
            <>
              <button
                onClick={speechPaused ? resumeSpeech : pauseSpeech}
                className="rounded p-1 text-gold hover:bg-navy transition-colors"
                title={speechPaused ? 'Fortsätt' : 'Pausa'}
              >
                {speechPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={stopSpeech}
                className="rounded p-1 text-gold hover:bg-navy transition-colors"
                title="Stoppa"
              >
                <Square className="h-3 w-3" />
              </button>
            </>
          )}
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
                <SessionHistory
                  sessions={sessions}
                  onLoadSession={loadSession}
                  onReadSession={(s) => setReadingSession(s)}
                />
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
              {sidebarPanel === 'combat' && <CombatTracker />}
              {sidebarPanel === 'library' && <PdfLibrary campaignId={id} userId={user.id} />}
              {sidebarPanel === 'speech' && <SpeechSettingsPanel />}
              {sidebarPanel === 'audio' && <AudioMixer />}
              {sidebarPanel === 'reputation' && <ReputationPanel campaignId={id} />}
            </div>
          </div>
        )}

        {/* World Map overlay */}
        {showMap && (
          <WorldMap
            campaignId={id}
            currentLocationId={campaign?.current_location_id ?? null}
            sessionId={currentSession?.id ?? null}
            onClose={() => setShowMap(false)}
            onSendMessage={(msg) => {
              setShowMap(false)
              handleSend({ text: msg, displayText: msg })
            }}
          />
        )}

        {/* Chat area */}
        <div className="relative flex flex-1 flex-col">
          {readingSession && (
            <SessionReader
              session={readingSession}
              onClose={() => setReadingSession(null)}
              onSpeak={(text) => { stopSpeech(); speakPlain(text) }}
              speechEnabled={speechEnabled}
            />
          )}
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
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-gold">Dungeon Master</span>
                          {speechEnabled && msg.content && !(streaming && i === messages.length - 1) && (
                            <button
                              onClick={() => { stopSpeech(); speakPlain(cleanForSpeech(msg.content)) }}
                              className="rounded p-1 text-gray-600 hover:text-gold transition-colors"
                              title="Läs upp igen"
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
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
          <div className="border-t border-navy bg-dark-navy/50 px-4 py-3 space-y-2">
            {/* Skill check row */}
            <div className="mx-auto flex max-w-3xl items-end gap-3">
              <div className="flex items-center gap-2 text-gray-500">
                <Dices className="h-4 w-4 shrink-0" />
              </div>
              <textarea
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                placeholder="Skill check (e.g. Perception) or roll result (1–30)"
                rows={1}
                className="flex-1 resize-none rounded-lg border border-navy bg-dark-navy/60 px-3 py-2 text-xs text-parchment placeholder-gray-600 focus:border-purple-500/50 focus:outline-none"
              />
              <button
                onClick={handleSkillSend}
                disabled={!skillInput.trim() || streaming}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600/80 text-parchment transition-colors hover:bg-purple-500 disabled:opacity-30"
                title="Roll skill check"
              >
                {streaming ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Dices className="h-3 w-3" />
                )}
              </button>
            </div>
            {/* Narrative input row */}
            <div className="mx-auto flex max-w-3xl items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What do you do?"
                rows={1}
                className={`flex-1 resize-none rounded-xl border bg-dark-navy px-4 py-3 text-sm text-parchment placeholder-gray-600 focus:border-gold/50 focus:outline-none transition-colors ${
                  micListening ? 'border-red-500/40' : 'border-navy'
                }`}
              />
              <MicButton
                lang={sttLang}
                disabled={streaming}
                onTranscript={handleSttTranscript}
                onInterim={handleSttInterim}
                onListeningChange={setMicListening}
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
