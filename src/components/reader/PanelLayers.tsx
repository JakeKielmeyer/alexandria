// src/components/reader/PanelLayers.tsx
//
// Renders every layer on a panel in z-order. Each layer is independently
// positioned (fill modes) and controlled (video autoplay / volume / rate).
//
// Design rules:
//  - Layers sorted ascending by position → rendered in DOM order so natural
//    CSS stacking puts high-position layers on top (no explicit z-index needed).
//  - fill_mode 'crop'    → objectFit cover, focal point via object-position.
//  - fill_mode 'stretch' → objectFit fill  (ignores proportions).
//  - fill_mode 'custom'  → absolutely positioned by x/y/w/h percent.
//  - Legacy rows where fill_mode IS NULL fall back to is_fill → 'crop'/'custom'.
//  - Audio layers render an invisible <audio> element (no visual element).
//  - Video layers use an IntersectionObserver for 50%-visibility autoplay;
//    muted / volume / playbackRate are synced imperatively so mid-playback
//    changes take effect without restarting.

import React, { useRef, useEffect } from 'react'
import type { Layer, FillMode } from '../../types'

// ── Helpers ────────────────────────────────────────────────────────────────

function resolvedFillMode(layer: Layer): FillMode {
  if (layer.fill_mode) return layer.fill_mode
  return layer.is_fill ? 'crop' : 'custom'
}

function containerStyle(layer: Layer): React.CSSProperties {
  const mode = resolvedFillMode(layer)
  if (mode === 'custom') {
    return {
      position: 'absolute',
      left: `${layer.x_percent}%`,
      top: `${layer.y_percent}%`,
      width: layer.width_percent != null ? `${layer.width_percent}%` : '50%',
      height: layer.height_percent != null ? `${layer.height_percent}%` : '50%',
      opacity: layer.opacity,
      overflow: 'hidden',
    }
  }
  // stretch or crop — full-panel fill
  return {
    position: 'absolute',
    inset: 0,
    opacity: layer.opacity,
    overflow: 'hidden',
  }
}

function mediaStyle(layer: Layer): React.CSSProperties {
  const mode = resolvedFillMode(layer)
  const base: React.CSSProperties = { width: '100%', height: '100%', display: 'block' }
  if (mode === 'stretch') return { ...base, objectFit: 'fill' }
  if (mode === 'crop') {
    return {
      ...base,
      objectFit: 'cover',
      objectPosition: `${layer.focal_x_percent ?? 50}% ${layer.focal_y_percent ?? 50}%`,
    }
  }
  // custom (positioned) — fill the container box
  return { ...base, objectFit: 'cover' }
}

// ── Single-layer renderer ──────────────────────────────────────────────────

interface LayerRendererProps {
  layer: Layer
  videoSfxEnabled: boolean
  musicEnabled: boolean
  videoVolume: number
}

function LayerRenderer({ layer, videoSfxEnabled, musicEnabled, videoVolume }: LayerRendererProps): React.JSX.Element | null {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isVisibleRef = useRef(false)

  // Audio-only layers respect the Sound (musicEnabled) toggle; video layers
  // respect the Video & SFX toggle. This lets readers control them independently.
  const effectiveMuted = layer.media_type === 'audio'
    ? (layer.muted || !musicEnabled)
    : (layer.muted || !videoSfxEnabled)
  const isMedia = layer.media_type === 'video' || layer.media_type === 'audio'

  // ── IntersectionObserver: autoplay at 50% visibility ──────────────────
  // Observe the wrapping container, not the media element itself: <audio>
  // has 0×0 dimensions and IO behaves unreliably on zero-size targets,
  // which was preventing audio playback from ever starting.
  useEffect(() => {
    if (!isMedia) return
    const target = containerRef.current
    const el = layer.media_type === 'video' ? videoRef.current : audioRef.current
    if (!target || !el) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisibleRef.current = entry.isIntersecting
          if (entry.isIntersecting) {
            if (layer.autoplay) {
              el.play().catch(() => { /* browser policy — ignore */ })
            }
          } else {
            el.pause()
            // Only reset video on scroll-away. Audio pauses in place so it
            // can resume from the same position when the reader scrolls back.
            if (layer.media_type === 'video') {
              try { el.currentTime = 0 } catch { /* noop */ }
            }
          }
        }
      },
      { threshold: 0.5 },
    )
    io.observe(target)
    return () => io.disconnect()
    // Re-create IO only when the media element or autoplay flag changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer.media_type, layer.autoplay])

  // ── Imperative autoplay toggle while panel is in view ─────────────────
  // Changing autoplay in the editor shouldn't require a scroll-out/in cycle.
  useEffect(() => {
    if (!isMedia) return
    const el = layer.media_type === 'video' ? videoRef.current : audioRef.current
    if (!el || !isVisibleRef.current) return
    if (layer.autoplay) {
      el.play().catch(() => { /* noop */ })
    } else {
      el.pause()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer.autoplay])

  // ── Sync playback rate ────────────────────────────────────────────────
  useEffect(() => {
    if (layer.media_type !== 'video') return
    const el = videoRef.current
    if (el) el.playbackRate = layer.playback_rate
  }, [layer.media_type, layer.playback_rate])

  // ── Sync muted (imperative — React prop is initial-attribute-only) ────
  useEffect(() => {
    if (layer.media_type === 'video') {
      const el = videoRef.current
      if (el) el.muted = effectiveMuted
    }
    if (layer.media_type === 'audio') {
      const el = audioRef.current
      if (el) el.muted = effectiveMuted
    }
  }, [layer.media_type, effectiveMuted])

  // ── Sync volume ───────────────────────────────────────────────────────
  useEffect(() => {
    if (layer.media_type === 'video') {
      const el = videoRef.current
      if (el) el.volume = videoVolume
    }
    if (layer.media_type === 'audio') {
      const el = audioRef.current
      if (el) el.volume = videoVolume
    }
  }, [layer.media_type, videoVolume])

  if (layer.media_type === 'text') {
    return (
      <div style={containerStyle(layer)}>
        <div
          style={{
            width: '100%',
            height: '100%',
            padding: '6px 8px',
            boxSizing: 'border-box',
            fontFamily: `'${layer.font_family ?? 'DM Sans'}', sans-serif`,
            fontSize: `${layer.font_size ?? 24}px`,
            fontWeight: layer.font_weight ?? '400',
            color: layer.text_color ?? '#F5EEE8',
            textAlign: (layer.text_align ?? 'left') as React.CSSProperties['textAlign'],
            lineHeight: layer.line_height ?? 1.4,
            letterSpacing: `${layer.letter_spacing ?? 0}px`,
            overflow: 'hidden',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            pointerEvents: 'none',
          }}
        >
          {layer.text_content ?? ''}
        </div>
      </div>
    )
  }

  if (!layer.media_url) return null

  const cStyle = containerStyle(layer)
  const mStyle = mediaStyle(layer)

  if (layer.media_type === 'audio') {
    return (
      <div ref={containerRef} style={cStyle}>
        <audio
          ref={audioRef}
          src={layer.media_url}
          loop={layer.loop}
          autoPlay={layer.autoplay}
          muted={effectiveMuted}
          preload="auto"
        />
      </div>
    )
  }

  if (layer.media_type === 'video') {
    return (
      <div ref={containerRef} style={cStyle}>
        <video
          ref={videoRef}
          src={layer.media_url}
          style={mStyle}
          playsInline
          muted={effectiveMuted}
          loop={layer.loop}
          autoPlay={layer.autoplay}
          preload="auto"
        />
      </div>
    )
  }

  // image or gif
  return (
    <div style={cStyle}>
      <img src={layer.media_url} alt="" style={mStyle} />
    </div>
  )
}

// ── Panel-level renderer ───────────────────────────────────────────────────

interface PanelLayersProps {
  layers: Layer[]
  videoSfxEnabled: boolean
  musicEnabled: boolean
  videoVolume: number
}

export default function PanelLayers({ layers, videoSfxEnabled, musicEnabled, videoVolume }: PanelLayersProps): React.JSX.Element {
  // layers are already sorted ascending (low position = behind) by useReaderData
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {layers.map((layer) => (
        <LayerRenderer
          key={layer.id}
          layer={layer}
          videoSfxEnabled={videoSfxEnabled}
          musicEnabled={musicEnabled}
          videoVolume={videoVolume}
        />
      ))}
    </div>
  )
}
