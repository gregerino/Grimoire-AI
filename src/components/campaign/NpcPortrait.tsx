import { useState, useEffect } from 'react'
import { ImageIcon, Loader2, RefreshCw, Maximize2 } from 'lucide-react'
import { generateNpcPortrait } from '@/lib/api'
import { Lightbox } from '@/components/ui/Lightbox'

interface Props {
  npcId: string
  portraitUrl: string | null
  name: string
  campaignImageEnabled?: boolean
  sessionId?: string | null
  onPortraitGenerated?: (url: string) => void
}

export function NpcPortrait({ npcId, portraitUrl, name, campaignImageEnabled = true, sessionId, onPortraitGenerated }: Props) {
  const [url, setUrl] = useState(portraitUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    if (!url && campaignImageEnabled && !loading && !error) {
      generate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npcId])

  const generate = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
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
      <>
        <div
          className="group relative aspect-square w-full overflow-hidden rounded-xl border border-navy cursor-zoom-in"
          onClick={() => setLightbox(true)}
        >
          <img
            src={url}
            alt={`Portrait of ${name}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <Maximize2 className="h-5 w-5 text-white drop-shadow" />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); generate(e) }}
            disabled={loading}
            className="absolute bottom-1 right-1 rounded-lg bg-black/60 p-1.5 text-gray-400 opacity-0 transition-opacity hover:text-gold group-hover:opacity-100"
            title="Regenerate portrait"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
        </div>

        {lightbox && (
          <Lightbox src={url} alt={`Portrait of ${name}`} label={name} onClose={() => setLightbox(false)} />
        )}
      </>
    )
  }

  return (
    <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-navy bg-dark-navy/50">
      {loading ? (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-gold/50" />
          <span className="text-[10px] text-gray-500">Generating...</span>
        </>
      ) : error ? (
        <button
          onClick={() => generate()}
          className="flex flex-col items-center gap-2 transition-opacity hover:opacity-80"
        >
          <ImageIcon className="h-6 w-6 text-red-400/50" />
          <span className="text-[10px] text-red-400/60">Failed — tap to retry</span>
        </button>
      ) : (
        <>
          <ImageIcon className="h-6 w-6 text-gray-600" />
          <span className="text-[10px] text-gray-600">Generating...</span>
        </>
      )}
    </div>
  )
}
