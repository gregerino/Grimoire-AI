import { useEffect, useRef, useState, useCallback } from 'react'

export function useMicrophoneVolume(active: boolean) {
  const [volume, setVolume] = useState(0)
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    analyserRef.current = null
    if (ctxRef.current?.state !== 'closed') ctxRef.current?.close()
    ctxRef.current = null
    setVolume(0)
  }, [])

  useEffect(() => {
    if (!active) {
      cleanup()
      return
    }

    let cancelled = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream

        const ctx = new AudioContext()
        ctxRef.current = ctx
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.4
        source.connect(analyser)
        analyserRef.current = analyser

        const data = new Uint8Array(analyser.frequencyBinCount)

        function tick() {
          if (cancelled) return
          analyser.getByteFrequencyData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) sum += data[i]
          const avg = sum / data.length
          setVolume(Math.min(100, Math.round((avg / 128) * 100)))
          rafRef.current = requestAnimationFrame(tick)
        }
        tick()
      } catch {
        setVolume(0)
      }
    }

    start()
    return () => {
      cancelled = true
      cleanup()
    }
  }, [active, cleanup])

  return volume
}
