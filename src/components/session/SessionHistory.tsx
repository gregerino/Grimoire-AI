import { BookOpen, Clock, Eye, ChevronRight } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Session } from '@/types/database'

interface Props {
  sessions: Session[]
  onLoadSession: (session: Session) => void
  onReadSession?: (session: Session) => void
}

export function SessionHistory({ sessions, onLoadSession, onReadSession }: Props) {
  const endedSessions = sessions.filter((s) => s.ended_at)

  if (endedSessions.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-10 w-10" />}
        title="Your Adventure Diary Awaits"
        description="No completed sessions yet. Each adventure will be recorded here as a page in your diary, written in the style of a traveler's journal."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        <h3 className="font-display text-sm tracking-widest text-gold/60 uppercase">Adventure Diary</h3>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      </div>

      <div className="space-y-3">
        {endedSessions.map((session, idx) => {
          const sessionNumber = endedSessions.length - idx
          return (
            <div
              key={session.id}
              className="group rounded-xl border border-gold/10 bg-gradient-to-br from-dark-navy to-midnight p-5 transition-all hover:border-gold/25 hover:shadow-card-hover"
            >
              {/* Session header with ornamental styling */}
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold font-display text-sm">
                    {sessionNumber}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-display text-base text-parchment line-clamp-1">
                      {session.title || `Session ${sessionNumber}`}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-600 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(session.started_at).toLocaleDateString('sv-SE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ornamental divider */}
              <div className="mb-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-gold/10" />
                <span className="text-gold/20 text-xs">✦</span>
                <div className="h-px flex-1 bg-gold/10" />
              </div>

              {/* Diary entry */}
              {session.summary ? (
                <p className="font-body text-sm leading-relaxed text-parchment-dark/80 italic line-clamp-4">
                  {session.summary}
                </p>
              ) : (
                <p className="font-body text-xs text-gray-600 italic">
                  The details of this session remain unwritten...
                </p>
              )}

              {/* Actions */}
              <div className="mt-3 flex items-center gap-3 pt-2 border-t border-navy/50">
                {onReadSession && (
                  <button
                    onClick={() => onReadSession(session)}
                    className="flex items-center gap-1.5 text-xs font-medium text-gold/60 hover:text-gold transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Read Full Entry
                  </button>
                )}
                <button
                  onClick={() => onLoadSession(session)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-400 transition-colors"
                >
                  <ChevronRight className="h-3 w-3" />
                  Continue Adventure
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
