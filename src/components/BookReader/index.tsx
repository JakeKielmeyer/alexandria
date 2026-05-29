import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useReaderStore } from '../../store/readerStore'
import FlipBookReader, { type FlipBookHandle } from './FlipBookReader'
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
  const toggleVideoSfx   = useReaderStore(s => s.toggleVideoSfx)
  const musicEnabled     = useReaderStore(s => s.musicEnabled)
  const videoVolume      = useReaderStore(s => s.videoVolume)
  const setVideoVolume   = useReaderStore(s => s.setVideoVolume)

  // totalPages = panels.length + 2 (front cover + back cover)
  const totalPages   = panels.length + 2
  const totalSpreads = Math.ceil(panels.length / 2)

  // StPageFlip page index: 0 = front cover, 1..panels.length = interior, last = back cover.
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [isFlipping, setIsFlipping]             = useState(false)

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
  const handlePageFlipped = useCallback((pageIndex: number) => {
    setCurrentPageIndex(pageIndex)
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

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        handleNavForward()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handleNavBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleNavForward, handleNavBack])

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

  // ── Navbar label ─────────────────────────────────────────────────────────
  const isFrontCover = currentPageIndex === 0
  const isBackCover  = currentPageIndex === totalPages - 1
  let navLabel: string
  if (isFrontCover) {
    navLabel = 'Cover'
  } else if (isBackCover) {
    navLabel = 'End'
  } else if (isPortrait) {
    navLabel = `${currentPageIndex} / ${panels.length}`
  } else {
    const spreadNum = Math.ceil(currentPageIndex / 2)
    navLabel = `${spreadNum} / ${totalSpreads}`
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

        {cw > 0 && (
          <FlipBookReader
            ref={flipRef}
            story={story}
            panels={panels}
            isPortrait={isPortrait}
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
          onPrev={handleNavBack}
          onNext={handleNavForward}
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
