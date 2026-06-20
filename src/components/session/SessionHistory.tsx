import { BookOpen, Clock, Eye } from 'lucide-react'
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
      <div className="py-4 text-center text-sm text-gray-600">
        No completed sessions yet. Your adventure diary will appear here.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
        Adventure Diary
      </h3>
      {endedSessions.map((session) => (
        <div
          key={session.id}
          className="rounded-xl border border-navy bg-dark-navy p-4 transition-all hover:border-gold/20"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-gold" />
              <span className="text-sm font-medium text-parchment line-clamp-1">
                {session.title || `Session ${endedSessions.length - endedSessions.indexOf(session)}`}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1 text-[10px] text-gray-600">
              <Clock className="h-3 w-3" />
              {new Date(session.started_at).toLocaleDateString()}
            </div>
          </div>

          {session.summary ? (
            <p className="text-xs leading-relaxed text-gray-400 line-clamp-4 italic">
              {session.summary}
            </p>
          ) : (
            <p className="text-xs text-gray-600 italic">No diary entry for this session.</p>
          )}

          <div className="mt-2 flex items-center gap-3">
            {onReadSession && (
              <button
                onClick={() => onReadSession(session)}
                className="flex items-center gap-1 text-[10px] font-medium text-gold/60 hover:text-gold transition-colors"
              >
                <Eye className="h-3 w-3" />
                Read
              </button>
            )}
            <button
              onClick={() => onLoadSession(session)}
              className="text-[10px] font-medium text-gray-600 hover:text-gray-400 transition-colors"
            >
              Load into chat
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
