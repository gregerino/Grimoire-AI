import { useCallback, useEffect, useRef, useState } from 'react'

export type SttLanguage = 'sv-SE' | 'en-US'

interface UseSpeechRecognitionOptions {
  lang: SttLanguage
  onResult?: (transcript: string) => void
}

interface UseSpeechRecognitionReturn {
  supported: boolean
  listening: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  start: () => void
  stop: () => void
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export function useSpeechRecognition({
  lang,
  onResult,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [supported] = useState(() => getSpeechRecognition() !== null)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  const manualStopRef = useRef(false)
  const lastFinalIndexRef = useRef(0)

  useEffect(() => {
    const Ctor = getSpeechRecognition()
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang
    recognitionRef.current = recognition

    return () => {
      recognition.abort()
      recognitionRef.current = null
    }
  }, [lang])

  useEffect(() => {
    const recognition = recognitionRef.current
    if (!recognition) return

    recognition.onstart = () => {
      setListening(true)
      setError(null)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let newFinal = ''
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          newFinal += result[0].transcript
          lastFinalIndexRef.current = i + 1
        } else {
          interim += result[0].transcript
        }
      }

      if (newFinal) {
        setTranscript((prev) => prev + newFinal)
        onResultRef.current?.(newFinal)
      }
      setInterimTranscript(interim)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return

      const messages: Record<string, string> = {
        'not-allowed': 'Mikrofontillstånd nekades. Tillåt mikrofonen i webbläsarens inställningar.',
        'network': 'Nätverksfel — taligenkänning kräver internetanslutning.',
        'service-not-allowed': 'Taligenkänning är inte tillgänglig. Kontrollera att du använder Chrome/Edge med HTTPS.',
      }
      setError(messages[event.error] ?? `Taligenkänningsfel: ${event.error}`)
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
      if (!manualStopRef.current) {
        setInterimTranscript('')
      }
      manualStopRef.current = false
    }
  }, [lang])

  const start = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition || listening) return

    setTranscript('')
    setInterimTranscript('')
    setError(null)
    manualStopRef.current = false
    lastFinalIndexRef.current = 0

    try {
      recognition.start()
    } catch {
      setError('Kunde inte starta taligenkänning. Försök igen.')
    }
  }, [listening])

  const stop = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return

    manualStopRef.current = true
    recognition.stop()
  }, [])

  return { supported, listening, transcript, interimTranscript, error, start, stop }
}
