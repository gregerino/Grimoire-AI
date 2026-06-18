import { useState } from 'react'
import { ImageIcon, Loader2, RefreshCw } from 'lucide-react'
import { generateNpcPortrait } from '@/lib/api'

interface Props {
  npcId: string
  portraitUrl: string | null
  name: string
  sessionId?: string | null
  onPortraitGenerated?: (url: string) => void
}

export function NpcPortrait({ npcId, portraitUrl, name, sessionId, onPortraitGenerated }: Props) {
  const [url, setUrl] = useState(portraitUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const generate = async () => {
    setLoading(true)
    setError(false)
    try {
      const result = await generateNpcPortrait(npcId, sessionId)
      if (result.url) {
        setUrl(result.url)
        onPortraitGenerated?.(result.url)
      }
    } catch {
      setError(true)
    }
    setLoading(false)
  }

  if (url) {
    return (
      <div className="group relative aspect-square w-full overflow-hidden rounded-xl border border-navy">
        <img
          src={url}
          alt={`Portrait of ${name}`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <button
          onClick={generate}
          disabled={loading}
          className="absolute bottom-1 right-1 rounded-lg bg-black/60 p-1.5 text-gray-400 opacity-0 transition-opacity hover:text-gold group-hover:opacity-100"
          title="Regenerate portrait"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={generate}
      disabled={loading}
      className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-navy bg-dark-navy/50 transition-colors hover:border-gold/30 hover:bg-navy/30 disabled:opacity-50"
      title="Generate portrait"
    >
      {loading ? (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-gold/50" />
          <span className="text-[10px] text-gray-500">Generating...</span>
        </>
      ) : error ? (
        <>
          <ImageIcon className="h-6 w-6 text-red-400/50" />
          <span className="text-[10px] text-red-400/60">Failed — tap to retry</span>
        </>
      ) : (
        <>
          <ImageIcon className="h-6 w-6 text-gray-600" />
          <span className="text-[10px] text-gray-600">Generate portrait</span>
        </>
      )}
    </button>
  )
}
