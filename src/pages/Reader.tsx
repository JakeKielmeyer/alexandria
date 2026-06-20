import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, animate, motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { getRequiredGates } from '../lib/gateFlow'
import { useGateStore } from '../store/gateStore'
import { useReaderStore } from '../store/readerStore'
import { useReaderData } from '../hooks/useReaderData'
import { useDocumentHead } from '../hooks/useDocumentHead'
import { loadFontManifest } from '../lib/fonts'
import type { StoryWithCreator } from '../types'
import type { GateName } from '../lib/gateFlow'
import type { PanelWithMeta } from '../hooks/useReaderData'
import AgeGate from './AgeGate'
import ExplicitConsent from './ExplicitConsent'
import Password from './Password'
import Interstitial from './Interstitial'
import Cover from './Cover'
import Navbar from '../components/Navbar'
import GateShell from '../components/GateShell'
import BookReader from '../components/BookReader'
import PanelScrollItem from '../components/reader/PanelScrollItem'
import PanelLayers from '../components/reader/PanelLayers'
import StoryAudio, { type SpanAudioEntry } from '../components/reader/StoryAudio'
import ReaderThumbnailStrip from '../components/reader/ReaderThumbnailStrip'
import PreviewBar, { PREVIEW_SIZES, type PreviewScreenSize } from '../components/reader/PreviewBar'
import '../styles/reader.css'

// ── Helpers ────────────────────────────────────────────────────────────────

const PREVIEW_BAR_H = 56

function getCreatorName(story: StoryWithCreator): string {
  return story.display_name ?? story.username
}

/**
 * Drop fullscreen if the page is currently in it. Awaitable so callers can
 * sequence it before a navigate() — fullscreen is bound to the document root,
 * so a SPA route change doesn't release it on its own and the next route
 * (e.g. the editor) ends up stuck in fullscreen.
 */
async function exitFullscreenIfActive(): Promise<void> {
  if (typeof document === 'undefined') return
  if (!document.fullscreenElement) return
  try { await document.exitFullscreen() } catch { /* noop */ }
}

// ── ScrollReader ───────────────────────────────────────────────────────────

interface ScrollReaderProps {
  story: StoryWithCreator
  panels: PanelWithMeta[]
  previewMode: boolean
  previewScreenSize: PreviewScreenSize
  onReachEnd: () => void
}

function ScrollReader({ story, panels, previewMode, previewScreenSize, onReachEnd }: ScrollReaderProps): React.JSX.Element {
  const videoSfxEnabled = useReaderStore((s) => s.videoSfxEnabled)
  const toggleVideoSfx = useReaderStore((s) => s.toggleVideoSfx)
  const musicEnabled = useReaderStore((s) => s.musicEnabled)
  const videoVolume = useReaderStore((s) => s.videoVolume)
  const navigate = useNavigate()

  const [activePanelId, setActivePanelId] = useState<string | null>(panels[0]?.panelId ?? null)
  const [gridOpen, setGridOpen] = useState(false)

  const isCinematic = story.reading_mode === 'cinematic'
  const panelMode = isCinematic ? 'cinematic' : 'scroll'
  const transitionStyle = (story.transition_style ?? 'stacked') as 'stacked' | 'fade'

  // Cinematic stacked mode uses mandatory snap to make each panel feel like
  // a discrete page flip. Fade mode needs continuous scroll so the opacity
  // transition has visible frames as the reader moves between panels —
  // mandatory snap teleports past the fade band on a wheel tick. Scroll
  // (non-cinematic) mode never snaps.
  useEffect(() => {
    if (!isCinematic) return
    const snap = transitionStyle === 'fade' ? 'y proximity' : 'y mandatory'
    const prev = document.documentElement.style.scrollSnapType
    document.documentElement.style.scrollSnapType = snap
    return () => { document.documentElement.style.scrollSnapType = prev }
  }, [isCinematic, transitionStyle])

  const activeIndex = useMemo(() => {
    const idx = panels.findIndex((p) => p.panelId === activePanelId)
    return idx === -1 ? 0 : idx
  }, [panels, activePanelId])

  const activePanel = panels[activeIndex] ?? panels[0]
  const chapterTotal = useMemo(
    () => panels.filter(p => p.chapterNumber === activePanel?.chapterNumber).length,
    [panels, activePanel?.chapterNumber],
  )
  const navLabel = activePanel
    ? `Ch.${activePanel.chapterNumber} · ${String(activePanel.pageInChapter).padStart(2, '0')} / ${String(chapterTotal).padStart(2, '0')}`
    : ''

  // Audio layers with panel_span_count > 1 are rendered once at story level
  // (see <StoryAudio>). Per-panel rendering would spawn N <audio> elements
  // that fight each other across panel transitions.
  const spanAudioEntries = useMemo<SpanAudioEntry[]>(() => {
    const entries: SpanAudioEntry[] = []
    panels.forEach((panel, panelIndex) => {
      for (const layer of panel.layers) {
        if (layer.media_type !== 'audio') continue
        if ((layer.panel_span_count ?? 1) > 1) {
          entries.push({ layer, startPanelIndex: panelIndex })
        }
      }
    })
    return entries
  }, [panels])

  const spanAudioLayerIds = useMemo<Set<string>>(
    () => new Set(spanAudioEntries.map((e) => e.layer.id)),
    [spanAudioEntries],
  )

  // Button-driven navigation uses a framer-motion tween to honour
  // transition_duration_ms. We toggle scroll-snap off during the tween
  // so the browser doesn't cancel our animation.
  const scrollToPanel = useCallback((panelId: string): void => {
    const el = document.getElementById(`panel-${panelId}`)
    if (!el) return
    const rect = el.getBoundingClientRect()
    const targetY = window.scrollY + rect.top - (window.innerHeight - rect.height) / 2
    const duration = (story.transition_duration_ms ?? 600) / 1000

    const prevSnap = document.documentElement.style.scrollSnapType
    document.documentElement.style.scrollSnapType = 'none'

    animate(window.scrollY, targetY, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => window.scrollTo(0, v),
      onComplete: () => {
        document.documentElement.style.scrollSnapType = prevSnap
      },
    })
  }, [story.transition_duration_ms])

  const handlePrev = useCallback((): void => {
    const prev = panels[activeIndex - 1]
    if (prev) scrollToPanel(prev.panelId)
  }, [panels, activeIndex, scrollToPanel])

  // Next on last panel navigates to end (or back to editor in preview).
  const handleNext = useCallback((): void => {
    const next = panels[activeIndex + 1]
    if (next) {
      scrollToPanel(next.panelId)
    } else {
      onReachEnd()
    }
  }, [panels, activeIndex, scrollToPanel, onReachEnd])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); handleNext() }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); handlePrev() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleNext, handlePrev])

  // Fullscreen targets document.documentElement so window scroll keeps
  // driving the 3D transform and the fixed Navbar stays visible.
  // A resize event is dispatched after the transition so framer-motion
  // remeasures slot offsets.
  const handleFullscreen = useCallback((): void => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen().catch(() => { /* noop */ })
    }
    // Give the fullscreen animation ~200ms to settle, then nudge framer.
    setTimeout(() => window.dispatchEvent(new Event('resize')), 200)
  }, [])

  const handleClose = useCallback((): void => {
    void exitFullscreenIfActive().finally(() => {
      previewMode ? navigate(`/editor/${story.id}`) : navigate(-1)
    })
  }, [navigate, previewMode, story.id])

  const isMobileSim = previewScreenSize === 'phone-h' || previewScreenSize === 'phone-v'
  const simWidth = PREVIEW_SIZES.find(s => s.id === previewScreenSize)?.w ?? null

  // Defensive: if ScrollReader unmounts for any other reason while still
  // fullscreen (browser back, EndPage navigation, etc.), drop fullscreen so
  // the next route doesn't inherit it. The browser doesn't auto-exit on SPA
  // route changes — fullscreen is bound to <html>.
  useEffect(() => {
    return () => { void exitFullscreenIfActive() }
  }, [])

  const stageStyle: React.CSSProperties = {
    ...(previewMode ? { paddingTop: PREVIEW_BAR_H } : {}),
    ...(simWidth ? { '--preview-panel-width': `${simWidth}px` } as React.CSSProperties : {}),
  }

  return (
    <div className="reader-stage" style={stageStyle}>
      <main className="reader-feed">
        {panels.map((panel, i) => (
          <PanelScrollItem
            key={panel.panelId}
            id={`panel-${panel.panelId}`}
            mode={panelMode}
            transitionStyle={isCinematic ? transitionStyle : undefined}
            heightPx={panel.height}
            onActivate={() => setActivePanelId(panel.panelId)}
            introVariant={i === 0 && isCinematic ? 'first' : undefined}
          >
            {/* Relative container fills the card so absolute-positioned layers work */}
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <PanelLayers
                layers={panel.layers.filter((l) => !spanAudioLayerIds.has(l.id))}
                videoSfxEnabled={videoSfxEnabled}
                musicEnabled={musicEnabled}
                videoVolume={videoVolume}
                isMobile={isMobileSim}
              />
              {panel.layers.length === 0 && (
                <div className="reader-panel-placeholder" />
              )}
            </div>

            {panel.isFirstInChapter && panel.chapterTitle && (
              <div className="chapter-overlay">
                <span className="chapter-overlay-eyebrow">Chapter {panel.chapterNumber}</span>
                <span className="chapter-overlay-title">{panel.chapterTitle}</span>
              </div>
            )}
          </PanelScrollItem>
        ))}
      </main>

      <Navbar
        label={navLabel}
        onClose={handleClose}
        audioEnabled={videoSfxEnabled}
        onToggleAudio={toggleVideoSfx}
        onFullscreen={handleFullscreen}
        onGrid={() => setGridOpen((v) => !v)}
        gridActive={gridOpen}
      />

      {/* Webtoon right-side stacked chevron nav */}
      <div className="reader-webtoon-nav">
        <button
          type="button"
          className="reader-webtoon-nav-up"
          onClick={handlePrev}
          disabled={activeIndex === 0}
          aria-label="Previous panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 10.5L8 5.5l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          type="button"
          className="reader-webtoon-nav-down"
          onClick={handleNext}
          aria-label="Next panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 5.5L8 10.5l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {gridOpen && (
          <ReaderThumbnailStrip
            panels={panels}
            activePanelId={activePanelId}
            onSelect={scrollToPanel}
            onClose={() => setGridOpen(false)}
          />
        )}
      </AnimatePresence>

      <StoryAudio
        entries={spanAudioEntries}
        activePanelIndex={activeIndex}
        musicEnabled={musicEnabled}
        videoVolume={videoVolume}
      />

    </div>
  )
}

// ── Reader ─────────────────────────────────────────────────────────────────

export default function Reader(): React.JSX.Element {
  const { username, slug } = useParams<{ username: string; slug: string }>()
  const navigate = useNavigate()

  const [story, setStory] = useState<StoryWithCreator | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [storyLoading, setStoryLoading] = useState(true)
  const [screen, setScreen] = useState<'cover' | 'reading'>('cover')

  const { clearedGates, clearGate, unClearGate, resetForStory } = useGateStore()
  const videoSfxEnabled = useReaderStore((s) => s.videoSfxEnabled)
  const toggleVideoSfx = useReaderStore((s) => s.toggleVideoSfx)
  const musicEnabled = useReaderStore((s) => s.musicEnabled)
  const toggleMusic = useReaderStore((s) => s.toggleMusic)
  const [searchParams] = useSearchParams()
  const previewMode = searchParams.get('preview') === '1'
  const currentUser = useAuthStore((s) => s.user)
  const [previewScreenSize, setPreviewScreenSize] = useState<PreviewScreenSize>('desktop')

  useEffect(() => {
    let cancelled = false

    async function fetchStory(): Promise<void> {
      if (!username || !slug) {
        if (cancelled) return
        setFetchError('Invalid URL.')
        setStoryLoading(false)
        return
      }

      try {
        let query = supabase
          .from('stories')
          .select('*, users!inner(id, username, display_name)')
          .eq('slug', slug)
          .eq('users.username', username)

        if (!previewMode) query = query.eq('is_published', true)

        const { data, error } = await query.single()

        if (cancelled) return

        if (error || !data) {
          setFetchError(error?.message ?? 'Story not found.')
          setStoryLoading(false)
          return
        }

        if (previewMode && (!currentUser || currentUser.id !== data.user_id)) {
          setFetchError('Preview only available to the story owner.')
          setStoryLoading(false)
          return
        }

        const storyData: StoryWithCreator = {
          ...data,
          username: data.users.username,
          display_name: data.users.display_name,
        }

        resetForStory(storyData.id, storyData)
        setStory(storyData)
        setStoryLoading(false)
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Something went wrong.'
        setFetchError(msg)
        setStoryLoading(false)
      }
    }

    fetchStory()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, slug, previewMode, currentUser])

  // Load Google Fonts required by text layers before panels render.
  useEffect(() => {
    if (story?.font_manifest?.length) {
      loadFontManifest(story.font_manifest)
    }
  // Re-run only when the story changes (manifest won't change while reading).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id])

  const { panels, loading: panelsLoading, error: panelsError } = useReaderData(story)

  useDocumentHead(story ? {
    title: `${story.title} — ${getCreatorName(story)} | Alexandria`,
    description: story.creator_bio
      ? story.creator_bio.slice(0, 200)
      : `Read "${story.title}" by ${getCreatorName(story)} on Alexandria.`,
    image: story.cover_url,
    url: typeof window !== 'undefined' ? window.location.href : null,
    type: 'article',
  } : { title: 'Alexandria' })

  const requiredGates: GateName[] = story ? getRequiredGates(story) : []
  const nextGate = requiredGates.find(g => !clearedGates.includes(g)) ?? null
  const gatesCleared = previewMode || (story !== null && nextGate === null)

  const handleClearGate = useCallback((gate: GateName): void => {
    if (!story) return
    clearGate(story.id, gate)
  }, [story, clearGate])

  const handleReachEnd = useCallback((): void => {
    if (!story) return
    // Preview-mode readers also reach the end page, but with `?preview=1`
    // so EndPage can swap the Exit button to "Exit Preview" → back to editor.
    const endPath = `/u/${username}/s/${slug}/end${previewMode ? '?preview=1' : ''}`
    navigate(endPath)
  }, [story, previewMode, navigate, username, slug])

  const handleExitPreview = useCallback((): void => {
    if (!story) return
    void exitFullscreenIfActive().finally(() => {
      navigate(`/editor/${story.id}`)
    })
  }, [story, navigate])

  // ── Loading / error states ─────────────────────────────────────────────

  if (storyLoading) {
    return (
      <GateShell>
        <div style={{ color: 'rgba(245,238,232,0.45)', fontSize: '13px' }}>Loading…</div>
      </GateShell>
    )
  }

  if (fetchError || !story) {
    return (
      <GateShell>
        <div style={{ color: 'rgba(245,238,232,0.55)', fontSize: '13px' }}>
          {fetchError ?? 'Story not found.'}
        </div>
      </GateShell>
    )
  }

  // ── Gates ──────────────────────────────────────────────────────────────

  if (!gatesCleared) {
    if (nextGate === 'password') {
      return (
        <Password
          storyId={story.id}
          passwordHash={story.password_hash}
          storyTitle={story.title}
          creatorName={getCreatorName(story)}
          onClear={() => handleClearGate('password')}
        />
      )
    }
    if (nextGate === 'age') {
      return (
        <AgeGate
          onClear={() => handleClearGate('age')}
          onDecline={() => navigate('/decline')}
        />
      )
    }
    if (nextGate === 'explicit') {
      return (
        <ExplicitConsent
          onClear={() => handleClearGate('explicit')}
          onBack={() => unClearGate('age')}
        />
      )
    }
    if (nextGate === 'interstitial') {
      return (
        <Interstitial
          storyId={story.id}
          storyTitle={story.title}
          creatorName={getCreatorName(story)}
          onClear={() => handleClearGate('interstitial')}
        />
      )
    }
  }

  // ── Panel load states ──────────────────────────────────────────────────

  if (panelsLoading && screen === 'reading') {
    return (
      <GateShell>
        <div style={{ color: 'rgba(245,238,232,0.45)', fontSize: '13px' }}>Loading story…</div>
      </GateShell>
    )
  }

  if (panelsError) {
    return (
      <GateShell>
        <div style={{ color: 'rgba(245,238,232,0.55)', fontSize: '13px' }}>{panelsError}</div>
      </GateShell>
    )
  }

  // ── Cover / Empty / Reader ─────────────────────────────────────────────

  const isBook = story.reading_mode === 'book'

  // Device frame for book mode preview at non-desktop sizes
  const bookFrameCfg = previewMode && previewScreenSize !== 'desktop'
    ? (PREVIEW_SIZES.find(s => s.id === previewScreenSize) ?? null)
    : null
  const bookFrameScale = (bookFrameCfg?.w && bookFrameCfg?.h)
    ? Math.min(
        (window.innerWidth - 32) / bookFrameCfg.w,
        (window.innerHeight - PREVIEW_BAR_H - 32) / bookFrameCfg.h,
      )
    : 1

  return (
    <>
      {previewMode && (
        <PreviewBar
          screenSize={previewScreenSize}
          onScreenSizeChange={setPreviewScreenSize}
          musicEnabled={musicEnabled}
          onToggleMusic={toggleMusic}
          onExit={handleExitPreview}
        />
      )}
      <AnimatePresence mode="wait">
        {screen === 'cover' ? (
          <motion.div
            key="cover"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeOut' } }}
          >
            <Cover
              story={story}
              onEnter={() => setScreen('reading')}
              onFullscreen={() => {
                void document.documentElement.requestFullscreen().catch(() => { /* noop */ })
              }}
              audioEnabled={videoSfxEnabled}
              onToggleAudio={toggleVideoSfx}
              previewMode={previewMode}
              onExitPreview={handleExitPreview}
            />
          </motion.div>
        ) : panels.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GateShell>
              <div style={{ color: 'rgba(245,238,232,0.55)', fontSize: '13px' }}>
                This story has no panels yet.
              </div>
            </GateShell>
          </motion.div>
        ) : isBook && bookFrameCfg ? (
          <motion.div
            key="book-reader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } }}
            style={{
              position: 'fixed',
              top: PREVIEW_BAR_H,
              left: 0,
              right: 0,
              bottom: 0,
              background: '#080408',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{
              width: bookFrameCfg.w!,
              height: bookFrameCfg.h!,
              transform: `scale(${bookFrameScale})`,
              transformOrigin: 'top center',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 8,
              boxShadow: '0 0 0 1px rgba(245,238,232,0.1), 0 24px 48px rgba(0,0,0,0.8)',
              flexShrink: 0,
            }}>
              <BookReader
                story={story}
                panels={panels}
                previewMode={previewMode}
                onReachEnd={handleReachEnd}
                onClose={() => { void exitFullscreenIfActive().finally(() => navigate(`/editor/${story.id}`)) }}
              />
            </div>
          </motion.div>
        ) : isBook ? (
          <motion.div
            key="book-reader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } }}
            className="reader-book-container"
            style={previewMode ? { top: PREVIEW_BAR_H } : undefined}
          >
            <BookReader
              story={story}
              panels={panels}
              previewMode={previewMode}
              onReachEnd={handleReachEnd}
              onClose={previewMode
                ? () => { void exitFullscreenIfActive().finally(() => navigate(`/editor/${story.id}`)) }
                : () => { void exitFullscreenIfActive().finally(() => navigate(-1)) }
              }
            />
          </motion.div>
        ) : (
          <motion.div
            key="reader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } }}
          >
            <ScrollReader
              story={story}
              panels={panels}
              previewMode={previewMode}
              previewScreenSize={previewScreenSize}
              onReachEnd={handleReachEnd}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
