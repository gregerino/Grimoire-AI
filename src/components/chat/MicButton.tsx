import { useCallback, useEffect, useState } from 'react'
import { Mic, MicOff, AlertCircle } from 'lucide-react'
import { useSpeechRecognition, type SttLanguage } from '@/hooks/useSpeechRecognition'

interface MicButtonProps {
  lang: SttLanguage
  disabled?: boolean
  onTranscript: (text: string) => void
  onInterim: (text: string) => void
  onListeningChange?: (listening: boolean) => void
}

export function MicButton({ lang, disabled, onTranscript, onInterim, onListeningChange }: MicButtonProps) {
  const { supported, listening, interimTranscript, error, start, stop } =
    useSpeechRecognition({
      lang,
      onResult: onTranscript,
    })

  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    onInterim(interimTranscript)
  }, [interimTranscript, onInterim])

  useEffect(() => {
    onListeningChange?.(listening)
  }, [listening, onListeningChange])

  useEffect(() => {
    if (error) {
      setShowTooltip(true)
      const timer = setTimeout(() => setShowTooltip(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleClick = useCallback(() => {
    if (disabled || !supported) return
    if (listening) {
      stop()
    } else {
      start()
    }
  }, [disabled, supported, listening, start, stop])

  if (!supported) {
    return (
      <div className="relative">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-navy bg-dark-navy text-gray-600 cursor-not-allowed"
          title="Taligenkänning stöds inte i denna webbläsare. Använd Chrome eller Edge."
          onClick={() => setShowTooltip((v) => !v)}
        >
          <MicOff className="h-4 w-4" />
        </button>
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-amber-500/30 bg-amber-950/90 px-3 py-2 text-xs text-amber-200 shadow-lg">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Kräver Chrome eller Edge
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all ${
          listening
            ? 'border-red-500/50 bg-red-500/20 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
            : 'border-navy bg-dark-navy text-gray-400 hover:border-gold/30 hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed'
        }`}
        title={listening ? 'Klicka för att stoppa' : 'Klicka för att tala'}
      >
        <Mic className={`h-4 w-4 ${listening ? 'animate-pulse' : ''}`} />
      </button>

      {listening && (
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-red-500/30 bg-red-950/90 px-3 py-1.5 text-xs text-red-200 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            Lyssnar... klicka igen för att stoppa
          </div>
        </div>
      )}

      {error && showTooltip && (
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 max-w-64 rounded-lg border border-amber-500/30 bg-amber-950/90 px-3 py-2 text-xs text-amber-200 shadow-lg">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  )
}
