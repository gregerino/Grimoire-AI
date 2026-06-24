import { useCallback, useEffect, useState } from 'react'
import { Mic, MicOff, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSpeechRecognition, type SttLanguage } from '@/hooks/useSpeechRecognition'
import { useMicrophoneVolume } from '@/hooks/useMicrophoneVolume'

interface MicButtonProps {
  lang: SttLanguage
  disabled?: boolean
  onTranscript: (text: string) => void
  onInterim: (text: string) => void
  onListeningChange?: (listening: boolean) => void
}

function VuMeter({ volume }: { volume: number }) {
  const bars = 5
  const filled = Math.round((volume / 100) * bars)

  return (
    <div className="flex items-end gap-[2px] h-3">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[2px] rounded-full"
          animate={{
            height: i < filled ? 4 + i * 2 : 3,
            backgroundColor: i < filled
              ? i >= bars - 1 ? '#ef4444' : '#C9A84C'
              : '#4A4A6A',
          }}
          transition={{ duration: 0.08 }}
        />
      ))}
    </div>
  )
}

export function MicButton({ lang, disabled, onTranscript, onInterim, onListeningChange }: MicButtonProps) {
  const { supported, listening, interimTranscript, error, start, stop } =
    useSpeechRecognition({
      lang,
      onResult: onTranscript,
    })

  const volume = useMicrophoneVolume(listening)
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

  const ringScale = 1 + (volume / 100) * 0.4

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
        className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition-all ${
          listening
            ? 'border-red-500/50 bg-red-500/20 text-red-400'
            : 'border-navy bg-dark-navy text-gray-400 hover:border-gold/30 hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed'
        }`}
        title={listening ? 'Klicka för att stoppa' : 'Klicka för att tala'}
      >
        {listening && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-red-500/30"
            animate={{ scale: ringScale, opacity: 0.3 + (volume / 100) * 0.5 }}
            transition={{ duration: 0.1 }}
          />
        )}
        <Mic className={`h-4 w-4 ${listening ? 'animate-pulse' : ''}`} />
      </button>

      <AnimatePresence>
        {listening && (
          <motion.div
            className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border border-red-500/30 bg-red-950/90 px-3 py-1.5 shadow-lg"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          >
            <div className="flex items-center gap-2 whitespace-nowrap text-xs text-red-200">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <VuMeter volume={volume} />
              <span>Lyssnar…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
