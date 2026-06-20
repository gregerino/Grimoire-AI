import { useCallback, useRef, useState } from 'react'
import { useSpeechStore, type VoiceProfileKey } from '@/stores/speechStore'
import { fetchTtsAudio } from '@/lib/api'

interface SpeechSegment {
  speaker: VoiceProfileKey
  text: string
}

interface QueueItem {
  text: string
  speaker: VoiceProfileKey
  voiceId: string | null
  prefetched?: Promise<Blob>
}

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const queueRef = useRef<QueueItem[]>([])
  const activeRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const stoppedRef = useRef(false)

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const prefetchNext = () => {
    const next = queueRef.current[0]
    if (next && !next.prefetched) {
      next.prefetched = fetchTtsAudio(next.text, next.speaker, next.voiceId)
    }
  }

  const processQueue = useCallback(async () => {
    if (activeRef.current || stoppedRef.current) return
    const item = queueRef.current.shift()
    if (!item) {
      setSpeaking(false)
      return
    }

    activeRef.current = true
    setSpeaking(true)
    setPaused(false)

    try {
      const blob = await (item.prefetched || fetchTtsAudio(item.text, item.speaker, item.voiceId))
      if (stoppedRef.current) {
        activeRef.current = false
        return
      }

      // Start fetching the next chunk while this one plays
      prefetchNext()

      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url

      const audio = new Audio(url)
      audio.playbackRate = 1.2
      audioRef.current = audio

      await new Promise<void>((resolve) => {
        audio.onended = () => resolve()
        audio.onerror = () => resolve()
        audio.play().catch(() => resolve())
      })

      cleanup()
      activeRef.current = false
      processQueue()
    } catch (err) {
      console.warn('TTS fetch failed for chunk, skipping:', (err as Error).message)
      cleanup()
      activeRef.current = false
      processQueue()
    }
  }, [cleanup])

  const enqueue = useCallback(
    (text: string, speaker: VoiceProfileKey = 'narrator') => {
      const { enabled, defaultVoiceId } = useSpeechStore.getState()
      if (!enabled || !text.trim()) return
      const voiceId = speaker === 'narrator' ? defaultVoiceId : null
      queueRef.current.push({ text, speaker, voiceId })
      if (!activeRef.current) processQueue()
    },
    [processQueue],
  )

  const speak = useCallback(
    (segments: SpeechSegment[]) => {
      const { enabled } = useSpeechStore.getState()
      if (!enabled) return
      cleanup()
      activeRef.current = false
      stoppedRef.current = false
      queueRef.current = []
      for (const seg of segments) {
        enqueue(seg.text, seg.speaker)
      }
    },
    [enqueue, cleanup],
  )

  const speakPlain = useCallback(
    (text: string, speaker: VoiceProfileKey = 'narrator') => {
      speak([{ speaker, text }])
    },
    [speak],
  )

  const enqueueSentence = useCallback(
    (text: string, speaker: VoiceProfileKey = 'narrator') => {
      if (stoppedRef.current) return
      enqueue(text, speaker)
    },
    [enqueue],
  )

  const resetStopped = useCallback(() => {
    stoppedRef.current = false
  }, [])

  const stop = useCallback(() => {
    stoppedRef.current = true
    cleanup()
    queueRef.current = []
    activeRef.current = false
    setSpeaking(false)
    setPaused(false)
  }, [cleanup])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setPaused(true)
  }, [])

  const resume = useCallback(() => {
    audioRef.current?.play()
    setPaused(false)
  }, [])

  return { speak, speakPlain, enqueueSentence, stop, pause, resume, resetStopped, speaking, paused, supported: true }
}
