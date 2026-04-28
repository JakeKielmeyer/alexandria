import React from 'react'
import GateShell from '../components/GateShell'
import GateLogo from '../components/GateLogo'

export default function Decline(): React.JSX.Element {
  return (
    <GateShell>
      <GateLogo />

      <div style={{
        width: '56px', height: '56px',
        borderRadius: '50%',
        border: '1px solid rgba(245,238,232,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px'
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="3" width="12" height="18" rx="1.5" stroke="rgba(245,238,232,0.18)" strokeWidth="1.3"/>
          <path d="M10 3v18" stroke="rgba(245,238,232,0.12)" strokeWidth="1" strokeDasharray="2 2"/>
          <path d="M14 12h6M17 9l3 3-3 3" stroke="rgba(245,238,232,0.28)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="8.5" cy="12" r="0.9" fill="rgba(245,238,232,0.2)"/>
        </svg>
      </div>

      <div style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: '26px',
        lineHeight: 1.2,
        color: '#F5EEE8',
        marginBottom: '14px'
      }}>You've left the story</div>

      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '13px',
        lineHeight: 1.75,
        color: 'rgba(245,238,232,0.45)',
        marginBottom: '40px'
      }}>
        This content is restricted to readers who meet the age and consent requirements. You can close this tab or navigate away.
      </div>

      <div style={{
        width: '100%',
        height: '1px',
        background: 'rgba(245,238,232,0.07)',
        marginBottom: '28px'
      }} />

      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '11px',
        color: 'rgba(245,238,232,0.2)',
        letterSpacing: '0.08em',
        marginBottom: '18px'
      }}>Nothing to see here</div>

      <button disabled style={{
        background: 'transparent',
        border: '1px solid rgba(245,238,232,0.1)',
        color: 'rgba(245,238,232,0.22)',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '13px',
        padding: '13px 0',
        borderRadius: '8px',
        width: '100%',
        cursor: 'default',
        display: 'block',
        letterSpacing: '0.02em'
      }}>Close this tab</button>

      <div style={{
        marginTop: '32px',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '10px',
        color: 'rgba(245,238,232,0.15)',
        letterSpacing: '0.06em'
      }}>Alexandria · Visual Storytelling</div>
    </GateShell>
  )
}
