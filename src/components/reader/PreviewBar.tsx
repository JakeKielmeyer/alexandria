import React from 'react'

export type PreviewScreenSize = 'desktop' | 'tablet-h' | 'tablet-v' | 'phone-h' | 'phone-v'

export interface PreviewSizeConfig {
  id: PreviewScreenSize
  label: string
  w: number | null
  h: number | null
}

export const PREVIEW_SIZES: PreviewSizeConfig[] = [
  { id: 'desktop',  label: 'Desktop',  w: null, h: null },
  { id: 'tablet-h', label: 'Tablet ↔', w: 1024, h: 768  },
  { id: 'tablet-v', label: 'Tablet ↕', w: 768,  h: 1024 },
  { id: 'phone-h',  label: 'Phone ↔',  w: 844,  h: 390  },
  { id: 'phone-v',  label: 'Phone ↕',  w: 390,  h: 844  },
]

interface PreviewBarProps {
  screenSize: PreviewScreenSize
  onScreenSizeChange: (size: PreviewScreenSize) => void
  musicEnabled: boolean
  onToggleMusic: () => void
  onExit: () => void
}

function DesktopIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1" y="1.5" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 12.5h4M7 9.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function TabletHIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="0.5" y="3.5" width="13" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="12" cy="7" r="0.8" fill="currentColor"/>
    </svg>
  )
}

function TabletVIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="3.5" y="0.5" width="7" height="13" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="7" cy="11.5" r="0.8" fill="currentColor"/>
    </svg>
  )
}

function PhoneHIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="0.5" y="4" width="13" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="12" cy="7" r="0.7" fill="currentColor"/>
    </svg>
  )
}

function PhoneVIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="4" y="0.5" width="6" height="13" rx="1.2" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="7" cy="12" r="0.7" fill="currentColor"/>
    </svg>
  )
}

const SIZE_ICONS: Record<PreviewScreenSize, () => React.JSX.Element> = {
  'desktop':  DesktopIcon,
  'tablet-h': TabletHIcon,
  'tablet-v': TabletVIcon,
  'phone-h':  PhoneHIcon,
  'phone-v':  PhoneVIcon,
}

function AudioOnIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 6H1v4h2l4 3V3L3 6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M10.5 5.5a3 3 0 010 5M12.5 3.5a6 6 0 010 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function AudioOffIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 6H1v4h2l4 3V3L3 6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M11 6l3 4M14 6l-3 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

export default function PreviewBar({
  screenSize,
  onScreenSizeChange,
  musicEnabled,
  onToggleMusic,
  onExit,
}: PreviewBarProps): React.JSX.Element {
  return (
    <div className="reader-preview-bar">
      <div className="reader-preview-bar__sizes">
        {PREVIEW_SIZES.map((size) => {
          const Icon = SIZE_ICONS[size.id]
          return (
            <button
              key={size.id}
              type="button"
              className={`reader-preview-bar__size-btn${screenSize === size.id ? ' is-active' : ''}`}
              onClick={() => onScreenSizeChange(size.id)}
              aria-label={size.label}
              aria-pressed={screenSize === size.id}
            >
              <Icon />
              {size.label}
            </button>
          )
        })}
      </div>

      <div className="reader-preview-bar__controls">
        <button
          type="button"
          className={`reader-preview-bar__audio-btn${musicEnabled ? ' is-active' : ''}`}
          onClick={onToggleMusic}
          aria-label={musicEnabled ? 'Mute audio' : 'Unmute audio'}
          title={musicEnabled ? 'Mute audio' : 'Enable audio'}
        >
          {musicEnabled ? <AudioOnIcon /> : <AudioOffIcon />}
        </button>

        <button
          type="button"
          onClick={onExit}
          className="reader-exit-preview"
          style={{ position: 'static', transform: 'none' }}
          aria-label="Exit preview"
        >
          Exit Preview ×
        </button>
      </div>
    </div>
  )
}
