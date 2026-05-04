import React from 'react'
import GateShell from '../components/GateShell'
import GateLogo from '../components/GateLogo'
import { useReaderStore } from '../store/readerStore'
import { supabase } from '../lib/supabase'

interface InterstitialProps {
  onClear: () => void
  storyId: string
  storyTitle: string
  creatorName: string
}

export default function Interstitial({ onClear, storyId, storyTitle, creatorName }: InterstitialProps): React.JSX.Element {
  const videoSfx = useReaderStore((s) => s.videoSfxEnabled)
  const music = useReaderStore((s) => s.musicEnabled)
  const setVideoSfx = useReaderStore((s) => s.setVideoSfx)
  const setMusic = useReaderStore((s) => s.setMusic)

  const handleEnter = (): void => {
    // Fire-and-forget atomic increment — reader isn't blocked by this.
    void supabase.rpc('increment_story_read_count', { story_id: storyId })
    onClear()
  }

  return (
    <GateShell>
      <GateLogo />

      <div style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: '24px',
        lineHeight: 1.2,
        color: '#F5EEE8',
        marginBottom: '8px'
      }}>{storyTitle}</div>

      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '10px',
        color: 'rgba(245,238,232,0.58)',
        marginBottom: '32px'
      }}>by {creatorName}</div>

      <div style={{ width: '100%', marginBottom: '26px' }}>

        {/* Video & SFX row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 6.5h2l3-3v11l-3-3H3V6.5z" stroke="#DC5A8A" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M13 5.5c1.5 1 2.5 2.5 2.5 3.5s-1 2.5-2.5 3.5" stroke="#DC5A8A" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M11 7c.8.6 1.3 1.3 1.3 2s-.5 1.4-1.3 2" stroke="#DC5A8A" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'rgba(245,238,232,0.65)' }}>Video & SFX</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '9px', color: 'rgba(245,238,232,0.32)', marginTop: '2px' }}>Includes ambient & background</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div
              onClick={() => setVideoSfx(!videoSfx)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  setVideoSfx(!videoSfx)
                }
              }}
              role="switch"
              aria-checked={videoSfx}
              aria-label="Toggle video and sound effects"
              tabIndex={0}
              style={{
                width: '34px', height: '20px',
                borderRadius: '10px',
                background: videoSfx ? '#C93060' : 'rgba(245,238,232,0.1)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '3px',
                left: videoSfx ? '17px' : '3px',
                width: '14px', height: '14px',
                borderRadius: '50%',
                background: videoSfx ? '#F5EEE8' : 'rgba(245,238,232,0.28)',
                transition: 'left 0.2s'
              }} />
            </div>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '9px', color: 'rgba(245,238,232,0.28)' }}>
              {videoSfx ? 'On' : 'Off'}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '0.5px', background: 'rgba(245,238,232,0.09)', marginBottom: '14px' }} />

        {/* Music row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 14V5l8-2v9" stroke="#DC5A8A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="5" cy="14" r="2" stroke="#DC5A8A" strokeWidth="1.4"/>
              <circle cx="13" cy="12" r="2" stroke="#DC5A8A" strokeWidth="1.4"/>
            </svg>
            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'rgba(245,238,232,0.65)' }}>Sound</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '9px', color: 'rgba(245,238,232,0.32)', marginTop: '2px' }}>Background music & composed</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div
              onClick={() => setMusic(!music)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  setMusic(!music)
                }
              }}
              role="switch"
              aria-checked={music}
              aria-label="Toggle sound"
              tabIndex={0}
              style={{
                width: '34px', height: '20px',
                borderRadius: '10px',
                background: music ? '#C93060' : 'rgba(245,238,232,0.1)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '3px',
                left: music ? '17px' : '3px',
                width: '14px', height: '14px',
                borderRadius: '50%',
                background: music ? '#F5EEE8' : 'rgba(245,238,232,0.28)',
                transition: 'left 0.2s'
              }} />
            </div>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '9px', color: 'rgba(245,238,232,0.28)' }}>
              {music ? 'On' : 'Off'}
            </span>
          </div>
        </div>
      </div>

      <button onClick={handleEnter} style={{
        background: '#C93060',
        color: '#F5EEE8',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '13px',
        fontWeight: 500,
        padding: '15px 0',
        borderRadius: '8px',
        width: '100%',
        marginBottom: '22px',
        border: 'none',
        cursor: 'pointer',
        display: 'block'
      }}>Enter Story</button>

      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '10px',
        color: 'rgba(245,238,232,0.2)',
        letterSpacing: '0.05em'
      }}>Alexandria · Visual Storytelling</div>
    </GateShell>
  )
}
