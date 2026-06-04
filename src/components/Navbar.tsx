import React, { useCallback } from 'react'
import { useIdleHide } from '../hooks/useIdleHide'

interface NavbarProps {
  label: string
  onClose?: () => void
  onGrid?: () => void
  onToggleAudio?: () => void
  onFullscreen?: () => void
  audioEnabled?: boolean
  gridActive?: boolean
}

function IconButton({
  onClick, active, ariaLabel, children,
}: {
  onClick?: () => void
  active?: boolean
  ariaLabel: string
  children: React.ReactNode
}): React.JSX.Element {
  const handleKeyDown = useCallback((e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }, [onClick])

  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      aria-pressed={active ? true : undefined}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        opacity: active ? 1 : 0.55,
        color: active ? '#C93060' : '#F5EEE8',
        transition: 'opacity 120ms',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

export default function Navbar({
  label,
  onClose,
  onGrid,
  onToggleAudio,
  onFullscreen,
  audioEnabled,
  gridActive,
}: NavbarProps): React.JSX.Element {
  const { visible } = useIdleHide(3000)

  return (
    <div
      role="toolbar"
      aria-label="Reader controls"
      className={`reader-control-bar${visible ? '' : ' reader-control-bar--hidden'}`}
    >
      {/* Close */}
      <IconButton ariaLabel="Close reader" onClick={onClose}>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </IconButton>

      {/* Grid */}
      <IconButton ariaLabel="Toggle thumbnail grid" onClick={onGrid} active={gridActive}>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="4.5" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="8.5" y="2" width="4.5" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="2" y="8.5" width="4.5" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="8.5" y="8.5" width="4.5" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      </IconButton>

      {/* Counter — bordered on both sides */}
      <span
        style={{
          borderLeft: '1px solid rgba(245,238,232,0.15)',
          borderRight: '1px solid rgba(245,238,232,0.15)',
          padding: '0 10px',
          fontSize: '11px',
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
          letterSpacing: '0.04em',
          color: 'rgba(245,238,232,0.9)',
          whiteSpace: 'nowrap',
          margin: '0 2px',
        }}
      >
        {label}
      </span>

      {/* Sound */}
      <IconButton
        ariaLabel={audioEnabled ? 'Mute audio' : 'Enable audio'}
        onClick={onToggleAudio}
        active={audioEnabled}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <path d="M2 5.5h2l2.5-2.5v9L4 9.5H2V5.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          {audioEnabled ? (
            <>
              <path d="M10.5 4c1 .7 1.8 2 1.8 2.8s-.8 2.1-1.8 2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M9 5.5c.5.4.9 1 .9 1.3s-.4.9-.9 1.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </>
          ) : (
            <path d="M9 5l4 4M13 5l-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          )}
        </svg>
      </IconButton>

      {/* Fullscreen */}
      <IconButton ariaLabel="Toggle fullscreen" onClick={onFullscreen}>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <path d="M2 2h4M2 2v4M13 2h-4M13 2v4M2 13h4M2 13v-4M13 13h-4M13 13v-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </IconButton>
    </div>
  )
}
