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

  // ── Landscape navigation (1-based spread index) ─────────────────────────
  const totalSpreads = Math.ceil(panels.length / 2)
  const { spreadIndex, goNext, goPrev, setSpreadIndex } = usePageTurn(totalSpreads, onReachEnd)

  // ── Portrait navigation (0-based panel index) ───────────────────────────
  const [panelIndex, setPanelIndex] = useState(0)
  const onReachEndRef = useRef(onReachEnd)
  onReachEndRef.current = onReachEnd

  const goNextPanel = useCallback(() => {
    setPanelIndex(prev => {
      if (prev >= panels.length - 1) {
        Promise.resolve().then(() => onReachEndRef.current())
        return prev
      }
      return prev + 1
    })
  }, [panels.length])

  const goPrevPanel = useCallback(() => {
    setPanelIndex(prev => Math.max(0, prev - 1))
  }, [])

  // ── Container size tracking ──────────────────────────────────────────────
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

  const { w: cw, h: ch } = containerSize

  // Portrait when narrower than tall OR narrower than 768 px.
  const isMobile = cw > 0 && ch > 0 && (cw < ch || cw < 768)

  // ── Sync state when orientation changes ────────────────────────────────
  const wasMobileRef = useRef<boolean>(false)
  const spreadIndexRef = useRef(spreadIndex)
  spreadIndexRef.current = spreadIndex

  useEffect(() => {
    const prev = wasMobileRef.current
    if (isMobile && !prev) {
      // Landscape → portrait: show the left panel of the current spread.
      setPanelIndex((spreadIndexRef.current - 1) * 2)
    } else if (!isMobile && prev) {
      // Portrait → landscape: jump to the spread that contains the current panel.
      const targetSpread = Math.floor(panelIndex / 2) + 1
      setSpreadIndex(Math.min(targetSpread, totalSpreads))
    }
    wasMobileRef.current = isMobile
  // Only fires when isMobile flips — intentionally omit panelIndex/spreadIndex
  // from deps to avoid re-running on every nav step.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile])

  // ── RTL + panel selection ────────────────────────────────────────────────
  const isRTL = story.reading_direction === 'rtl'
  const evenPanel = spreadIndex > 0 ? (panels[(spreadIndex - 1) * 2]     ?? null) : null
  const oddPanel  = spreadIndex > 0 ? (panels[(spreadIndex - 1) * 2 + 1] ?? null) : null
  const leftPanel  = isRTL ? oddPanel  : evenPanel
  const rightPanel = isRTL ? evenPanel : oddPanel

  // Portrait: the active single panel.
  const portraitPanel = isMobile ? (panels[panelIndex] ?? null) : null

  const spreadLayers: Layer[] = [
    ...(leftPanel?.layers.filter(l => l.is_spread_layer)  ?? []),
    ...(rightPanel?.layers.filter(l => l.is_spread_layer) ?? []),
  ].sort((a, b) => a.position - b.position)

  // ── Scale + screen-space geometry ───────────────────────────────────────
  const landscapeScale = cw > 0 && ch > 0
    ? Math.min(ch / BOOK_PAGE_HEIGHT, cw / BOOK_SPREAD_WIDTH) * 0.93
    : 0
  const portraitScale = cw > 0 && ch > 0
    ? Math.min(ch / BOOK_PAGE_HEIGHT, cw / BOOK_PAGE_WIDTH) * 0.93
    : 0

  const cx = cw / 2
  const cy = ch / 2

  // Landscape page slot dimensions.
  const pageW = BOOK_PAGE_WIDTH  * landscapeScale
  const pageH = BOOK_PAGE_HEIGHT * landscapeScale

  // Portrait page slot dimensions.
  const portPageW = BOOK_PAGE_WIDTH  * portraitScale
  const portPageH = BOOK_PAGE_HEIGHT * portraitScale

  // ── Touch swipe ──────────────────────────────────────────────────────────
  const touchStartX = useRef<number | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (dx < -50) {
      if (isMobile) goNextPanel(); else goNext()
    } else if (dx > 50) {
      if (isMobile) goPrevPanel(); else goPrev()
    }
  }, [isMobile, goNextPanel, goNext, goPrevPanel, goPrev])

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        if (isMobile) goNextPanel(); else goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (isMobile) goPrevPanel(); else goPrev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, goNextPanel, goPrevPanel, isMobile])

  // ── Fullscreen ───────────────────────────────────────────────────────────
  const handleFullscreen = useCallback((): void => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen().catch(() => { /* noop */ })
    }
  }, [])

  // ── Nav bar labels / disabled states ────────────────────────────────────
  const navLabel = isMobile
    ? `${panelIndex + 1} / ${panels.length}`
    : `${spreadIndex} / ${totalSpreads}`

  const prevDisabled = isMobile ? panelIndex <= 0 : spreadIndex <= 1

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0E0608', display: 'flex', flexDirection: 'column' }}>
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Canvas
          orthographic
          camera={{ position: [0, 0, 10], zoom: 1, near: 0.1, far: 1000 }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <BookScene
            spreadIndex={spreadIndex}
            portrait={isMobile}
            onClickLeft={isMobile ? goPrevPanel : goPrev}
            onClickRight={isMobile ? goNextPanel : goNext}
          />
        </Canvas>

        {/* ── Layer overlays (portrait) ──────────────────────────────────── */}
        {isMobile && portraitScale > 0 && portraitPanel && (
          <motion.div
            key={portraitPanel.panelId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'absolute',
              left: cx - portPageW / 2,
              top:  cy - portPageH / 2,
              width:  BOOK_PAGE_WIDTH,
              height: BOOK_PAGE_HEIGHT,
              transform: `scale(${portraitScale})`,
              transformOrigin: 'top left',
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            <PanelLayers
              layers={portraitPanel.layers.filter(l => !l.is_spread_layer)}
              videoSfxEnabled={videoSfxEnabled}
              musicEnabled={musicEnabled}
              videoVolume={videoVolume}
              isMobile
            />
          </motion.div>
        )}

        {/* ── Layer overlays (landscape) ─────────────────────────────────── */}
        {!isMobile && landscapeScale > 0 && (
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
                top:  cy - pageH / 2,
                width:  BOOK_PAGE_WIDTH,
                height: BOOK_PAGE_HEIGHT,
                transform: `scale(${landscapeScale})`,
                transformOrigin: 'top left',
                overflow: 'hidden',
              }}
            >
              {leftPanel && (
                <PanelLayers
                  layers={leftPanel.layers.filter((l: Layer) => !l.is_spread_layer)}
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
                top:  cy - pageH / 2,
                width:  BOOK_PAGE_WIDTH,
                height: BOOK_PAGE_HEIGHT,
                transform: `scale(${landscapeScale})`,
                transformOrigin: 'top left',
                overflow: 'hidden',
              }}
            >
              {rightPanel && (
                <PanelLayers
                  layers={rightPanel.layers.filter((l: Layer) => !l.is_spread_layer)}
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
                  top:  cy - pageH / 2,
                  width:  BOOK_SPREAD_WIDTH,
                  height: BOOK_PAGE_HEIGHT,
                  transform: `scale(${landscapeScale})`,
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
          onPrev={isMobile ? goPrevPanel : goPrev}
          onNext={isMobile ? goNextPanel : goNext}
          prevDisabled={prevDisabled}
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
