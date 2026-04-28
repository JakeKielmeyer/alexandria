import React, { useState } from 'react'
import GateShell from '../components/GateShell'
import GateLogo from '../components/GateLogo'

interface PasswordProps {
  onClear: () => void
  storyId: string
  passwordHash: string | null
  storyTitle: string
  creatorName: string
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export default function Password({ onClear, passwordHash, storyTitle, creatorName }: PasswordProps): React.JSX.Element {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!value) {
      setError('Enter a password.')
      return
    }
    if (!passwordHash) {
      // No hash set on the story — accept any non-empty value (backend enforcement pending).
      onClear()
      return
    }
    setChecking(true)
    setError(null)
    try {
      const hex = await sha256Hex(value)
      if (hex === passwordHash.trim().toLowerCase()) {
        onClear()
      } else {
        setError('Incorrect password.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify password.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <GateShell>
      <GateLogo />

      <div style={{
        width: '52px', height: '52px',
        borderRadius: '50%',
        border: '1.5px solid rgba(201,48,96,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 18px',
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <rect x="4" y="10" width="14" height="10" rx="2" stroke="#C93060" strokeWidth="1.5"/>
          <path d="M7 10V7a4 4 0 018 0v3" stroke="#C93060" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="11" cy="15" r="1.5" fill="#C93060"/>
        </svg>
      </div>

      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '11px', fontWeight: 500, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: '#DC5A8A', marginBottom: '10px',
      }}>Private Story</div>

      <div style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: '26px', lineHeight: 1.15, color: '#F5EEE8', marginBottom: '6px',
      }}>{storyTitle}</div>

      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '12px', color: 'rgba(245,238,232,0.55)', marginBottom: '28px',
      }}>by {creatorName}</div>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ width: '100%', maxWidth: 360, margin: '0 auto' }}>
        <label
          htmlFor="story-password"
          style={{
            background: 'rgba(245,238,232,0.06)',
            border: error ? '1px solid rgba(220,90,138,0.8)' : '1px solid rgba(245,238,232,0.12)',
            borderRadius: '8px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '12px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="rgba(245,238,232,0.45)" strokeWidth="1.2"/>
            <path d="M5 7V5a3 3 0 016 0v2" stroke="rgba(245,238,232,0.45)" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input
            id="story-password"
            type="password"
            autoComplete="current-password"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(null) }}
            placeholder="Enter password"
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#F5EEE8',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '14px',
              minWidth: 0,
            }}
          />
        </label>

        {error && (
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '12px', color: '#DC5A8A', marginBottom: '10px', textAlign: 'center',
          }} role="alert">{error}</div>
        )}

        <button
          type="submit"
          disabled={checking}
          style={{
            background: '#C93060', color: '#F5EEE8',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px', fontWeight: 500,
            padding: '14px 0', borderRadius: '8px', width: '100%',
            marginBottom: '18px', border: 'none',
            cursor: checking ? 'wait' : 'pointer',
            opacity: checking ? 0.7 : 1,
          }}
        >{checking ? 'Checking…' : 'Unlock Story'}</button>
      </form>

      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '12px', color: 'rgba(245,238,232,0.4)', lineHeight: 1.65,
      }}>Password provided by the creator.<br/>Check their Patreon or Discord.</div>

      <div style={{
        marginTop: '28px',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '10px', color: 'rgba(245,238,232,0.25)', letterSpacing: '0.06em',
      }}>Alexandria · Visual Storytelling</div>
    </GateShell>
  )
}
