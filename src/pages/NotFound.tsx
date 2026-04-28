// Inline styles used for consistency with existing gate pages. Refactor deferred.
import React from 'react'
import { useNavigate } from 'react-router-dom'
import GateShell from '../components/GateShell'
import GateLogo from '../components/GateLogo'

export default function NotFound(): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <GateShell>
      <GateLogo />

      <div style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: '26px',
        lineHeight: 1.2,
        color: '#F5EEE8',
        marginBottom: '14px'
      }}>Page not found</div>

      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '13px',
        lineHeight: 1.75,
        color: 'rgba(245,238,232,0.45)',
        marginBottom: '32px'
      }}>
        The link you followed doesn't exist or has been removed.
      </div>

      <button
        onClick={() => navigate('/')}
        style={{
          background: 'transparent',
          border: '1px solid rgba(245,238,232,0.18)',
          color: 'rgba(245,238,232,0.45)',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '13px',
          padding: '13px 0',
          borderRadius: '8px',
          width: '100%',
          cursor: 'pointer',
          display: 'block'
        }}
      >Go home</button>

      <div style={{
        marginTop: '32px',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '10px',
        color: 'rgba(245,238,232,0.2)',
        letterSpacing: '0.06em'
      }}>Alexandria · Visual Storytelling</div>
    </GateShell>
  )
}
