// src/components/reader/ReaderThumbnailStrip.tsx
//
// Sliding drawer of chapter-grouped panel thumbnails. Lives inside the
// reader shell, above the Navbar. Mirrors the 10-thumbnail-strip.html mockup:
//
//  ── Chapter 1 ──────────────────────────────────────────
//  [1] [2] [3] [4] ▶ (horizontal scroll)
//  ── Chapter 2 ──────────────────────────────────────────
//  [5] [6] [7] ...

import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import type { PanelWithMeta } from '../../hooks/useReaderData'
import VideoThumbnail from '../VideoThumbnail'

interface ReaderThumbnailStripProps {
  panels: PanelWithMeta[]
  activePanelId: string | null
  onSelect: (panelId: string) => void
  onClose: () => void
}

export default function ReaderThumbnailStrip({
  panels, activePanelId, onSelect, onClose,
}: ReaderThumbnailStripProps): React.JSX.Element {
  // Escape closes the strip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Find the active panel's chapter so we can highlight "current" vs. "future".
  const activeChapter = panels.find((p) => p.panelId === activePanelId)?.chapterNumber ?? null

  // Group panels by chapter, preserving iteration order.
  const byChapter = new Map<number, { title: string | null; panels: PanelWithMeta[] }>()
  for (const panel of panels) {
    const group = byChapter.get(panel.chapterNumber)
    if (group) {
      group.panels.push(panel)
    } else {
      byChapter.set(panel.chapterNumber, {
        title: panel.chapterTitle,
        panels: [panel],
      })
    }
  }

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="reader-thumb-strip"
      role="dialog"
      aria-label="Panel thumbnails"
    >
      <div className="reader-thumb-strip-header">
        <span className="reader-thumb-strip-title">Jump to panel</span>
        <button
          onClick={onClose}
          aria-label="Close thumbnail strip"
          className="reader-thumb-strip-close"
          type="button"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="reader-thumb-strip-body">
        {[...byChapter.entries()].map(([chapterNumber, group]) => {
          const isCurrent = chapterNumber === activeChapter
          return (
            <section key={chapterNumber} className="reader-thumb-chapter">
              <div
                className={`reader-thumb-chapter-header ${isCurrent ? 'is-current' : ''}`}
              >
                <span>Chapter {chapterNumber}</span>
                {group.title && <span className="reader-thumb-chapter-title">{group.title}</span>}
              </div>
              <div className="reader-thumb-row">
                {group.panels.map((panel) => {
                  const isActive = panel.panelId === activePanelId
                  return (
                    <button
                      key={panel.panelId}
                      type="button"
                      onClick={() => { onSelect(panel.panelId); onClose() }}
                      className={`reader-thumb ${isActive ? 'is-active' : ''}`}
                      aria-label={`Jump to chapter ${panel.chapterNumber} page ${panel.pageInChapter}`}
                      aria-pressed={isActive}
                    >
                      {panel.mediaType === 'video' && panel.image_url ? (
                        <VideoThumbnail
                          src={panel.image_url}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : panel.image_url ? (
                        <img src={panel.image_url} alt="" className="reader-thumb-img" />
                      ) : (
                        <div className="reader-thumb-empty" />
                      )}
                      <span className="reader-thumb-page">{panel.pageInChapter}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </motion.div>
  )
}
