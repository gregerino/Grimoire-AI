import * as Sentry from '@sentry/react'

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || '0.1.0',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (import.meta.env.DEV) {
        console.warn('[Sentry]', event.exception?.values?.[0]?.value)
        return null
      }
      return event
    },
  })
}

export function setSentryUser(userId: string, email?: string) {
  Sentry.setUser({ id: userId, email })
}

export function clearSentryUser() {
  Sentry.setUser(null)
}

export function setSentryCampaign(campaignId: string, campaignName?: string) {
  Sentry.setTag('campaign_id', campaignId)
  if (campaignName) Sentry.setTag('campaign_name', campaignName)
}

export { Sentry }
