import React from 'react'
import GateShell from '../components/GateShell'
import GateLogo from '../components/GateLogo'

interface ExplicitConsentProps {
  onClear: () => void
  onBack: () => void
}

export default function ExplicitConsent({ onClear, onBack }: ExplicitConsentProps): React.JSX.Element {
  return (
    <GateShell>
      <GateLogo />

      <div style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: '26px',
        lineHeight: 1.2,
        color: '#F5EEE8',
        marginBottom: '14px'
      }}>Explicit content ahead</div>

      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '13px',
        lineHeight: 1.75,
        color: 'rgba(245,238,232,0.62)',
        marginBottom: '32px'
      }}>
        The story you are about to view contains explicit sexual content intended for adults only. This content is illustrated fiction and is not suitable for minors. By continuing you confirm you are 18 or older and choosing to view this material.
      </div>

      <div style={{ width: '100%' }}>
        <button onClick={onClear} style={{
          background: '#C93060',
          color: '#F5EEE8',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '13px',
          fontWeight: 500,
          padding: '15px 0',
          borderRadius: '8px',
          width: '100%',
          marginBottom: '10px',
          border: 'none',
          cursor: 'pointer',
          display: 'block'
        }}>I understand — Continue</button>

        <button onClick={onBack} style={{
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
        }}>Go Back</button>
      </div>

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
