interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  timeoutMs?: number
  retryOn?: (error: unknown) => boolean
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryOn'>> = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
  timeoutMs: 30_000,
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('rate limit') || msg.includes('429')) return true
    if (msg.includes('timeout') || msg.includes('timed out')) return true
    if (msg.includes('econnreset') || msg.includes('econnrefused')) return true
    if (msg.includes('socket hang up')) return true
    if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504')) return true
    if (msg.includes('overloaded')) return true
  }
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs, timeoutMs } = { ...DEFAULT_OPTIONS, ...opts }
  const shouldRetry = opts.retryOn ?? isRetryable

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await withTimeout(fn(), timeoutMs)
      return result
    } catch (error) {
      lastError = error

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error
      }

      const jitter = Math.random() * 0.3 + 0.85
      const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt) * jitter)
      console.warn(`Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms: ${error instanceof Error ? error.message : error}`)
      await sleep(delay)
    }
  }

  throw lastError
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    promise.then(
      (val) => { clearTimeout(timer); resolve(val) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}
