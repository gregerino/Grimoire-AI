import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, Scroll } from 'lucide-react'
import { Markdown } from '@/components/chat/Markdown'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  messages: Message[]
  streaming: boolean
  speechEnabled: boolean
  onSpeak: (text: string) => void
}

export function NarrativePanel({ messages, streaming, speechEnabled, onSpeak }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Scroll className="mx-auto mb-6 h-16 w-16 text-gold/20" />
          <h2 className="font-display text-2xl font-bold tracking-wide text-parchment/80">
            The Adventure Awaits
          </h2>
          <p className="mt-3 max-w-md font-body text-lg leading-relaxed text-stone">
            Your AI Dungeon Master is ready. Describe your character or say what you do to begin.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-8 py-8 space-y-8">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {msg.role === 'assistant' ? (
                <div className="group relative">
                  {/* DM narrative */}
                  <div className="prose-narrative">
                    <Markdown text={msg.content} />
                    {streaming && i === messages.length - 1 && (
                      <motion.span
                        className="ml-1 inline-block h-5 w-[3px] bg-gold/70 align-text-bottom"
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                      />
                    )}
                  </div>

                  {/* Speak button */}
                  {speechEnabled && msg.content && !(streaming && i === messages.length - 1) && (
                    <button
                      onClick={() => onSpeak(msg.content)}
                      className="absolute -right-10 top-0 rounded-full p-2 text-mist opacity-0 transition-all hover:text-gold group-hover:opacity-100"
                      title="Läs upp"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl border border-gold/15 bg-gold/5 px-5 py-3">
                    <p className="font-body text-base leading-relaxed text-parchment">
                      {msg.content}
                    </p>
                  </div>
                </div>
              )}

              {/* Scene divider between exchanges */}
              {msg.role === 'user' && i < messages.length - 1 && (
                <div className="my-8 flex items-center gap-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
                  <div className="h-1.5 w-1.5 rounded-full bg-gold/20" />
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
