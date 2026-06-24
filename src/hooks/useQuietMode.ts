import { useEffect } from 'react'
import { useAudioStore } from '@/stores/audioStore'
import { useSpeechStore } from '@/stores/speechStore'

export function useQuietMode() {
  const quietMode = useAudioStore((s) => s.quietMode)
  const toggleQuietMode = useAudioStore((s) => s.toggleQuietMode)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        toggleQuietMode()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [toggleQuietMode])

  useEffect(() => {
    if (quietMode) {
      useSpeechStore.getState().setEnabled(false)
    }
  }, [quietMode])

  return quietMode
}
