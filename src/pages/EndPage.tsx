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
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useGateStore } from '../store/gateStore'
import '../styles/reader.css'

const FALLBACK_END_IMAGE = 'https://pub-d0a4c9548d2149eb9259096fbf8a9dfe.r2.dev/Panel%202.jpg'

export default function EndPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { username, slug } = useParams<{ username: string; slug: string }>()
  const story = useGateStore(state => state.story)

  // Both handlers point at the reader route; Reader boots on the Cover
  // screen (screen state defaults to 'cover'), so "Exit" naturally lands
  // on this story's Cover — not the site root or dashboard.
  const restartPath = username && slug ? `/u/${username}/s/${slug}` : '/'
  const goHome = (): void => { navigate(restartPath) }

  if (!story) {
    return (
      <div className="reader-stage" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(245,238,232,0.45)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
          Story not found.
        </div>
      </div>
    )
  }

  const endImage = story.cover_url ?? FALLBACK_END_IMAGE

  return (
    <div className="reader-stage">
      <div className="reader-panel-slot">
        <div className="reader-panel-card reader-panel-card--end">
          <img src={endImage} alt="" className="cover-bg" />
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
              <button className="end-btn end-btn--ghost" onClick={goHome}>
                Restart
              </button>
              <button className="end-btn end-btn--primary" onClick={goHome}>
                Exit
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="reader-navbar-fixed">
        <Navbar
          label="The End"
          onPrev={goHome}
          onNext={() => {}}
          nextDisabled
        />
      </div>
    </div>
  )
}
