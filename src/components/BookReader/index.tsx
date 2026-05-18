import React, { useCallback, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { useReaderStore } from '../../store/readerStore'
import { usePageTurn } from './usePageTurn'
import BookScene from './BookScene'
import Navbar from '../Navbar'
import type { PanelWithMeta } from '../../hooks/useReaderData'
import type { StoryWithCreator } from '../../types'

interface BookReaderProps {
  story: StoryWithCreator
  panels: PanelWithMeta[]
  previewMode: boolean
  onReachEnd: () => void
}

export default function BookReader({
  story,
  panels,
  previewMode,
  onReachEnd,
}: BookReaderProps): React.JSX.Element {
  const videoSfxEnabled = useReaderStore(s => s.videoSfxEnabled)
  const toggleVideoSfx = useReaderStore(s => s.toggleVideoSfx)
  const musicEnabled = useReaderStore(s => s.musicEnabled)
  const videoVolume = useReaderStore(s => s.videoVolume)
  const setVideoVolume = useReaderStore(s => s.setVideoVolume)

  const totalSpreads = Math.ceil(panels.length / 2)
  const { spreadIndex, goNext, goPrev } = usePageTurn(totalSpreads, onReachEnd)

  const navLabel = spreadIndex === 0
    ? story.title
    : `${spreadIndex} / ${totalSpreads}`

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev])

  const handleFullscreen = useCallback((): void => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen().catch(() => { /* noop */ })
    }
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0E0608', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas
          orthographic
          camera={{ position: [0, 0, 10], zoom: 1, near: 0.1, far: 1000 }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <BookScene
            story={story}
            panels={panels}
            spreadIndex={spreadIndex}
            onOpenCover={goNext}
            onClickLeft={goPrev}
            onClickRight={goNext}
            videoSfxEnabled={videoSfxEnabled}
            musicEnabled={musicEnabled}
            videoVolume={videoVolume}
          />
        </Canvas>
      </div>

      {!previewMode && (
        <Navbar
          label={navLabel}
          onPrev={goPrev}
          onNext={goNext}
          prevDisabled={spreadIndex === 0}
          nextDisabled={false}
          audioEnabled={videoSfxEnabled}
          onToggleAudio={toggleVideoSfx}
          volume={videoVolume}
          onVolumeChange={setVideoVolume}
          onFullscreen={handleFullscreen}
        />
      )}
    </div>
  )
}
