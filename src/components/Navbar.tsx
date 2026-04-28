import React, { useCallback } from 'react'

interface NavbarProps {
  label: string
  onPrev?: () => void
  onNext?: () => void
  onGrid?: () => void
  onToggleAudio?: () => void
  onFullscreen?: () => void
  onVolumeChange?: (volume: number) => void
  prevDisabled?: boolean
  nextDisabled?: boolean
  gridActive?: boolean
  audioEnabled?: boolean
  volume?: number
}

function IconButton({
  onClick, disabled, active, ariaLabel, children,
}: {
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  ariaLabel: string
  children: React.ReactNode
}): React.JSX.Element {
  const handleKeyDown = useCallback((e: React.KeyboardEvent): void => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }, [onClick, disabled])

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active ? true : undefined}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 4,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.25 : active ? 1 : 0.55,
        color: active ? '#C93060' : '#F5EEE8',
        transition: 'opacity 120ms',
      }}
    >
      {children}
    </button>
  )
}

export default function Navbar({
  label,
  onPrev, onNext, onGrid, onToggleAudio, onFullscreen, onVolumeChange,
  prevDisabled, nextDisabled, gridActive, audioEnabled, volume = 1,
}: NavbarProps): React.JSX.Element {
  return (
    <div
      role="toolbar"
      aria-label="Reader controls"
      style={{
        background: 'rgba(14,6,8,0.92)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      {/* Left cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <IconButton ariaLabel="Skip back to first panel" onClick={onPrev} disabled={prevDisabled}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M2 3.5l3.5 4L2 11.5V3.5zM7.5 3.5L11 7.5l-3.5 4V3.5z" fill="currentColor"/>
          </svg>
        </IconButton>
        <IconButton ariaLabel="Zoom">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="3.8" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M9.5 9.5l2.8 2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </IconButton>
        <IconButton ariaLabel="Toggle thumbnail grid" onClick={onGrid} active={gridActive}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="4.5" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
            <rect x="8.5" y="2" width="4.5" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
            <rect x="2" y="8.5" width="4.5" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
            <rect x="8.5" y="8.5" width="4.5" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </IconButton>
      </div>

      {/* Center */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <IconButton ariaLabel="Previous panel" onClick={onPrev} disabled={prevDisabled}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M10 3L5 7.5 10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </IconButton>
        <span style={{ fontSize: '10px', color: 'rgba(245,238,232,0.8)', minWidth: '42px', textAlign: 'center' }}>{label}</span>
        <IconButton ariaLabel="Next panel" onClick={onNext} disabled={nextDisabled}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M5 3l5 4.5L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </IconButton>
      </div>

      {/* Right cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <IconButton ariaLabel="Skip forward to last panel" onClick={onNext} disabled={nextDisabled}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M13 3.5l-3.5 4 3.5 4V3.5zM7.5 3.5L4 7.5l3.5 4V3.5z" fill="currentColor"/>
          </svg>
        </IconButton>

        <IconButton
          ariaLabel={audioEnabled ? 'Mute audio' : 'Enable audio'}
          onClick={onToggleAudio}
          active={audioEnabled}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M2 5.5h2l2.5-2.5v9L4 9.5H2V5.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            {audioEnabled && (
              <>
                <path d="M10.5 4c1 .7 1.8 2 1.8 2.8s-.8 2.1-1.8 2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M9 5.5c.5.4.9 1 .9 1.3s-.4.9-.9 1.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </>
            )}
            {!audioEnabled && (
              <path d="M9 5l4 4M13 5l-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            )}
          </svg>
        </IconButton>

        {/* Volume slider — only visible when audio is enabled */}
        {audioEnabled && onVolumeChange && (
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            aria-label="Volume"
            style={{
              width: '52px',
              accentColor: '#DC5A8A',
              cursor: 'pointer',
              verticalAlign: 'middle',
            }}
          />
        )}

        <IconButton ariaLabel="Toggle fullscreen" onClick={onFullscreen}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M3 3h9v9H3z" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M6 6h3v3H6z" fill="currentColor" opacity="0.6"/>
          </svg>
        </IconButton>
      </div>
    </div>
  )
}
