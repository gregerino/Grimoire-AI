import { useState, useEffect, useRef } from 'react'
import { X, BookOpen, Clock, Loader2, Volume2, Download } from 'lucide-react'
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
  sessionNumber?: number
}

export function SessionReader({ session, onClose, onSpeak, speechEnabled, sessionNumber }: Props) {
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

  const handleExportPdf = async () => {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const maxWidth = pageWidth - margin * 2
    let y = margin

    doc.setFont('times', 'bold')
    doc.setFontSize(18)
    const title = session.title || `Session ${sessionNumber ?? ''}`
    doc.text(title, pageWidth / 2, y, { align: 'center' })
    y += 8

    doc.setFont('times', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text(
      new Date(session.started_at).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' }),
      pageWidth / 2, y, { align: 'center' },
    )
    y += 6

    doc.setDrawColor(180)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    if (session.summary) {
      doc.setFont('times', 'italic')
      doc.setFontSize(11)
      doc.setTextColor(80)
      const summaryLines = doc.splitTextToSize(session.summary, maxWidth)
      doc.text(summaryLines, margin, y)
      y += summaryLines.length * 5 + 8
    }

    doc.setTextColor(0)

    for (const msg of messages) {
      if (y > 270) {
        doc.addPage()
        y = margin
      }

      if (msg.role === 'user') {
        doc.setFont('times', 'bold')
        doc.setFontSize(10)
        doc.text('Adventurer:', margin, y)
        y += 5
        doc.setFont('times', 'normal')
        doc.setFontSize(10)
      } else {
        doc.setFont('times', 'bold')
        doc.setFontSize(10)
        doc.text('Dungeon Master:', margin, y)
        y += 5
        doc.setFont('times', 'normal')
        doc.setFontSize(10)
      }

      const cleaned = msg.content.replace(/[#*_`~]/g, '')
      const lines = doc.splitTextToSize(cleaned, maxWidth)
      for (const line of lines) {
        if (y > 280) {
          doc.addPage()
          y = margin
        }
        doc.text(line, margin, y)
        y += 4.5
      }
      y += 4
    }

    doc.save(`${title.replace(/[^a-zA-Z0-9 ]/g, '')}.pdf`)
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-gradient-to-b from-dark-navy via-dark-navy to-midnight">
      {/* Header with parchment feel */}
      <div className="flex items-center justify-between border-b border-gold/10 bg-dark-navy/80 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <BookOpen className="h-4 w-4 shrink-0 text-gold" />
          <div className="min-w-0">
            <h2 className="font-display text-sm font-medium text-parchment truncate">
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
        <div className="flex items-center gap-1">
          <button
            onClick={handleExportPdf}
            className="rounded p-1.5 text-gray-500 hover:bg-navy hover:text-gold transition-colors"
            title="Export as PDF"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-gray-500 hover:bg-navy hover:text-parchment transition-colors"
            title="Stäng (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Diary summary with manuscript feel */}
      {session.summary && (
        <div className="border-b border-gold/10 bg-gradient-to-r from-gold/5 via-transparent to-gold/5 px-6 py-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-gold/10" />
              <span className="font-display text-[10px] uppercase tracking-[0.2em] text-gold/40">Session Diary</span>
              <div className="h-px flex-1 bg-gold/10" />
            </div>
            <p className="font-body text-sm leading-relaxed text-parchment-dark/80 italic text-center">
              {session.summary}
            </p>
          </div>
        </div>
      )}

      {/* Transcript with diary styling */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gold/50" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center font-body text-sm text-gray-600 italic">The pages of this session are blank...</p>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'user' ? 'flex justify-end' : ''}>
                <div
                  className={`rounded-xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'max-w-[80%] bg-gold/8 border border-gold/15 text-parchment'
                      : 'text-gray-300'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-display text-xs text-gold/70">Dungeon Master</span>
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
                    <div className="prose-narrative">
                      <Markdown text={msg.content} />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed font-body">
                      {msg.content}
                    </div>
                  )}
                </div>
                {/* Ornamental separator between exchanges */}
                {msg.role === 'assistant' && i < messages.length - 1 && (
                  <div className="flex items-center gap-2 my-2 px-4">
                    <div className="h-px flex-1 bg-navy" />
                    <span className="text-navy text-[8px]">◆</span>
                    <div className="h-px flex-1 bg-navy" />
                  </div>
                )}
              </div>
            ))}

            {/* End ornament */}
            <div className="flex items-center justify-center gap-3 pt-4 pb-8">
              <div className="h-px w-16 bg-gold/10" />
              <span className="font-display text-[10px] text-gold/20 tracking-widest">FIN</span>
              <div className="h-px w-16 bg-gold/10" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
