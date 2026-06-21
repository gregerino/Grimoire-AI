import * as Sentry from '@sentry/node'

export function initServerSentry() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || '0.1.0',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    beforeSend(event) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Sentry]', event.exception?.values?.[0]?.value)
        return null
      }
      return event
    },
  })
}

export { Sentry }
