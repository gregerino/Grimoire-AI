import { useCallback, useRef, useState } from 'react'
import { useSpeechStore, type VoiceProfileKey } from '@/stores/speechStore'
import { fetchTtsAudio } from '@/lib/api'

interface SpeechSegment {
  speaker: VoiceProfileKey
  text: string
}

interface QueueItem {
  audioPromise: Promise<Blob>
  text: string
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
      const blob = await item.audioPromise
      if (stoppedRef.current) {
        activeRef.current = false
        return
      }

      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio

      await new Promise<void>((resolve) => {
        audio.onended = () => resolve()
        audio.onerror = () => resolve()
        audio.play().catch(() => resolve())
      })

      cleanup()
      activeRef.current = false
      processQueue()
    } catch {
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
      const audioPromise = fetchTtsAudio(text, speaker, voiceId)
      queueRef.current.push({ audioPromise, text })
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
      stoppedRef.current = false
      enqueue(text, speaker)
    },
    [enqueue],
  )

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

  return { speak, speakPlain, enqueueSentence, stop, pause, resume, speaking, paused, supported: true }
}
