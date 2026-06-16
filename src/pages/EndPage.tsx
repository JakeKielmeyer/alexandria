// src/pages/EndPage.tsx
//
// End page is a single book-page card that sits in the same `.reader-stage`
// footprint as the Cover and every panel (35vw × 95vh desktop, full-width
// on mobile). That keeps the "book page" language consistent through the
// entire read — cover → panels → end. No PhoneShell, no inline flex
// container; all sizing comes from `.reader-panel-slot` / `.reader-panel-card`.
//
// Exit + Restart both return the reader to THIS story's Cover. Per product
// direction, Exit should not kick the viewer to the site root or dashboard.
// The two buttons are functionally identical but kept separate because they
// communicate different intent (start over vs. leave the story).
import React from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import Navbar from '../components/Navbar'
import { useGateStore } from '../store/gateStore'
import '../styles/reader.css'

const FALLBACK_END_IMAGE = 'https://pub-d0a4c9548d2149eb9259096fbf8a9dfe.r2.dev/Panel%202.jpg'

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm)(\?.*)?$/i.test(url)
}

export default function EndPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { username, slug } = useParams<{ username: string; slug: string }>()
  const [searchParams] = useSearchParams()
  const previewMode = searchParams.get('preview') === '1'
  const story = useGateStore(state => state.story)
  const reduce = useReducedMotion()

  // In published mode both handlers return to the story's Cover (Reader boots
  // on `screen === 'cover'`). In preview mode the creator wants to land back
  // in the editor, so Exit jumps there directly. Restart still re-enters the
  // story but keeps the preview flag so the same loop is reproducible.
  const restartPath = username && slug
    ? `/u/${username}/s/${slug}${previewMode ? '?preview=1' : ''}`
    : '/'
  const exitPath = previewMode && story
    ? `/editor/${story.id}`
    : restartPath
  const goRestart = (): void => { navigate(restartPath) }
  const goExit = (): void => { navigate(exitPath) }

  if (!story) {
    return (
      <div className="reader-stage" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(245,238,232,0.45)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
          Story not found.
        </div>
      </div>
    )
  }

  const endImage = story.back_cover_url ?? story.cover_url ?? FALLBACK_END_IMAGE

  // Mirror the story's transition_style for the back-cover entrance.
  // Stacked → 3D rise + scale + rotate (matches CinematicPanelItem's intro).
  // Fade   → simple opacity fade-in.
  // Cut    → no animation.
  // Reduce-motion users always get the fade.
  const transitionStyle = story.transition_style ?? 'stacked'
  const transitionDurationMs = story.transition_duration_ms ?? 600
  const transitionDurationS = transitionDurationMs / 1000

  const useStacked = !reduce && transitionStyle === 'stacked'
  const useFade = reduce || transitionStyle === 'fade' || transitionStyle === 'cut'

  const cardInitial = useStacked
    ? { scale: 0.55, y: 180, rotateX: -60, opacity: 0 }
    : { opacity: 0 }
  const cardAnimate = useStacked
    ? {
        scale: 1, y: 0, rotateX: 0, opacity: 1,
        transition: { duration: transitionDurationS, ease: [0.22, 1, 0.36, 1] as const },
      }
    : {
        opacity: 1,
        transition: { duration: useFade ? transitionDurationS : 0, ease: 'easeOut' as const },
      }

  return (
    <div className="reader-stage">
      <div className="reader-panel-slot">
        <motion.div
          className="reader-panel-card reader-panel-card--end"
          initial={cardInitial}
          animate={cardAnimate}
          style={useStacked ? { transformStyle: 'preserve-3d', transformOrigin: 'center bottom' } : undefined}
        >
          {isVideoUrl(endImage)
            ? <video src={endImage} autoPlay muted loop playsInline className="cover-bg" />
            : <img src={endImage} alt="" className="cover-bg" />
          }
          <div className="cover-gradient" />

          <div className="end-content">
            <div className="cover-eyebrow">The End</div>
            <h1 className="cover-title">{story.title}</h1>

            <div className="end-divider" />

            <div className="cover-eyebrow">About the Creator</div>
            <p className="end-bio">{story.creator_bio ?? ''}</p>

            {story.creator_links.length > 0 && (
              <div className="end-links">
                {story.creator_links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="end-link"
                  >
                    <span className="end-link-icon" aria-hidden="true" />
                    <span className="end-link-label">{link.label}</span>
                  </a>
                ))}
              </div>
            )}

            <div className="end-actions">
              <button className="end-btn end-btn--ghost" onClick={goRestart}>
                Restart
              </button>
              <button className="end-btn end-btn--primary" onClick={goExit}>
                {previewMode ? 'Exit Preview' : 'Exit'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="reader-navbar-fixed">
        <Navbar
          label="The End"
        />
      </div>
    </div>
  )
}
