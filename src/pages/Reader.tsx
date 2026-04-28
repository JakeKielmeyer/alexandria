import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, animate, motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { getRequiredGates } from '../lib/gateFlow'
import { useGateStore } from '../store/gateStore'
import { useReaderStore } from '../store/readerStore'
import { useReaderData } from '../hooks/useReaderData'
import { useDocumentHead } from '../hooks/useDocumentHead'
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
import PanelScrollItem from '../components/reader/PanelScrollItem'
import PanelLayers from '../components/reader/PanelLayers'
import ReaderThumbnailStrip from '../components/reader/ReaderThumbnailStrip'
import '../styles/reader.css'

// ── Helpers ────────────────────────────────────────────────────────────────

function getCreatorName(story: StoryWithCreator): string {
  return story.display_name ?? story.username
}

// ── ScrollReader ───────────────────────────────────────────────────────────

interface ScrollReaderProps {
  story: StoryWithCreator
  panels: PanelWithMeta[]
  previewMode: boolean
  onReachEnd: () => void
}

function ScrollReader({ story, panels, previewMode, onReachEnd }: ScrollReaderProps): React.JSX.Element {
  const videoSfxEnabled = useReaderStore((s) => s.videoSfxEnabled)
  const toggleVideoSfx = useReaderStore((s) => s.toggleVideoSfx)
  const videoVolume = useReaderStore((s) => s.videoVolume)
  const setVideoVolume = useReaderStore((s) => s.setVideoVolume)
  const navigate = useNavigate()

  const [activePanelId, setActivePanelId] = useState<string | null>(panels[0]?.panelId ?? null)
  const [gridOpen, setGridOpen] = useState(false)

  const isCinematic = story.reading_mode === 'cinematic'
  const panelMode = isCinematic ? 'cinematic' : 'scroll'
  const transitionStyle = (story.transition_style ?? 'stacked') as 'stacked' | 'fade'

  // Cinematic snaps on the window (document root). Scroll mode does not.
  useEffect(() => {
    if (!isCinematic) return
    const prev = document.documentElement.style.scrollSnapType
    document.documentElement.style.scrollSnapType = 'y mandatory'
    return () => { document.documentElement.style.scrollSnapType = prev }
  }, [isCinematic])

  const activeIndex = useMemo(() => {
    const idx = panels.findIndex((p) => p.panelId === activePanelId)
    return idx === -1 ? 0 : idx
  }, [panels, activePanelId])

  const activePanel = panels[activeIndex] ?? panels[0]
  const navLabel = activePanel ? `Ch. ${activePanel.chapterNumber} · ${activePanel.pageInChapter}` : ''

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

  const handleExitPreview = useCallback((): void => {
    navigate(`/editor/${story.id}`)
  }, [navigate, story.id])

  return (
    <div className="reader-stage">
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
                layers={panel.layers}
                videoSfxEnabled={videoSfxEnabled}
                videoVolume={videoVolume}
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

      <div className="reader-navbar-fixed">
        <Navbar
          label={navLabel}
          onPrev={handlePrev}
          onNext={handleNext}
          prevDisabled={activeIndex === 0}
          nextDisabled={false}
          audioEnabled={videoSfxEnabled}
          onToggleAudio={toggleVideoSfx}
          volume={videoVolume}
          onVolumeChange={setVideoVolume}
          onFullscreen={handleFullscreen}
          onGrid={() => setGridOpen((v) => !v)}
          gridActive={gridOpen}
        />
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

      {previewMode && (
        <button
          type="button"
          onClick={handleExitPreview}
          className="reader-exit-preview"
          aria-label="Exit preview"
        >
          Exit Preview ×
        </button>
      )}
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
  const videoVolume = useReaderStore((s) => s.videoVolume)
  const setVideoVolume = useReaderStore((s) => s.setVideoVolume)
  const [searchParams] = useSearchParams()
  const previewMode = searchParams.get('preview') === '1'
  const currentUser = useAuthStore((s) => s.user)

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
    if (previewMode) {
      navigate(`/editor/${story.id}`)
    } else {
      navigate(`/u/${username}/s/${slug}/end`)
    }
  }, [story, previewMode, navigate, username, slug])

  const handleExitPreview = useCallback((): void => {
    if (!story) return
    navigate(`/editor/${story.id}`)
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

  return (
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
            onReachEnd={handleReachEnd}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
