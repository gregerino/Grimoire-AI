import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, BookOpen } from 'lucide-react'

export function PlayPage() {
  const { id } = useParams()

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b border-navy bg-dark-navy/50 px-4 py-2">
        <Link
          to={`/campaign/${id}`}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gold transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Campaign
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <BookOpen className="mx-auto mb-4 h-16 w-16 text-gold/30" />
          <h2 className="text-xl font-bold text-parchment">The Adventure Awaits</h2>
          <p className="mt-2 text-sm text-gray-500">
            AI DM chat, Mythic GME oracle, and voice will be implemented in Sprint 2.
          </p>
        </div>
      </div>
    </div>
  )
}
