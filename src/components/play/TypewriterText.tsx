import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface Props {
  text: string
  speed?: number
  onComplete?: () => void
  className?: string
}

export function TypewriterText({ text, speed = 20, onComplete, className = '' }: Props) {
  const [displayedLength, setDisplayedLength] = useState(0)
  const prevTextRef = useRef('')
  const completed = useRef(false)

  useEffect(() => {
    if (text === prevTextRef.current) return
    const isAppend = text.startsWith(prevTextRef.current) && prevTextRef.current.length > 0
    prevTextRef.current = text

    if (isAppend) {
      setDisplayedLength((prev) => prev)
    } else {
      setDisplayedLength(0)
      completed.current = false
    }
  }, [text])

  useEffect(() => {
    if (displayedLength >= text.length) {
      if (!completed.current) {
        completed.current = true
        onComplete?.()
      }
      return
    }

    const charsRemaining = text.length - displayedLength
    const batchSize = charsRemaining > 100 ? 3 : 1
    const timer = setTimeout(() => {
      setDisplayedLength((prev) => Math.min(prev + batchSize, text.length))
    }, speed)

    return () => clearTimeout(timer)
  }, [displayedLength, text, speed, onComplete])

  const displayed = text.slice(0, displayedLength)
  const isTyping = displayedLength < text.length

  return (
    <span className={className}>
      {displayed}
      {isTyping && (
        <motion.span
          className="inline-block w-[2px] h-[1.1em] bg-gold/80 align-text-bottom ml-0.5"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
        />
      )}
    </span>
  )
}
