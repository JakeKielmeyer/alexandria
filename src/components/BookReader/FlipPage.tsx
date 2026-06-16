import React from 'react'
import PanelLayers from '../reader/PanelLayers'
import type { Layer } from '../../types'

interface FlipPageProps {
  layers?: Layer[]
  coverUrl?: string | null
  isCover?: boolean
  isBack?: boolean
  pageStyle?: 'paper' | 'hardback'
  videoSfxEnabled: boolean
  musicEnabled: boolean
  videoVolume: number
  isMobile?: boolean
  isFreezing?: boolean
  spreadSide?: 'left' | 'right'
}

// StPageFlip requires forwardRef on page children (it passes refs via cloneElement).
// React.memo prevents re-renders during flips when only non-visual props cycle.
const FlipPage = React.memo(
  React.forwardRef<HTMLDivElement, FlipPageProps>(function FlipPage(
    {
      layers = [],
      coverUrl,
      isCover = false,
      isBack = false,
      pageStyle = 'hardback',
      videoSfxEnabled,
      musicEnabled,
      videoVolume,
      isMobile = false,
      isFreezing = false,
      spreadSide,
    },
    ref
  ) {
    // Interior pages are always warm off-white regardless of cover style.
    // Cover pages keep the image; if no image, use a dark fallback.
    const isCoverOrBack = isCover || isBack
    const bg = isCoverOrBack && !coverUrl
      ? (pageStyle === 'paper' ? '#d6ccbc' : '#1a1210')
      : '#f0ece4'

    return (
      <div
        ref={ref}
        data-density={isCoverOrBack && !isMobile ? 'hard' : 'soft'}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: bg,
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {isCoverOrBack ? (
          coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : null
        ) : (
          <PanelLayers
            layers={layers}
            videoSfxEnabled={videoSfxEnabled}
            musicEnabled={musicEnabled}
            videoVolume={videoVolume}
            isMobile={isMobile}
            isFreezing={isFreezing}
            spreadSide={spreadSide}
          />
        )}
      </div>
    )
  })
)

FlipPage.displayName = 'FlipPage'

export default FlipPage
export type { FlipPageProps }
