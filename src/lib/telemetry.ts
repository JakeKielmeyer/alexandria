/**
 * Telemetry facade.
 *
 * Provides a single `captureException` entry point used by the error boundary
 * and anywhere in the app that wants to report a handled error. Today it
 * logs to the console in dev and, if `VITE_SENTRY_DSN` is populated, forwards
 * the event to Sentry via the public envelope endpoint. We intentionally
 * avoid importing `@sentry/browser` so we don't pull the SDK (~40 kB gzipped)
 * into the client bundle during private beta.
 *
 * To swap this for the official Sentry SDK later:
 *   1. `pnpm add @sentry/browser`
 *   2. Replace the fetch call below with `Sentry.init({ dsn })` + `Sentry.captureException(err)`.
 */

interface DsnParts {
  host: string
  publicKey: string
  projectId: string
}

function parseDsn(dsn: string): DsnParts | null {
  try {
    const url = new URL(dsn)
    const publicKey = url.username
    const projectId = url.pathname.replace(/^\//, '')
    if (!publicKey || !projectId) return null
    return { host: url.host, publicKey, projectId }
  } catch {
    return null
  }
}

let cachedDsn: DsnParts | null | undefined

function getDsn(): DsnParts | null {
  if (cachedDsn !== undefined) return cachedDsn
  const raw = import.meta.env.VITE_SENTRY_DSN as string | undefined
  cachedDsn = raw ? parseDsn(raw) : null
  return cachedDsn
}

/** Best-effort fire-and-forget POST to Sentry's envelope endpoint. */
async function sendToSentry(err: unknown, context: Record<string, unknown>): Promise<void> {
  const dsn = getDsn()
  if (!dsn) return

  const eventId = crypto.randomUUID().replace(/-/g, '')
  const timestamp = Date.now() / 1000
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined

  const header = JSON.stringify({
    event_id: eventId,
    sent_at: new Date().toISOString(),
    dsn: `https://${dsn.publicKey}@${dsn.host}/${dsn.projectId}`,
  })
  const itemHeader = JSON.stringify({ type: 'event' })
  const itemPayload = JSON.stringify({
    event_id: eventId,
    timestamp,
    platform: 'javascript',
    level: 'error',
    exception: {
      values: [{
        type: err instanceof Error ? err.name : 'Error',
        value: message,
        stacktrace: stack ? { frames: [{ filename: 'client', function: stack.split('\n')[0] }] } : undefined,
      }],
    },
    request: { url: window.location.href, headers: { 'User-Agent': navigator.userAgent } },
    tags: { release: 'alexandria@beta' },
    extra: context,
  })
  const body = `${header}\n${itemHeader}\n${itemPayload}\n`

  const url = `https://${dsn.host}/api/${dsn.projectId}/envelope/?sentry_key=${dsn.publicKey}&sentry_version=7`

  try {
    await fetch(url, { method: 'POST', body, keepalive: true })
  } catch {
    // Telemetry must never throw.
  }
}

export function captureException(err: unknown, context: Record<string, unknown> = {}): void {
  if (import.meta.env.DEV) {
    console.error('[telemetry]', err, context)
  }
  void sendToSentry(err, context)
}
