import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useReaderStore } from '../../store/readerStore'
import { useIdleHide } from '../../hooks/useIdleHide'
import FlipBookReader, { type FlipBookHandle } from './FlipBookReader'
import Navbar from '../Navbar'
import ReaderThumbnailStrip from '../reader/ReaderThumbnailStrip'
import type { PanelWithMeta } from '../../hooks/useReaderData'
import type { StoryWithCreator } from '../../types'

interface BookReaderProps {
  story: StoryWithCreator
  panels: PanelWithMeta[]
  previewMode: boolean
  onReachEnd: () => void
  onClose?: () => void
}

export default function BookReader({
  story,
  panels,
  previewMode,
  onReachEnd,
  onClose,
}: BookReaderProps): React.JSX.Element {
  const { visible } = useIdleHide(3000)
  const videoSfxEnabled = useReaderStore(s => s.videoSfxEnabled)
  const toggleVideoSfx   = useReaderStore(s => s.toggleVideoSfx)
  const musicEnabled     = useReaderStore(s => s.musicEnabled)
  const videoVolume      = useReaderStore(s => s.videoVolume)

  // totalPages = panels.length + 2 (front cover + interior panels + blank back cover)
  const totalPages   = panels.length + 2
  const totalSpreads = Math.ceil(panels.length / 2)

  // StPageFlip page index: 0 = front cover, 1..panels.length = interior, last = back cover.
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [isFlipping, setIsFlipping]             = useState(false)
  const [gridOpen, setGridOpen]                 = useState(false)

  const flipRef = useRef<FlipBookHandle>(null)
  const onReachEndRef = useRef(onReachEnd)
  onReachEndRef.current = onReachEnd

  // ── Container size tracking (portrait detection) ─────────────────────────
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
  const isPortrait = cw > 0 && ch > 0 && (cw < ch || cw < 768)

  // ── Flip event from StPageFlip ────────────────────────────────────────────
  const handlePageFlipped = useCallback((pageIndex: number, total: number) => {
    setCurrentPageIndex(pageIndex)
    if (pageIndex >= total - 1) {
      Promise.resolve().then(() => onReachEndRef.current())
    }
  }, [])

  const handleStateChange = useCallback((state: string) => {
    setIsFlipping(state === 'user_fold' || state === 'fold_corner' || state === 'flipping')
  }, [])

  // ── Navigation helpers ────────────────────────────────────────────────────
  const handleNavForward = useCallback(() => {
    if (currentPageIndex >= totalPages - 1) {
      Promise.resolve().then(() => onReachEndRef.current())
      return
    }
    flipRef.current?.flipNext()
  }, [currentPageIndex, totalPages])

  const handleNavBack = useCallback(() => {
    flipRef.current?.flipPrev()
  }, [])

  const isRTL = story.reading_direction === 'rtl'

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        isRTL ? handleNavBack() : handleNavForward()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        isRTL ? handleNavForward() : handleNavBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleNavForward, handleNavBack, isRTL])

  // ── Touch swipe ──────────────────────────────────────────────────────────
  const touchStartX = useRef<number | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (dx < -50) handleNavForward()
    else if (dx > 50) handleNavBack()
  }, [handleNavForward, handleNavBack])

  // ── Fullscreen ───────────────────────────────────────────────────────────
  const handleFullscreen = useCallback((): void => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen().catch(() => { /* noop */ })
    }
  }, [])

  const handleThumbnailSelect = useCallback((panelId: string): void => {
    const idx = panels.findIndex(p => p.panelId === panelId)
    if (idx >= 0) flipRef.current?.goToPage(idx + 1)
  }, [panels])

  // ── Navbar label ─────────────────────────────────────────────────────────
  const isFrontCover = currentPageIndex === 0

  const activePanelId = useMemo(() => {
    if (isFrontCover) return null
    return panels[currentPageIndex - 1]?.panelId ?? null
  }, [currentPageIndex, panels, isFrontCover])

  let navLabel: string
  if (isFrontCover) {
    navLabel = 'Cover'
  } else if (isPortrait) {
    navLabel = `${String(currentPageIndex).padStart(2, '0')} / ${String(panels.length).padStart(2, '0')}`
  } else {
    const spreadNum = Math.ceil(currentPageIndex / 2)
    navLabel = `${String(spreadNum).padStart(2, '0')} / ${String(totalSpreads).padStart(2, '0')}`
  }

  const prevDisabled = currentPageIndex <= 0


  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0E0608', display: 'flex', flexDirection: 'column' }}>
      {/* ── Book container ─────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Scene vignette */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        />

        {cw > 0 && ch > 0 && (
          <FlipBookReader
            ref={flipRef}
            story={story}
            panels={panels}
            isPortrait={isPortrait}
            containerH={ch}
            isFlipping={isFlipping}
            videoSfxEnabled={videoSfxEnabled}
            musicEnabled={musicEnabled}
            videoVolume={videoVolume}
            onPageFlipped={handlePageFlipped}
            onStateChange={handleStateChange}
          />
        )}

      </div>

      {!previewMode && (
        <Navbar
          label={navLabel}
          onClose={onClose}
          audioEnabled={videoSfxEnabled}
          onToggleAudio={toggleVideoSfx}
          onFullscreen={handleFullscreen}
          onGrid={() => setGridOpen(v => !v)}
          gridActive={gridOpen}
        />
      )}

      {/* Desktop: left/right edge circles (vertically centered) */}
      {!isPortrait && (
        <>
          <button
            type="button"
            className={`reader-nav-arrow reader-nav-arrow--left${visible ? '' : ' reader-nav-arrow--hidden'}`}
            onClick={handleNavBack}
            disabled={prevDisabled}
            aria-label="Previous spread"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            type="button"
            className={`reader-nav-arrow reader-nav-arrow--right${visible ? '' : ' reader-nav-arrow--hidden'}`}
            onClick={handleNavForward}
            aria-label="Next spread"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </>
      )}

      {/* Mobile: bottom-left and bottom-right circles */}
      {isPortrait && (
        <>
          <button
            type="button"
            className={`reader-nav-arrow reader-nav-arrow--bottom-left${visible ? '' : ' reader-nav-arrow--hidden'}`}
            onClick={handleNavBack}
            disabled={prevDisabled}
            aria-label="Previous page"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            type="button"
            className={`reader-nav-arrow reader-nav-arrow--bottom-right${visible ? '' : ' reader-nav-arrow--hidden'}`}
            onClick={handleNavForward}
            aria-label="Next page"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </>
      )}

      <AnimatePresence>
        {gridOpen && (
          <ReaderThumbnailStrip
            panels={panels}
            activePanelId={activePanelId}
            onSelect={handleThumbnailSelect}
            onClose={() => setGridOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
