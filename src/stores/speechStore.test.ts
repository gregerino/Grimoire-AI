import { describe, it, expect, beforeEach } from 'vitest'
import { useSpeechStore } from './speechStore'

describe('speechStore', () => {
  beforeEach(() => {
    const s = useSpeechStore.getState()
    s.setEnabled(false)
    s.setAutoRead(true)
  })

  it('starts with TTS disabled', () => {
    expect(useSpeechStore.getState().enabled).toBe(false)
  })

  it('toggles enabled', () => {
    useSpeechStore.getState().setEnabled(true)
    expect(useSpeechStore.getState().enabled).toBe(true)
  })

  it('toggles autoRead', () => {
    useSpeechStore.getState().setAutoRead(false)
    expect(useSpeechStore.getState().autoRead).toBe(false)
  })

  it('defaults autoRead to true', () => {
    expect(useSpeechStore.getState().autoRead).toBe(true)
  })
})
