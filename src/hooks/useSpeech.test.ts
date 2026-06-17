import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSpeech } from './useSpeech'
import { useSpeechStore } from '@/stores/speechStore'

vi.mock('@/lib/api', () => ({
  fetchTtsAudio: vi.fn(() =>
    Promise.resolve(new Blob(['fake-audio'], { type: 'audio/mpeg' })),
  ),
}))

const mockPlay = vi.fn(() => Promise.resolve())
const mockPause = vi.fn()

beforeEach(() => {
  mockPlay.mockClear()
  mockPause.mockClear()

  vi.stubGlobal(
    'Audio',
    class MockAudio {
      onended: (() => void) | null = null
      onerror: (() => void) | null = null
      play = () => {
        mockPlay()
        setTimeout(() => this.onended?.(), 0)
        return Promise.resolve()
      }
      pause = mockPause
    },
  )

  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  })

  useSpeechStore.getState().setEnabled(true)
  useSpeechStore.getState().setDefaultVoiceId(null)
})

describe('useSpeech', () => {
  it('reports supported as true', () => {
    const { result } = renderHook(() => useSpeech())
    expect(result.current.supported).toBe(true)
  })

  it('does not speak when disabled', () => {
    useSpeechStore.getState().setEnabled(false)
    const { result } = renderHook(() => useSpeech())
    act(() => result.current.speakPlain('hello'))
    expect(mockPlay).not.toHaveBeenCalled()
  })

  it('fetches TTS audio and plays it', async () => {
    const { fetchTtsAudio } = await import('@/lib/api')
    const { result } = renderHook(() => useSpeech())
    await act(async () => {
      result.current.speakPlain('Du går in i grottan.')
      await new Promise((r) => setTimeout(r, 10))
    })
    expect(fetchTtsAudio).toHaveBeenCalledWith('Du går in i grottan.', 'narrator', null)
    expect(mockPlay).toHaveBeenCalled()
  })

  it('uses correct speaker for villain', async () => {
    const { fetchTtsAudio } = await import('@/lib/api')
    const { result } = renderHook(() => useSpeech())
    await act(async () => {
      result.current.speakPlain('Jag ska krossa dig!', 'villain')
      await new Promise((r) => setTimeout(r, 10))
    })
    expect(fetchTtsAudio).toHaveBeenCalledWith('Jag ska krossa dig!', 'villain', null)
  })

  it('passes defaultVoiceId for narrator', async () => {
    useSpeechStore.getState().setDefaultVoiceId('custom-voice-123')
    const { fetchTtsAudio } = await import('@/lib/api')
    const { result } = renderHook(() => useSpeech())
    await act(async () => {
      result.current.speakPlain('Test')
      await new Promise((r) => setTimeout(r, 10))
    })
    expect(fetchTtsAudio).toHaveBeenCalledWith('Test', 'narrator', 'custom-voice-123')
  })

  it('does not pass defaultVoiceId for non-narrator speakers', async () => {
    useSpeechStore.getState().setDefaultVoiceId('custom-voice-123')
    const { fetchTtsAudio } = await import('@/lib/api')
    const { result } = renderHook(() => useSpeech())
    await act(async () => {
      result.current.speakPlain('Test', 'villain')
      await new Promise((r) => setTimeout(r, 10))
    })
    expect(fetchTtsAudio).toHaveBeenCalledWith('Test', 'villain', null)
  })

  it('enqueues sentences for streaming TTS', async () => {
    const { fetchTtsAudio } = await import('@/lib/api')
    const before = (fetchTtsAudio as ReturnType<typeof vi.fn>).mock.calls.length
    const { result } = renderHook(() => useSpeech())
    await act(async () => {
      result.current.enqueueSentence('Första meningen.')
      result.current.enqueueSentence('Andra meningen.')
      await new Promise((r) => setTimeout(r, 10))
    })
    expect((fetchTtsAudio as ReturnType<typeof vi.fn>).mock.calls.length - before).toBe(2)
  })

  it('stops playback and clears queue', async () => {
    const { result } = renderHook(() => useSpeech())
    await act(async () => {
      result.current.speakPlain('Test')
      await new Promise((r) => setTimeout(r, 10))
    })
    act(() => result.current.stop())
    expect(result.current.speaking).toBe(false)
  })
})
