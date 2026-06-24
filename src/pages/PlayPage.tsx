import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Plus, Loader2,
  Bot, Volume2, VolumeX, Square, Pause, Play,
  PanelLeftOpen, PanelLeftClose,
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
import { CharacterPanel } from '@/components/character/CharacterPanel'
import { CombatTracker } from '@/components/combat/CombatTracker'
import { SessionHistory } from '@/components/session/SessionHistory'
import { SessionReader } from '@/components/session/SessionReader'
import { SpeechSettingsPanel } from '@/components/settings/SpeechSettingsPanel'
import { useSpeech } from '@/hooks/useSpeech'
import { useSpeechStore } from '@/stores/speechStore'
import { AudioMixer } from '@/components/audio/AudioMixer'
import { useAudio } from '@/hooks/useAudio'
import type { AmbientType, MusicMood, SfxType } from '@/stores/audioStore'
import type { SttLanguage } from '@/hooks/useSpeechRecognition'
import { LocationList } from '@/components/world/LocationList'
import { ReputationPanel } from '@/components/world/ReputationPanel'
import { MemoryTab } from '@/components/campaign/tabs/MemoryTab'
import { NotesTab } from '@/components/campaign/tabs/NotesTab'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useTimeStore, TIME_ICONS } from '@/stores/timeStore'
import { LootReveal } from '@/components/loot/LootReveal'
import { toFantasyError } from '@/lib/errors'

import { LocationHeader } from '@/components/play/LocationHeader'
import { NarrativePanel } from '@/components/play/NarrativePanel'
import { GameSidebar, type SidebarPanel } from '@/components/play/GameSidebar'
import { PlayerInput } from '@/components/play/PlayerInput'
import { CombatStartOverlay } from '@/components/play/GameOverlays'
import { SpeakingIndicator } from '@/components/audio/SpeakingIndicator'
import { useQuietMode } from '@/hooks/useQuietMode'

import type { Session, Campaign, AiProvider } from '@/types/database'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

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
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { speakPlain, enqueueSentence, stop: stopSpeech, pause: pauseSpeech, resume: resumeSpeech, resetStopped, speaking, paused: speechPaused } = useSpeech()
  const ttsBufferRef = useRef('')
  const speechEnabled = useSpeechStore((s) => s.enabled)
  const autoRead = useSpeechStore((s) => s.autoRead)
  const ttsLanguage = useSpeechStore((s) => s.ttsLanguage)
  const [micListening, setMicListening] = useState(false)
  const [readingSession, setReadingSession] = useState<Session | null>(null)
  const sttLang: SttLanguage = ttsLanguage === 'sv' ? 'sv-SE' : 'en-US'
  const { playAmbient, playMusic, playSfx, stopAll: stopAudio, tryUnlock: unlockAudio } = useAudio()
  const autoSavingRef = useRef(false)
  const [showCombatOverlay, setShowCombatOverlay] = useState(false)
  const [pendingLoot, setPendingLoot] = useState<{
    items: GameState['lootFound']
    currency?: GameState['currencyFound']
    narrative?: string
  } | null>(null)

  const quietMode = useQuietMode()
  const { worldTime, fetchTime } = useTimeStore()

  useEffect(() => {
    if (id) fetchTime(id)
  }, [id, fetchTime])

  // --- Auto-save logic (unchanged) ---
  const autoSaveSession = useCallback(async () => {
    if (autoSavingRef.current || !currentSession || !id || messages.length === 0) return
    autoSavingRef.current = true
    try {
      await summarizeSession(currentSession.id, id, campaign?.character_name ?? undefined)
    } catch {
      await updateSession(currentSession.id, { ended_at: new Date().toISOString() })
    }
  }, [currentSession, id, messages.length, campaign?.character_name])

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

  const autoSaveRef = useRef(autoSaveSession)
  autoSaveRef.current = autoSaveSession
  useEffect(() => {
    return () => { autoSaveRef.current() }
  }, [])

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

  // --- Text processing (unchanged) ---
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

  const handleSttTranscript = useCallback((text: string) => {
    setInput((prev) => {
      const trimmed = prev.trimEnd()
      return trimmed ? `${trimmed} ${text}` : text
    })
  }, [])

  const handleSttInterim = useCallback(() => {}, [])

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
          setShowCombatOverlay(true)
          let charData: Record<string, unknown> | null = null
          try {
            const result = await getCharacterSheet(id)
            charData = result.character
          } catch { /* no character sheet */ }

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

        if (gameState.lootFound?.length || gameState.currencyFound) {
          if (gameState.lootFound?.length) {
            const inserts = gameState.lootFound.map((item) => ({
              campaign_id: id,
              name: item.name,
              category: item.category || 'other',
              description: item.description || null,
              rarity: item.rarity || 'common',
              weight: item.weight || 0,
              value_gp: item.value_gp || 0,
              value_sp: item.value_sp || 0,
              value_cp: item.value_cp || 0,
              properties: item.properties || {},
              quantity: 1,
            }))
            await supabase.from('inventory_items').insert(inserts)
          }

          if (gameState.currencyFound) {
            const { gp = 0, sp = 0, cp = 0 } = gameState.currencyFound
            if (gp > 0 || sp > 0 || cp > 0) {
              await useInventoryStore.getState().addCurrency(id, { gp, sp, cp })
            }
          }

          setPendingLoot({
            items: gameState.lootFound || [],
            currency: gameState.currencyFound,
          })
        }

        if (gameState.timeAdvance && gameState.timeAdvance > 0) {
          await useTimeStore.getState().advanceTime(id, gameState.timeAdvance)
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
            content: `*${toFantasyError(error)}*`,
          }
          return updated
        })
        setStreaming(false)
      },
      aiProvider,
      ttsLanguage,
      undefined,
      user?.id,
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

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-midnight">
      {/* ─── Compact header bar ─── */}
      <div className="flex items-center justify-between border-b border-navy/30 bg-midnight/80 backdrop-blur-sm px-4 py-1.5">
        <div className="flex items-center gap-2">
          {/* Sidebar toggle */}
          <button
            onClick={() => togglePanel(sidebarPanel ? null : 'character')}
            className={`rounded p-1 transition-colors focus-ring ${sidebarPanel ? 'text-gold' : 'text-mist hover:text-stone'}`}
            aria-label={sidebarPanel ? 'Stäng sidopanel' : 'Öppna sidopanel'}
            aria-expanded={!!sidebarPanel}
          >
            {sidebarPanel ? <PanelLeftClose className="h-3.5 w-3.5" aria-hidden="true" /> : <PanelLeftOpen className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
          <div className="h-3 w-px bg-navy/30" />
          <Link
            to={`/campaign/${id}`}
            className="inline-flex items-center gap-1 text-xs text-mist hover:text-gold transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            <span className="hidden sm:inline">Campaign</span>
          </Link>
          {campaign && (
            <>
              <div className="h-3 w-px bg-navy/50" />
              <span className="font-display text-xs font-semibold tracking-wide text-parchment/70">
                {campaign.character_name}
              </span>
              <span className="text-[10px] text-mist">
                Lvl {campaign.character_level} {campaign.character_class}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* AI provider toggle */}
          <button
            onClick={() => {
              const next: AiProvider = aiProvider === 'claude' ? 'openai' : 'claude'
              setAiProvider(next)
              if (id) supabase.from('campaigns').update({ ai_provider: next }).eq('id', id).then()
            }}
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-mist hover:text-parchment transition-colors focus-ring"
            aria-label={`Byt AI-modell, nuvarande: ${aiProvider === 'claude' ? 'Claude' : 'GPT-4o mini'}`}
          >
            <Bot className="h-3 w-3" aria-hidden="true" />
            <span>{aiProvider === 'claude' ? 'Claude' : 'GPT-4o'}</span>
          </button>

          <div className="h-3 w-px bg-navy/30" />

          {/* Quiet mode + TTS controls */}
          {quietMode && (
            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] text-red-400 border border-red-500/20">
              Tyst
            </span>
          )}
          <button
            onClick={() => useSpeechStore.getState().setEnabled(!speechEnabled)}
            className={`rounded p-1 transition-colors focus-ring ${speechEnabled ? 'text-gold' : 'text-mist hover:text-stone'}`}
            aria-label={speechEnabled ? 'Stäng av text-till-tal' : 'Slå på text-till-tal'}
            aria-pressed={speechEnabled}
          >
            {speechEnabled ? <Volume2 className="h-3.5 w-3.5" aria-hidden="true" /> : <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
          {speaking && (
            <>
              <button onClick={speechPaused ? resumeSpeech : pauseSpeech} className="rounded p-1 text-gold hover:bg-navy/30 focus-ring" aria-label={speechPaused ? 'Återuppta uppläsning' : 'Pausa uppläsning'}>
                {speechPaused ? <Play className="h-3 w-3" aria-hidden="true" /> : <Pause className="h-3 w-3" aria-hidden="true" />}
              </button>
              <button onClick={stopSpeech} className="rounded p-1 text-gold hover:bg-navy/30 focus-ring" aria-label="Stoppa uppläsning">
                <Square className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            </>
          )}

          <div className="h-3 w-px bg-navy/30" />

          {/* Session controls */}
          {currentSession && (
            <button
              onClick={endSession}
              disabled={summarizing}
              className="rounded px-2 py-1 text-[10px] text-mist hover:text-parchment disabled:opacity-50 transition-colors"
            >
              {summarizing ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}
              {summarizing ? 'Writing diary...' : 'End Session'}
            </button>
          )}
          <button
            onClick={startNewSession}
            disabled={loadingSession}
            className="rounded p-1 text-mist hover:text-gold transition-colors focus-ring"
            aria-label="Ny session"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

        </div>
      </div>

      {/* ─── Main content ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Sidebar */}
        <GameSidebar activePanel={sidebarPanel} onTogglePanel={togglePanel}>
          {sidebarPanel === 'history' && (
            <SessionHistory
              sessions={sessions}
              onLoadSession={loadSession}
              onReadSession={(s) => setReadingSession(s)}
            />
          )}
          {sidebarPanel === 'gamestate' && campaign && <GameStatePanel campaign={campaign} />}
          {sidebarPanel === 'npcs' && <NpcTab campaignId={id} />}
          {sidebarPanel === 'quests' && <QuestTab campaignId={id} />}
          {sidebarPanel === 'inventory' && <InventoryTab campaignId={id} />}
          {sidebarPanel === 'character' && <CharacterPanel campaignId={id} />}
          {sidebarPanel === 'combat' && <CombatTracker />}
          {sidebarPanel === 'library' && <PdfLibrary campaignId={id} userId={user.id} />}
          {sidebarPanel === 'speech' && <SpeechSettingsPanel />}
          {sidebarPanel === 'audio' && <AudioMixer />}
          {sidebarPanel === 'locations' && <LocationList campaignId={id} sessionId={currentSession?.id ?? null} />}
          {sidebarPanel === 'reputation' && <ReputationPanel campaignId={id} />}
          {sidebarPanel === 'notes' && <NotesTab campaignId={id} compact />}
          {sidebarPanel === 'memory' && <MemoryTab campaignId={id} />}
        </GameSidebar>

        {/* Right: Narrative area */}
        <div className="relative flex flex-1 flex-col">
          {/* Location header */}
          <LocationHeader
            locationName={campaign?.setting}
            timeOfDay={worldTime.timeOfDay}
            timeIcon={TIME_ICONS[worldTime.timeOfDay]}
            day={worldTime.day}
          />

          {/* Session reader overlay */}
          {readingSession && (
            <SessionReader
              session={readingSession}
              onClose={() => setReadingSession(null)}
              onSpeak={(text) => { stopSpeech(); speakPlain(text) }}
              speechEnabled={speechEnabled}
            />
          )}

          {/* Narrative content */}
          {loadingSession ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gold/30" />
            </div>
          ) : (
            <NarrativePanel
              messages={messages}
              streaming={streaming}
              speechEnabled={speechEnabled}
              onSpeak={(text) => { stopSpeech(); speakPlain(cleanForSpeech(text)) }}
            />
          )}

          {/* TTS speaking indicator */}
          {speaking && (
            <div className="px-6 pb-2">
              <div className="mx-auto max-w-2xl">
                <SpeakingIndicator
                  speaking={speaking}
                  paused={speechPaused}
                  onStop={stopSpeech}
                  onTogglePause={speechPaused ? resumeSpeech : pauseSpeech}
                />
              </div>
            </div>
          )}

          {/* Input area */}
          <PlayerInput
            input={input}
            onInputChange={setInput}
            onSend={() => handleSend()}
            skillInput={skillInput}
            onSkillInputChange={setSkillInput}
            onSkillSend={handleSkillSend}
            streaming={streaming}
            sttLang={sttLang}
            onSttTranscript={handleSttTranscript}
            onSttInterim={handleSttInterim}
            onMicListeningChange={setMicListening}
            micListening={micListening}
          />
        </div>
      </div>

      {/* ─── Overlays ─── */}
      <CombatStartOverlay
        visible={showCombatOverlay}
        onComplete={() => setShowCombatOverlay(false)}
      />

      {pendingLoot && pendingLoot.items && (
        <LootReveal
          items={pendingLoot.items}
          currency={pendingLoot.currency}
          narrative={pendingLoot.narrative}
          onClose={() => setPendingLoot(null)}
          onPlaySfx={() => playSfx('loot_pickup')}
        />
      )}
    </div>
  )
}
