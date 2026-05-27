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

import React, { useRef, useEffect, useState } from 'react'
import type { Layer, FillMode, TailDirection } from '../../types'
import { computeBasePoint, buildTailPath } from '../SpeechBubble/geometry'
import type { BubbleState, Point } from '../SpeechBubble/geometry'

// ── Helpers ────────────────────────────────────────────────────────────────

const TAIL_BASE = 22
const BEZIER_HALF_WIDTH = 11
const BEZIER_CURVATURE = 0.5

function TailSVG({ direction, offset, length, bgColor }: {
  direction: TailDirection; offset: number; length: number; bgColor: string | null
}): React.JSX.Element {
  const fill = bgColor ?? '#ffffff'
  const b = TAIL_BASE
  const h = length
  const isCorner = direction.includes('-')

  if (!isCorner) {
    const pts = `0,0 ${b},0 ${b / 2},${h}`
    const base: React.CSSProperties = { position: 'absolute', overflow: 'visible', width: b, height: h, zIndex: 1, pointerEvents: 'none' }
    let style: React.CSSProperties
    switch (direction as 'top' | 'bottom' | 'left' | 'right') {
      case 'bottom': style = { ...base, bottom: 0, left: `${offset}%`, transform: 'translateX(-50%)' }; break
      case 'top':    style = { ...base, top: 0,    left: `${offset}%`, transform: 'translateX(-50%) scaleY(-1)', transformOrigin: 'center top' }; break
      case 'right':  style = { ...base, right: 0,  top: `${offset}%`, width: h, height: b, transform: 'translateY(-50%) rotate(-90deg)', transformOrigin: 'right center' }; break
      case 'left':   style = { ...base, left: 0,   top: `${offset}%`, width: h, height: b, transform: 'translateY(-50%) rotate(90deg)', transformOrigin: 'left center' }; break
    }
    return <svg style={style!} viewBox={`0 0 ${b} ${h}`} preserveAspectRatio="none"><polygon points={pts} fill={fill} /></svg>
  }

  const cs = b / 2
  const d = Math.round(h * 0.707)
  const cornerPts: Record<string, string> = {
    'bottom-right': `${-cs},0 0,${-cs} ${d},${d}`,
    'bottom-left':  `${cs},0 0,${-cs} ${-d},${d}`,
    'top-right':    `${-cs},0 0,${cs} ${d},${-d}`,
    'top-left':     `${cs},0 0,${cs} ${-d},${-d}`,
  }
  const cornerPos: Record<string, React.CSSProperties> = {
    'bottom-right': { position: 'absolute', bottom: 0, right: 0 },
    'bottom-left':  { position: 'absolute', bottom: 0, left: 0 },
    'top-right':    { position: 'absolute', top: 0,    right: 0 },
    'top-left':     { position: 'absolute', top: 0,    left: 0 },
  }
  const style: React.CSSProperties = { ...cornerPos[direction], overflow: 'visible', width: 1, height: 1, zIndex: 1, pointerEvents: 'none' }
  return <svg style={style} viewBox="0 0 1 1" overflow="visible"><polygon points={cornerPts[direction]} fill={fill} /></svg>
}

function resolvedFillMode(layer: Layer): FillMode {
  if (layer.fill_mode) return layer.fill_mode
  return layer.is_fill ? 'crop' : 'custom'
}

/**
 * Resolve position/size for a layer, applying mobile overrides when `isMobile`
 * is true and the layer has non-null mobile_* columns.
 * Cascade rule: mobile value if set, otherwise desktop value.
 */
function containerStyle(layer: Layer, isMobile = false): React.CSSProperties {
  const mode = resolvedFillMode(layer)
  if (mode === 'custom') {
    const x = (isMobile && layer.mobile_x_percent != null) ? layer.mobile_x_percent : layer.x_percent
    const y = (isMobile && layer.mobile_y_percent != null) ? layer.mobile_y_percent : layer.y_percent
    const w = (isMobile && layer.mobile_width_percent != null) ? layer.mobile_width_percent : (layer.width_percent ?? 50)
    const h = (isMobile && layer.mobile_height_percent != null) ? layer.mobile_height_percent : (layer.height_percent ?? 50)
    return {
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      width: `${w}%`,
      height: `${h}%`,
      opacity: layer.opacity,
      overflow: 'hidden',
    }
  }
  // stretch or crop — full-panel fill (mobile doesn't reposition fill layers)
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

// ── Text layer renderer (separate component so hooks are at top level) ────────

function TextLayerRenderer({ layer, isMobile = false }: { layer: Layer; isMobile?: boolean }): React.JSX.Element {
  const hasBg = Boolean(layer.background_color)
  const base = containerStyle(layer, isMobile)

  // Track panel pixel dimensions via ResizeObserver on the parent element.
  // The parent is the PanelLayers container (position:absolute, inset:0),
  // so its size equals the panel's rendered pixel size.
  const textContainerRef = useRef<HTMLDivElement>(null)
  const [panelSize, setPanelSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const el = textContainerRef.current
    if (!el) return
    const panel = el.parentElement
    if (!panel) return

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        const { width, height } = entry.contentRect
        setPanelSize({ w: width, h: height })
      }
    })
    ro.observe(panel)
    // Capture initial size immediately in case the observer fires late
    const rect = panel.getBoundingClientRect()
    if (rect.width > 0) setPanelSize({ w: rect.width, h: rect.height })
    return () => ro.disconnect()
  }, [])

  // Determine whether to render the Bezier tail (new interactive model)
  const useBezierTail =
    layer.text_layer_type === 'dialogue' &&
    layer.tip_x_percent != null &&
    layer.tip_y_percent != null &&
    panelSize != null

  let bezierTailSVG: React.JSX.Element | null = null
  if (useBezierTail && panelSize) {
    const pw = panelSize.w
    const ph = panelSize.h
    const bubbleState: BubbleState = {
      x: (layer.x_percent ?? 0) / 100 * pw,
      y: (layer.y_percent ?? 0) / 100 * ph,
      width: (layer.width_percent ?? 65) / 100 * pw,
      height: (layer.height_percent ?? 22) / 100 * ph,
      rx: layer.border_radius ?? 16,
      ry: layer.border_radius ?? 16,
    }
    const tip: Point = {
      x: layer.tip_x_percent! / 100 * pw,
      y: layer.tip_y_percent! / 100 * ph,
    }
    const { base: basePoint, tangent } = computeBasePoint(tip, bubbleState)
    const d = buildTailPath(basePoint, tangent, tip, BEZIER_HALF_WIDTH, BEZIER_CURVATURE)
    bezierTailSVG = (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      >
        <path
          d={d}
          fill={layer.background_color ?? '#ffffff'}
          stroke={(layer.has_stroke ?? true) ? (layer.stroke_color ?? '#DC5A8A') : 'none'}
          strokeWidth={layer.stroke_width ?? 1.5}
        />
      </svg>
    )
  }

  return (
    <div
      ref={textContainerRef}
      style={{
        ...base,
        backgroundColor: layer.background_color ?? undefined,
        borderRadius: layer.border_radius != null ? `${layer.border_radius}px` : undefined,
        border: (layer.text_layer_type === 'dialogue' && (layer.has_stroke ?? true))
          ? `${layer.stroke_width ?? 1.5}px solid ${layer.stroke_color ?? '#DC5A8A'}`
          : undefined,
        overflow: layer.has_tail ? 'visible' : base.overflow,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: hasBg ? '8px 12px' : '6px 8px',
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
      {useBezierTail
        ? bezierTailSVG
        : layer.has_tail && (
            <TailSVG
              direction={layer.tail_direction ?? 'bottom'}
              offset={layer.tail_offset_percent ?? 50}
              length={layer.tail_length ?? 40}
              bgColor={layer.background_color}
            />
          )
      }
    </div>
  )
}

// ── Single-layer renderer ──────────────────────────────────────────────────

interface LayerRendererProps {
  layer: Layer
  videoSfxEnabled: boolean
  musicEnabled: boolean
  videoVolume: number
  isMobile?: boolean
}

function LayerRenderer({ layer, videoSfxEnabled, musicEnabled, videoVolume, isMobile = false }: LayerRendererProps): React.JSX.Element | null {
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
    return <TextLayerRenderer layer={layer} isMobile={isMobile} />
  }

  if (!layer.media_url) return null

  const cStyle = containerStyle(layer, isMobile)
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
  /**
   * When true, hides layers with mobile_hidden=true and applies
   * mobile_x/y/w/h_percent overrides instead of the desktop values.
   */
  isMobile?: boolean
}

export default function PanelLayers({ layers, videoSfxEnabled, musicEnabled, videoVolume, isMobile = false }: PanelLayersProps): React.JSX.Element {
  // layers are already sorted ascending (low position = behind) by useReaderData.
  // In mobile view, filter out layers flagged as hidden on portrait screens.
  const visibleLayers = isMobile ? layers.filter(l => !l.mobile_hidden) : layers

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {visibleLayers.map((layer) => (
        <LayerRenderer
          key={layer.id}
          layer={layer}
          videoSfxEnabled={videoSfxEnabled}
          musicEnabled={musicEnabled}
          videoVolume={videoVolume}
          isMobile={isMobile}
        />
      ))}
    </div>
  )
}
