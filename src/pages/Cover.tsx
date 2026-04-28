import React from 'react'
import Navbar from '../components/Navbar'
import type { StoryWithCreator } from '../types'
import '../styles/reader.css'

const FALLBACK_COVER = 'https://pub-d0a4c9548d2149eb9259096fbf8a9dfe.r2.dev/Cover%20Image.jpg'

interface CoverProps {
  onEnter: () => void
  story: StoryWithCreator
  onFullscreen?: () => void
  audioEnabled?: boolean
  onToggleAudio?: () => void
  previewMode?: boolean
  onExitPreview?: () => void
}

// Cover renders as a single book-page card inside .reader-stage — same
// footprint as a reader panel — so the transition from cover → first panel
// feels continuous. Tapping the card (or the Navbar next arrow) enters.
export default function Cover({
  onEnter,
  story,
  onFullscreen,
  audioEnabled,
  onToggleAudio,
  previewMode,
  onExitPreview,
}: CoverProps): React.JSX.Element {
  const coverImage = story.cover_url ?? FALLBACK_COVER
  const creatorName = story.display_name ?? story.username

  return (
    <div className="reader-stage">
      <div className="reader-panel-slot">
        <button
          type="button"
          onClick={onEnter}
          aria-label={`Enter ${story.title}`}
          className="reader-panel-card reader-panel-card--cover"
        >
          <img src={coverImage} alt="" className="cover-bg" />
          <div className="cover-gradient" />

          <div className="cover-branding" aria-hidden="true">
            <svg width="8" height="16" viewBox="0 0 20 40" fill="none">
              <rect x="1" y="27" width="18" height="13" rx="1" fill="#C93060" />
              <rect x="3.5" y="17" width="13" height="11" rx="1" fill="#DC5A8A" />
              <rect x="6" y="9" width="8" height="9" rx="1" fill="#E87FAA" />
              <rect x="8" y="3" width="4" height="7" rx="1" fill="#F5EEE8" opacity="0.9" />
              <polygon points="10,0 8.5,3 11.5,3" fill="#F5EEE8" />
              <circle cx="10" cy="0.8" r="1.2" fill="#DC5A8A" />
            </svg>
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '10px',
                color: 'rgba(245,238,232,0.85)',
                letterSpacing: '0.08em',
                lineHeight: 1,
                paddingBottom: '1px',
              }}
            >
              Alexandria
            </span>
          </div>

          <div className="cover-content">
            <div className="cover-eyebrow">{creatorName}</div>
            <h1 className="cover-title">{story.title}</h1>
            <div className="cover-cue">
              <span>Tap to begin</span>
              <svg width="12" height="12" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <path
                  d="M11 18V4M11 18l-5-5M11 18l5-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </button>
      </div>

      <div className="reader-navbar-fixed">
        <Navbar
          label="Cover"
          onNext={onEnter}
          prevDisabled
          onFullscreen={onFullscreen}
          audioEnabled={audioEnabled}
          onToggleAudio={onToggleAudio}
        />
      </div>

      {previewMode && (
        <button
          type="button"
          onClick={onExitPreview}
          className="reader-exit-preview"
          aria-label="Exit preview"
        >
          Exit Preview ×
        </button>
      )}
    </div>
  )
}
