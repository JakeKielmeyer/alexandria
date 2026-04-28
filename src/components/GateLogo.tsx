import React from 'react'

export default function GateLogo(): React.JSX.Element {
  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: '7px',
        marginBottom: '12px'
      }}>
        <svg width="16" height="32" viewBox="0 0 20 40" fill="none">
          <rect x="1" y="27" width="18" height="13" rx="1" fill="#C93060"/>
          <rect x="3.5" y="17" width="13" height="11" rx="1" fill="#DC5A8A"/>
          <rect x="6" y="9" width="8" height="9" rx="1" fill="#E87FAA"/>
          <rect x="8" y="3" width="4" height="7" rx="1" fill="#F5EEE8" opacity="0.9"/>
          <polygon points="10,0 8.5,3 11.5,3" fill="#F5EEE8"/>
          <circle cx="10" cy="0.8" r="1.2" fill="#DC5A8A"/>
        </svg>
        <span style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '18px',
          color: '#F5EEE8',
          letterSpacing: '0.1em',
          lineHeight: 1,
          paddingBottom: '1px'
        }}>Alexandria</span>
      </div>

      {/* Rose rule */}
      <div style={{
        width: '32px', height: '2px',
        background: '#DC5A8A',
        borderRadius: '1px',
        margin: '0 auto 24px'
      }} />
    </>
  )
}
