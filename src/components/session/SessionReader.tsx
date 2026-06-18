import { useState, useEffect, useRef } from 'react'
import { X, BookOpen, Clock, Loader2, Volume2 } from 'lucide-react'
import { getMessages } from '@/lib/api'
import { Markdown } from '@/components/chat/Markdown'
import type { Session } from '@/types/database'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  session: Session
  onClose: () => void
  onSpeak?: (text: string) => void
  speechEnabled?: boolean
}

export function SessionReader({ session, onClose, onSpeak, speechEnabled }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    getMessages(session.id).then(({ messages: data }) => {
      setMessages(
        data.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      )
      setLoading(false)
    })
  }, [session.id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-dark-navy/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-navy px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <BookOpen className="h-4 w-4 shrink-0 text-gold" />
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-parchment truncate">
              {session.title || 'Untitled Session'}
            </h2>
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <Clock className="h-3 w-3" />
              {new Date(session.started_at).toLocaleDateString('sv-SE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1.5 text-gray-500 hover:bg-navy hover:text-parchment transition-colors"
          title="Stäng (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Diary summary */}
      {session.summary && (
        <div className="border-b border-navy bg-navy/20 px-6 py-4">
          <p className="text-xs uppercase tracking-wider text-gold/60 mb-1">Session Diary</p>
          <p className="text-sm leading-relaxed text-gray-300 italic">{session.summary}</p>
        </div>
      )}

      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gold/50" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-gray-600">No messages in this session.</p>
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
                      {speechEnabled && onSpeak && msg.content && (
                        <button
                          onClick={() => onSpeak(msg.content)}
                          className="rounded p-1 text-gray-600 hover:text-gold transition-colors"
                          title="Läs upp"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                  {msg.role === 'assistant' ? (
                    <Markdown text={msg.content} />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
