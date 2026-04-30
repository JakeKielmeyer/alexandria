import React from 'react'
import { useToastStore, type Toast as ToastT } from '../store/toastStore'

// Color tokens match the inline styles used throughout the auth + editor
// surfaces. Keeping them inline (vs CSS vars) so the host has no required
// stylesheet — the toast container is mounted once at the App root and
// must work on every page including the reader/legal pages.
const COLORS = {
  rose: '#C93060',
  green: '#3DAA70',
  ivory: '#F5EEE8',
  bgBase: 'rgba(14,6,8,0.92)',
  borderRose: 'rgba(201,48,96,0.45)',
  borderGreen: 'rgba(61,170,112,0.45)',
  borderInfo: 'rgba(245,238,232,0.18)',
} as const

function colorsFor(kind: ToastT['kind']): { border: string; text: string } {
  if (kind === 'error') return { border: COLORS.borderRose, text: COLORS.rose }
  if (kind === 'success') return { border: COLORS.borderGreen, text: COLORS.green }
  return { border: COLORS.borderInfo, text: COLORS.ivory }
}

export default function ToastStack(): React.JSX.Element | null {
  const toasts = useToastStore((s) => s.toasts)
  const dismissToast = useToastStore((s) => s.dismissToast)

  if (toasts.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 9999,
        pointerEvents: 'none',
        maxWidth: 'min(90vw, 360px)',
      }}
    >
      {toasts.map((t) => {
        const { border, text } = colorsFor(t.kind)
        return (
          <div
            key={t.id}
            style={{
              pointerEvents: 'auto',
              background: COLORS.bgBase,
              border: `1px solid ${border}`,
              borderRadius: 8,
              padding: '12px 14px',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: text,
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              backdropFilter: 'blur(6px)',
            }}
          >
            <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(245,238,232,0.55)',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                padding: 0,
                marginTop: 1,
              }}
            >×</button>
          </div>
        )
      })}
    </div>
  )
}
