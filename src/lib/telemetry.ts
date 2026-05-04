import * as Sentry from '@sentry/react'

export function captureException(err: unknown, context: Record<string, unknown> = {}): void {
  if (import.meta.env.DEV) {
    console.error('[telemetry]', err, context)
  }
  Sentry.captureException(err, { extra: context })
}
