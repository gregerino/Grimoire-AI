import { useRef, useEffect } from 'react'
import { Send, Loader2, Dices } from 'lucide-react'
import { motion } from 'framer-motion'
import { MicButton } from '@/components/chat/MicButton'
import type { SttLanguage } from '@/hooks/useSpeechRecognition'

interface Props {
  input: string
  onInputChange: (val: string) => void
  onSend: () => void
  skillInput: string
  onSkillInputChange: (val: string) => void
  onSkillSend: () => void
  streaming: boolean
  sttLang: SttLanguage
  onSttTranscript: (text: string) => void
  onSttInterim: (text: string) => void
  onMicListeningChange: (listening: boolean) => void
  micListening: boolean
}

export function PlayerInput({
  input,
  onInputChange,
  onSend,
  skillInput,
  onSkillInputChange,
  onSkillSend,
  streaming,
  sttLang,
  onSttTranscript,
  onSttInterim,
  onMicListeningChange,
  micListening,
}: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!streaming) inputRef.current?.focus()
  }, [streaming])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSkillSend()
    }
  }

  return (
    <motion.div
      className="border-t border-navy/50 bg-gradient-to-t from-midnight via-midnight/95 to-transparent px-6 pb-5 pt-4"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="mx-auto max-w-2xl space-y-2">
        {/* Skill check row */}
        <div className="flex items-center gap-2">
          <Dices className="h-3.5 w-3.5 shrink-0 text-mystic/60" />
          <input
            value={skillInput}
            onChange={(e) => onSkillInputChange(e.target.value)}
            onKeyDown={handleSkillKeyDown}
            placeholder="Skill check or roll result (1–30)"
            className="flex-1 rounded-lg border border-navy/40 bg-transparent px-3 py-1.5 font-ui text-xs text-parchment/80 placeholder-mist/50 outline-none transition-colors focus:border-mystic/40"
          />
          <button
            onClick={onSkillSend}
            disabled={!skillInput.trim() || streaming}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-mystic/20 text-mystic-light transition-colors hover:bg-mystic/30 disabled:opacity-20"
          >
            {streaming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Dices className="h-3 w-3" />}
          </button>
        </div>

        {/* Main input */}
        <div className="flex items-end gap-3">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What do you do?"
              rows={1}
              className={`w-full resize-none rounded-2xl border bg-dark-navy/60 px-5 py-3.5 font-body text-base text-parchment placeholder-mist/40 outline-none transition-all ${
                micListening
                  ? 'border-blood/40 shadow-glow-blood'
                  : 'border-navy/40 focus:border-gold/30 focus:shadow-glow-gold'
              }`}
            />
          </div>
          <MicButton
            lang={sttLang}
            disabled={streaming}
            onTranscript={onSttTranscript}
            onInterim={onSttInterim}
            onListeningChange={onMicListeningChange}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || streaming}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold text-dark-navy transition-all hover:bg-gold-light hover:shadow-glow-gold disabled:opacity-20 disabled:shadow-none"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export { type Props as PlayerInputProps }
