import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { motion } from 'framer-motion'
import { useReaderStore } from '../../store/readerStore'
import { usePageTurn } from './usePageTurn'
import BookScene from './BookScene'
import PanelLayers from '../reader/PanelLayers'
import Navbar from '../Navbar'
import { BOOK_PAGE_WIDTH, BOOK_PAGE_HEIGHT, BOOK_SPREAD_WIDTH } from '../../types'
import type { PanelWithMeta } from '../../hooks/useReaderData'
import type { StoryWithCreator, Layer } from '../../types'

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

  // Container size tracking for CSS overlay positioning
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setContainerSize({ w: rect.width, h: rect.height })
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect
      setContainerSize({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const isRTL = story.reading_direction === 'rtl'
  const evenPanel = spreadIndex > 0 ? (panels[(spreadIndex - 1) * 2]     ?? null) : null
  const oddPanel  = spreadIndex > 0 ? (panels[(spreadIndex - 1) * 2 + 1] ?? null) : null
  const leftPanel  = isRTL ? oddPanel  : evenPanel
  const rightPanel = isRTL ? evenPanel : oddPanel

  const spreadLayers: Layer[] = [
    ...(leftPanel?.layers.filter(l => l.is_spread_layer) ?? []),
    ...(rightPanel?.layers.filter(l => l.is_spread_layer) ?? []),
  ].sort((a, b) => a.position - b.position)

  // Scale + screen-space page positions (same formula as BookScene)
  const { w: cw, h: ch } = containerSize
  const contentWidth = spreadIndex === 0 ? BOOK_PAGE_WIDTH : BOOK_SPREAD_WIDTH
  const scale = cw > 0 && ch > 0 ? Math.min(ch / BOOK_PAGE_HEIGHT, cw / contentWidth) * 0.93 : 0
  const cx = cw / 2
  const cy = ch / 2
  const pageW = BOOK_PAGE_WIDTH * scale
  const pageH = BOOK_PAGE_HEIGHT * scale

  const navLabel = `${spreadIndex} / ${totalSpreads}`

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
      <div ref={containerRef} style={{ flex: 1, position: 'relative' }}>
        <Canvas
          orthographic
          camera={{ position: [0, 0, 10], zoom: 1, near: 0.1, far: 1000 }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <BookScene
            story={story}
            spreadIndex={spreadIndex}
            onClickLeft={goPrev}
            onClickRight={goNext}
          />
        </Canvas>

        {/* Layer overlay — rendered in screen space outside R3F, same scale formula as BookScene */}
        {scale > 0 && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {/* Left page */}
            <motion.div
              key={leftPanel?.panelId ?? 'left-empty'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              style={{
                position: 'absolute',
                left: cx - pageW,
                top: cy - pageH / 2,
                width: BOOK_PAGE_WIDTH,
                height: BOOK_PAGE_HEIGHT,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                overflow: 'hidden',
              }}
            >
              {leftPanel && (
                <PanelLayers
                  layers={leftPanel.layers.filter(l => !l.is_spread_layer)}
                  videoSfxEnabled={videoSfxEnabled}
                  musicEnabled={musicEnabled}
                  videoVolume={videoVolume}
                />
              )}
            </motion.div>

            {/* Right page */}
            <motion.div
              key={rightPanel?.panelId ?? 'right-empty'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              style={{
                position: 'absolute',
                left: cx,
                top: cy - pageH / 2,
                width: BOOK_PAGE_WIDTH,
                height: BOOK_PAGE_HEIGHT,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                overflow: 'hidden',
              }}
            >
              {rightPanel && (
                <PanelLayers
                  layers={rightPanel.layers.filter(l => !l.is_spread_layer)}
                  videoSfxEnabled={videoSfxEnabled}
                  musicEnabled={musicEnabled}
                  videoVolume={videoVolume}
                />
              )}
            </motion.div>

            {/* Spread layers — spans both pages */}
            {spreadLayers.length > 0 && (
              <motion.div
                key={`spread-${spreadIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                style={{
                  position: 'absolute',
                  left: cx - pageW,
                  top: cy - pageH / 2,
                  width: BOOK_SPREAD_WIDTH,
                  height: BOOK_PAGE_HEIGHT,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  overflow: 'hidden',
                }}
              >
                <PanelLayers
                  layers={spreadLayers}
                  videoSfxEnabled={videoSfxEnabled}
                  musicEnabled={musicEnabled}
                  videoVolume={videoVolume}
                />
              </motion.div>
            )}
          </div>
        )}
      </div>

      {!previewMode && (
        <Navbar
          label={navLabel}
          onPrev={goPrev}
          onNext={goNext}
          prevDisabled={spreadIndex <= 1}
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
