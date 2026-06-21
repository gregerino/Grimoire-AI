import { describe, it, expect, vi } from 'vitest'
import { withRetry } from './retry'

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on retryable error and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('429 rate limit'))
      .mockResolvedValue('ok')
    const result = await withRetry(fn, { baseDelayMs: 10 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('throws immediately on non-retryable error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Invalid API key'))
    await expect(withRetry(fn, { baseDelayMs: 10 })).rejects.toThrow('Invalid API key')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('exhausts retries and throws last error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('503 service unavailable'))
    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })).rejects.toThrow('503 service unavailable')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('times out long-running requests', async () => {
    const fn = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 5000)))
    await expect(withRetry(fn, { timeoutMs: 50, maxRetries: 0 })).rejects.toThrow('timed out')
  })

  it('respects custom retryOn predicate', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('custom error'))
      .mockResolvedValue('ok')
    const result = await withRetry(fn, {
      baseDelayMs: 10,
      retryOn: (err) => err instanceof Error && err.message.includes('custom'),
    })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('retries on connection errors', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValue('ok')
    const result = await withRetry(fn, { baseDelayMs: 10 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
