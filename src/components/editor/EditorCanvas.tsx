// src/components/editor/EditorCanvas.tsx

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useToastStore } from '../../store/toastStore'
import { supabase } from '../../lib/supabase'
import { PANEL_HEIGHT_PRESETS, CINEMATIC_PANEL_HEIGHT, BOOK_PAGE_HEIGHT, LAYER_DEFAULTS, TEXT_LAYER_TYPE_DEFAULTS } from '../../types'
import type { PanelHeightPreset, Layer, FillMode, TextLayerType, TailDirection } from '../../types'
import {
  ACCEPTED_MEDIA, getMediaType,
  uploadToPanelsBucket, panelLayerPath,
  validateMediaFile, registerAsset,
} from '../../lib/upload'
import AssetsFolder from './AssetsFolder'
import { SpeechBubble } from '../SpeechBubble'

// ── Constants ──────────────────────────────────────────────────────────────

const CANVAS_WIDTH = 400

const FORMAT_LABELS: { key: PanelHeightPreset; label: string; disabled: boolean }[] = [
  { key: 'WEBTOON', label: 'Webtoon', disabled: false },
  { key: 'BOOK',    label: 'Book',    disabled: true  },
  { key: 'COMIC',   label: 'Comic',   disabled: true  },
]

const TEXT_TYPE_OPTIONS: { type: TextLayerType; label: string; desc: string }[] = [
  { type: 'dialogue',  label: 'Dialogue',  desc: 'Speech bubble' },
  { type: 'narrative', label: 'Narrative', desc: 'Caption box' },
  { type: 'caption',   label: 'Caption',   desc: 'Subtitle bar' },
  { type: 'sound_fx',  label: 'Sound FX',  desc: 'Bold effect text' },
  { type: 'plain',     label: 'Plain',     desc: 'No preset style' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function resolvedFillMode(layer: Layer): FillMode {
  if (layer.fill_mode) return layer.fill_mode
  return layer.is_fill ? 'crop' : 'custom'
}

function getLayerStyle(layer: Layer): React.CSSProperties {
  const mode = resolvedFillMode(layer)
  if (mode === 'custom') {
    return {
      position: 'absolute',
      left: `${layer.x_percent}%`,
      top: `${layer.y_percent}%`,
      width: layer.width_percent != null ? `${layer.width_percent}%` : '50%',
      height: layer.height_percent != null ? `${layer.height_percent}%` : '50%',
      opacity: layer.opacity,
    }
  }
  return {
    position: 'absolute',
    inset: 0,
    opacity: layer.opacity,
  }
}

function getMediaObjectFit(layer: Layer): React.CSSProperties {
  const mode = resolvedFillMode(layer)
  if (mode === 'stretch') return { objectFit: 'fill' }
  if (mode === 'crop') {
    return {
      objectFit: 'cover',
      objectPosition: `${layer.focal_x_percent ?? 50}% ${layer.focal_y_percent ?? 50}%`,
    }
  }
  return { objectFit: 'cover' }
}

const TAIL_BASE = 22

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

  // Corner tails: 1×1 SVG with overflow visible, positioned at the corner
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

// ── Drag handle component ──────────────────────────────────────────────────

type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'r' | 'b' | 'l'

interface DragState {
  type: 'move' | ResizeHandle
  startX: number
  startY: number
  startXPercent: number
  startYPercent: number
  startWPercent: number
  startHPercent: number
  startAspectRatio: number
}

interface LayerCanvasProps {
  layer: Layer
  panelWidth: number
  panelHeight: number
  isActive: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<Layer>) => void
}

function LayerCanvas({ layer, panelWidth, panelHeight, isActive, onSelect, onUpdate }: LayerCanvasProps): React.JSX.Element {
  const dragRef = useRef<DragState | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isEditingText, setIsEditingText] = useState(false)

  useEffect(() => {
    if (!isActive) setIsEditingText(false)
  }, [isActive])

  const handleMouseDown = useCallback((e: React.MouseEvent, type: DragState['type']): void => {
    e.stopPropagation()
    e.preventDefault()
    onSelect()
    const startW = layer.width_percent ?? 50
    const startH = layer.height_percent ?? 50
    dragRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startXPercent: layer.x_percent,
      startYPercent: layer.y_percent,
      startWPercent: startW,
      startHPercent: startH,
      startAspectRatio: startH > 0 ? startW / startH : 1,
    }

    const handleMouseMove = (me: MouseEvent): void => {
      if (!dragRef.current) return
      const dx = ((me.clientX - dragRef.current.startX) / panelWidth) * 100
      const dy = ((me.clientY - dragRef.current.startY) / panelHeight) * 100
      const { type, startXPercent, startYPercent, startWPercent, startHPercent, startAspectRatio } = dragRef.current

      const clamp = (v: number, min: number, max: number): number => Math.round(Math.max(min, Math.min(max, v)) * 10) / 10

      if (type === 'move') {
        onUpdate({
          x_percent: clamp(startXPercent + dx, 0, 100),
          y_percent: clamp(startYPercent + dy, 0, 100),
        })
      } else if (type === 'br') {
        if (me.shiftKey) {
          const newW = clamp(startWPercent + dx, 5, 100)
          const newH = clamp(newW / startAspectRatio, 5, 100)
          onUpdate({ width_percent: newW, height_percent: newH })
        } else {
          onUpdate({
            width_percent: clamp(startWPercent + dx, 5, 100),
            height_percent: clamp(startHPercent + dy, 5, 100),
          })
        }
      } else if (type === 'bl') {
        if (me.shiftKey) {
          const newW = clamp(startWPercent - dx, 5, 100)
          const newH = clamp(newW / startAspectRatio, 5, 100)
          onUpdate({
            x_percent: clamp(startXPercent + (startWPercent - newW), 0, 100),
            width_percent: newW,
            height_percent: newH,
          })
        } else {
          onUpdate({
            x_percent: clamp(startXPercent + dx, 0, 100),
            width_percent: clamp(startWPercent - dx, 5, 100),
            height_percent: clamp(startHPercent + dy, 5, 100),
          })
        }
      } else if (type === 'tr') {
        if (me.shiftKey) {
          const newW = clamp(startWPercent + dx, 5, 100)
          const newH = clamp(newW / startAspectRatio, 5, 100)
          onUpdate({
            y_percent: clamp(startYPercent + (startHPercent - newH), 0, 100),
            width_percent: newW,
            height_percent: newH,
          })
        } else {
          onUpdate({
            y_percent: clamp(startYPercent + dy, 0, 100),
            width_percent: clamp(startWPercent + dx, 5, 100),
            height_percent: clamp(startHPercent - dy, 5, 100),
          })
        }
      } else if (type === 'tl') {
        if (me.shiftKey) {
          const newW = clamp(startWPercent - dx, 5, 100)
          const newH = clamp(newW / startAspectRatio, 5, 100)
          onUpdate({
            x_percent: clamp(startXPercent + (startWPercent - newW), 0, 100),
            y_percent: clamp(startYPercent + (startHPercent - newH), 0, 100),
            width_percent: newW,
            height_percent: newH,
          })
        } else {
          onUpdate({
            x_percent: clamp(startXPercent + dx, 0, 100),
            y_percent: clamp(startYPercent + dy, 0, 100),
            width_percent: clamp(startWPercent - dx, 5, 100),
            height_percent: clamp(startHPercent - dy, 5, 100),
          })
        }
      } else if (type === 'r') {
        onUpdate({ width_percent: clamp(startWPercent + dx, 5, 100) })
      } else if (type === 'l') {
        onUpdate({
          x_percent: clamp(startXPercent + dx, 0, 100),
          width_percent: clamp(startWPercent - dx, 5, 100),
        })
      } else if (type === 'b') {
        onUpdate({ height_percent: clamp(startHPercent + dy, 5, 100) })
      } else if (type === 't') {
        onUpdate({
          y_percent: clamp(startYPercent + dy, 0, 100),
          height_percent: clamp(startHPercent - dy, 5, 100),
        })
      }
    }

    const handleMouseUp = (): void => {
      dragRef.current = null
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [layer, panelWidth, panelHeight, onSelect, onUpdate])

  const style = getLayerStyle(layer)

  const handleFocalDrag = useCallback((e: React.MouseEvent): void => {
    e.stopPropagation()
    e.preventDefault()
    setIsDragging(true)

    const frame = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const startMouseX = e.clientX
    const startMouseY = e.clientY
    const startFocalX = layer.focal_x_percent ?? 50
    const startFocalY = layer.focal_y_percent ?? 50

    const update = (me: MouseEvent): void => {
      const dx = ((me.clientX - startMouseX) / frame.width) * 100
      const dy = ((me.clientY - startMouseY) / frame.height) * 100
      const x = Math.round(Math.max(0, Math.min(100, startFocalX + dx)) * 10) / 10
      const y = Math.round(Math.max(0, Math.min(100, startFocalY + dy)) * 10) / 10
      onUpdate({ focal_x_percent: x, focal_y_percent: y })
    }

    const up = (): void => {
      setIsDragging(false)
      window.removeEventListener('mousemove', update)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', update)
    window.addEventListener('mouseup', up)
  }, [layer.focal_x_percent, layer.focal_y_percent, onUpdate])

  const handleTailHandleDrag = useCallback((e: React.MouseEvent): void => {
    e.stopPropagation()
    e.preventDefault()
    const containerEl = (e.currentTarget as HTMLElement).parentElement
    if (!containerEl) return
    const rect = containerEl.getBoundingClientRect()
    const dir = layer.tail_direction ?? 'bottom'

    const update = (me: MouseEvent): void => {
      const raw = (dir === 'top' || dir === 'bottom')
        ? ((me.clientX - rect.left) / rect.width) * 100
        : ((me.clientY - rect.top) / rect.height) * 100
      onUpdate({ tail_offset_percent: Math.round(Math.max(5, Math.min(95, raw)) * 10) / 10 })
    }
    const up = (): void => {
      window.removeEventListener('mousemove', update)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', update)
    window.addEventListener('mouseup', up)
  }, [layer.tail_direction, onUpdate])

  const handleTailTipDrag = useCallback((e: React.MouseEvent): void => {
    e.stopPropagation()
    e.preventDefault()
    const containerEl = (e.currentTarget as HTMLElement).closest('[data-tail-container]') as HTMLElement | null
    if (!containerEl) return
    const rect = containerEl.getBoundingClientRect()
    const dir = layer.tail_direction ?? 'bottom'
    const isCorner = dir.includes('-')

    const update = (me: MouseEvent): void => {
      let dist: number
      if (isCorner) {
        const cx = dir.includes('right') ? rect.right : rect.left
        const cy = dir.includes('bottom') ? rect.bottom : rect.top
        const dx = Math.abs(me.clientX - cx)
        const dy = Math.abs(me.clientY - cy)
        dist = Math.sqrt(dx * dx + dy * dy) / 0.707
      } else if (dir === 'bottom') {
        dist = me.clientY - rect.bottom
      } else if (dir === 'top') {
        dist = rect.top - me.clientY
      } else if (dir === 'right') {
        dist = me.clientX - rect.right
      } else {
        dist = rect.left - me.clientX
      }
      onUpdate({ tail_length: Math.round(Math.max(10, Math.min(120, dist))) })
    }
    const up = (): void => {
      window.removeEventListener('mousemove', update)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', update)
    window.addEventListener('mouseup', up)
  }, [layer.tail_direction, onUpdate])

  const renderMedia = (): React.JSX.Element | null => {
    if (layer.media_type === 'text') {
      // Dialogue layers with tail use the interactive SVG speech bubble
      if (layer.text_layer_type === 'dialogue' && layer.has_tail) {
        return (
          <SpeechBubble
            layer={layer}
            panelWidth={panelWidth}
            panelHeight={panelHeight}
            isActive={isActive}
            isEditingText={isEditingText}
            onSelect={onSelect}
            onUpdate={onUpdate}
            onDoubleClick={() => setIsEditingText(true)}
            onExitEdit={() => setIsEditingText(false)}
          />
        )
      }

      const hasBg = Boolean(layer.background_color)
      const containerExtras: React.CSSProperties = {
        backgroundColor: layer.background_color ?? undefined,
        borderRadius: layer.border_radius != null ? `${layer.border_radius}px` : undefined,
        overflow: layer.has_tail ? 'visible' : 'hidden',
      }

      const sharedTextStyle: React.CSSProperties = {
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
        pointerEvents: 'auto',
      }

      const tailDir = layer.tail_direction ?? 'bottom'
      const tailOff = layer.tail_offset_percent ?? 50
      const tailLen = layer.tail_length ?? 40
      const isCornerDir = tailDir.includes('-')
      const tail = layer.has_tail ? (
        <TailSVG direction={tailDir} offset={tailOff} length={tailLen} bgColor={layer.background_color} />
      ) : null

      // Edge-slide handle position (cardinal directions only)
      const tailHandlePos: React.CSSProperties = (() => {
        switch (tailDir as 'top' | 'bottom' | 'left' | 'right') {
          case 'bottom': return { bottom: -6, left: `${tailOff}%`, transform: 'translateX(-50%)' }
          case 'top':    return { top: -6,    left: `${tailOff}%`, transform: 'translateX(-50%)' }
          case 'left':   return { left: -6,   top:  `${tailOff}%`, transform: 'translateY(-50%)' }
          case 'right':  return { right: -6,  top:  `${tailOff}%`, transform: 'translateY(-50%)' }
          default:       return {}
        }
      })()

      // Tip drag handle position (all 8 directions)
      const d6 = Math.round(tailLen * 0.707) + 6
      const tipHandlePos: React.CSSProperties = (() => {
        switch (tailDir) {
          case 'bottom':       return { bottom: -(tailLen + 6), left: `${tailOff}%`, transform: 'translateX(-50%)' }
          case 'top':          return { top:    -(tailLen + 6), left: `${tailOff}%`, transform: 'translateX(-50%)' }
          case 'right':        return { right:  -(tailLen + 6), top:  `${tailOff}%`, transform: 'translateY(-50%)' }
          case 'left':         return { left:   -(tailLen + 6), top:  `${tailOff}%`, transform: 'translateY(-50%)' }
          case 'bottom-right': return { bottom: -d6, right:  -d6 }
          case 'bottom-left':  return { bottom: -d6, left:   -d6 }
          case 'top-right':    return { top:    -d6, right:  -d6 }
          case 'top-left':     return { top:    -d6, left:   -d6 }
        }
      })()

      if (isEditingText) {
        return (
          <>
            <div style={{ ...style, ...containerExtras, border: isActive ? '1.5px solid #DC5A8A' : '1.5px solid transparent', boxSizing: 'border-box', cursor: 'default' }}>
              <textarea
                autoFocus
                value={layer.text_content ?? ''}
                onChange={(e) => onUpdate({ text_content: e.target.value })}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => { if (e.key === 'Escape') setIsEditingText(false) }}
                style={{
                  ...sharedTextStyle,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  cursor: 'text',
                }}
              />
              {tail}
            </div>
          </>
        )
      }

      return (
        <>
          <div
            data-tail-container
            style={{ ...style, ...containerExtras, border: isActive ? '1.5px solid #DC5A8A' : '1.5px solid transparent', boxSizing: 'border-box', cursor: isActive ? 'move' : 'default' }}
            onMouseDown={
              !isActive
                ? (e) => { e.stopPropagation(); onSelect() }
                : (e) => handleMouseDown(e, 'move')
            }
            onDoubleClick={() => setIsEditingText(true)}
          >
            <div style={{ ...sharedTextStyle, userSelect: 'none' }}>
              {layer.text_content || (
                <span style={{ opacity: 0.35 }}>Double-click to edit</span>
              )}
            </div>
            {tail}
            {isActive && (
              <>
                <div style={{ position: 'absolute', top: -5, left: -5, width: 10, height: 10, background: '#DC5A8A', borderRadius: 2, cursor: 'nw-resize' }} onMouseDown={(e) => handleMouseDown(e, 'tl')} />
                <div style={{ position: 'absolute', top: -5, right: -5, width: 10, height: 10, background: '#DC5A8A', borderRadius: 2, cursor: 'ne-resize' }} onMouseDown={(e) => handleMouseDown(e, 'tr')} />
                <div style={{ position: 'absolute', bottom: -5, left: -5, width: 10, height: 10, background: '#DC5A8A', borderRadius: 2, cursor: 'sw-resize' }} onMouseDown={(e) => handleMouseDown(e, 'bl')} />
                <div style={{ position: 'absolute', bottom: -5, right: -5, width: 10, height: 10, background: '#DC5A8A', borderRadius: 2, cursor: 'se-resize' }} onMouseDown={(e) => handleMouseDown(e, 'br')} />
                <div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', width: 10, height: 8, background: '#DC5A8A', borderRadius: 2, cursor: 'n-resize' }} onMouseDown={(e) => handleMouseDown(e, 't')} />
                <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 10, height: 8, background: '#DC5A8A', borderRadius: 2, cursor: 's-resize' }} onMouseDown={(e) => handleMouseDown(e, 'b')} />
                <div style={{ position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)', width: 8, height: 10, background: '#DC5A8A', borderRadius: 2, cursor: 'w-resize' }} onMouseDown={(e) => handleMouseDown(e, 'l')} />
                <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 8, height: 10, background: '#DC5A8A', borderRadius: 2, cursor: 'e-resize' }} onMouseDown={(e) => handleMouseDown(e, 'r')} />
                {layer.has_tail && !isCornerDir && (
                  <div
                    style={{ position: 'absolute', width: 12, height: 12, borderRadius: '50%', background: '#DC5A8A', border: '2px solid #fff', cursor: 'grab', zIndex: 10, ...tailHandlePos }}
                    onMouseDown={handleTailHandleDrag}
                  />
                )}
                {layer.has_tail && (
                  <div
                    style={{ position: 'absolute', width: 10, height: 10, borderRadius: '50%', background: '#fff', border: '2px solid #DC5A8A', cursor: 'crosshair', zIndex: 11, ...tipHandlePos }}
                    onMouseDown={handleTailTipDrag}
                  />
                )}
              </>
            )}
          </div>
        </>
      )
    }

    if (!layer.media_url) return null
    if (layer.media_type === 'audio') return null
    const fitStyle = getMediaObjectFit(layer)
    if (layer.media_type === 'video') {
      return (
        <video
          src={layer.media_url}
          style={{ width: '100%', height: '100%', display: 'block', ...fitStyle }}
          muted
          loop
          autoPlay
        />
      )
    }
    return (
      <img
        src={layer.media_url}
        alt=""
        style={{ width: '100%', height: '100%', display: 'block', ...fitStyle }}
        draggable={false}
      />
    )
  }

  const mode = resolvedFillMode(layer)

  // Text layers handle their own wrapper div inside renderMedia
  if (layer.media_type === 'text') {
    return <>{renderMedia()}</>
  }

  const cursor = !isActive
    ? 'default'
    : mode === 'crop'
      ? (isDragging ? 'grabbing' : 'grab')
      : mode === 'custom'
        ? 'move'
        : 'default'

  return (
    <div
      style={{
        ...style,
        cursor,
        boxSizing: 'border-box',
        border: isActive ? '1.5px solid #DC5A8A' : '1.5px solid transparent',
      }}
      onMouseDown={
        !isActive
          ? (e) => { e.stopPropagation(); onSelect() }
          : mode === 'crop'
            ? handleFocalDrag
            : mode === 'custom'
              ? (e) => handleMouseDown(e, 'move')
              : (e) => { e.stopPropagation() }
      }
    >
      {renderMedia()}

      {layer.media_type === 'audio' && (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(14,6,8,0.6)',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 9h4l5-5v16l-5-5H3V9z" stroke="#DC5A8A" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M17 9c1.5 1 2.5 2.5 2.5 3s-1 2-2.5 3" stroke="#DC5A8A" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      )}

      {/* Resize handles for text and custom-mode layers */}

      {isActive && mode === 'custom' && (
        <>
          <div style={{ position: 'absolute', top: -5, left: -5, width: 10, height: 10, background: '#DC5A8A', borderRadius: 2, cursor: 'nw-resize' }} onMouseDown={(e) => handleMouseDown(e, 'tl')} />
          <div style={{ position: 'absolute', top: -5, right: -5, width: 10, height: 10, background: '#DC5A8A', borderRadius: 2, cursor: 'ne-resize' }} onMouseDown={(e) => handleMouseDown(e, 'tr')} />
          <div style={{ position: 'absolute', bottom: -5, left: -5, width: 10, height: 10, background: '#DC5A8A', borderRadius: 2, cursor: 'sw-resize' }} onMouseDown={(e) => handleMouseDown(e, 'bl')} />
          <div style={{ position: 'absolute', bottom: -5, right: -5, width: 10, height: 10, background: '#DC5A8A', borderRadius: 2, cursor: 'se-resize' }} onMouseDown={(e) => handleMouseDown(e, 'br')} />
          <div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', width: 10, height: 8, background: '#DC5A8A', borderRadius: 2, cursor: 'n-resize' }} onMouseDown={(e) => handleMouseDown(e, 't')} />
          <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 10, height: 8, background: '#DC5A8A', borderRadius: 2, cursor: 's-resize' }} onMouseDown={(e) => handleMouseDown(e, 'b')} />
          <div style={{ position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)', width: 8, height: 10, background: '#DC5A8A', borderRadius: 2, cursor: 'w-resize' }} onMouseDown={(e) => handleMouseDown(e, 'l')} />
          <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 8, height: 10, background: '#DC5A8A', borderRadius: 2, cursor: 'e-resize' }} onMouseDown={(e) => handleMouseDown(e, 'r')} />
        </>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function EditorCanvas(): React.JSX.Element {
  const {
    panels, activePanelId, story, layers,
    updatePanel, updateLayer, addLayer, setSaveStatus,
    setActiveLayerId, setActivePanelId, activeLayerId,
    gridVisible, gridSize, toggleGrid,
    setRailTab,
  } = useEditorStore()
  const pushToast = useToastStore((s) => s.pushToast)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault()
        toggleGrid()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleGrid])

  const [customHeight, setCustomHeight] = useState<string>('')
  const [isPanelUploading, setIsPanelUploading] = useState(false)
  const [isAddingText, setIsAddingText] = useState(false)
  const [textTypeMenuOpen, setTextTypeMenuOpen] = useState(false)
  const textTypeMenuRef = useRef<HTMLDivElement>(null)
  const panelFileInputRef = useRef<HTMLInputElement>(null)
  const panelFrameRef = useRef<HTMLDivElement>(null)
  const spreadRef = useRef<HTMLDivElement>(null)
  const [displayedSize, setDisplayedSize] = useState({ w: CANVAS_WIDTH, h: CANVAS_WIDTH })
  const [displayedSpreadSize, setDisplayedSpreadSize] = useState({ w: 1592, h: 879 })

  useEffect(() => {
    const el = panelFrameRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setDisplayedSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = spreadRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setDisplayedSpreadSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Close text type menu on outside click
  useEffect(() => {
    if (!textTypeMenuOpen) return
    const onDoc = (e: MouseEvent): void => {
      if (textTypeMenuRef.current?.contains(e.target as Node)) return
      setTextTypeMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [textTypeMenuOpen])

  // Close text type menu on Escape
  useEffect(() => {
    if (!textTypeMenuOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setTextTypeMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [textTypeMenuOpen])

  const handlePanelUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file || !story || !activePanelId) return
    if (e.target) e.target.value = ''

    const mediaType = getMediaType(file)
    if (!mediaType) return

    try {
      validateMediaFile(file, 'media')
      setIsPanelUploading(true)
      setSaveStatus('saving')

      const path = panelLayerPath(story.id, activePanelId, file)
      const { url: mediaUrl } = await uploadToPanelsBucket(file, path)
      const assetId = await registerAsset(story.id, mediaType, mediaUrl, file.name)

      const panelLayers = layers.filter((l) => l.panel_id === activePanelId)
      const newLayer = {
        panel_id: activePanelId,
        story_id: story.id,
        position: panelLayers.reduce((max, l) => Math.max(max, l.position), -1) + 1,
        media_type: mediaType,
        media_url: mediaUrl,
        asset_id: assetId,
        name: file.name,
        ...LAYER_DEFAULTS[mediaType],
      }
      const { data, error } = await supabase.from('layers').insert(newLayer).select().single()
      if (error || !data) throw error
      addLayer(data as Layer)
      setSaveStatus('saved')
    } catch (err) {
      pushToast(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
      setSaveStatus('error')
    } finally {
      setIsPanelUploading(false)
    }
  }, [story, activePanelId, layers, addLayer, setSaveStatus, pushToast])

  const activePanel = panels.find((p) => p.id === activePanelId) ?? null
  const activePanelLayers = layers
    .filter((l) => l.panel_id === activePanelId)
    .sort((a, b) => a.position - b.position)

  const isCinematic = story?.reading_mode === 'cinematic'
  const isBook = story?.reading_mode === 'book'
  const panelHeight = isBook ? BOOK_PAGE_HEIGHT : isCinematic ? CINEMATIC_PANEL_HEIGHT : (activePanel?.height ?? 240)

  // Book-mode spread derivation
  const sortedPanels = isBook ? [...panels].sort((a, b) => a.position - b.position) : panels
  const activeIdx = isBook ? (activePanelId ? sortedPanels.findIndex((p) => p.id === activePanelId) : 0) : 0
  const spreadIdx = Math.max(0, Math.floor(activeIdx / 2))
  const leftPanel = isBook ? (sortedPanels[spreadIdx * 2] ?? null) : null
  const rightPanel = isBook ? (sortedPanels[spreadIdx * 2 + 1] ?? null) : null
  const leftPanelLayers = isBook && leftPanel
    ? layers.filter((l) => l.panel_id === leftPanel.id).sort((a, b) => a.position - b.position)
    : []
  const rightPanelLayers = isBook && rightPanel
    ? layers.filter((l) => l.panel_id === rightPanel.id).sort((a, b) => a.position - b.position)
    : []
  // Layers with is_spread_layer=true render in an overlay spanning the full spread (1592×879).
  // Page-local layers render inside their respective page frame (796×879).
  const spreadOverlayLayers = isBook
    ? [...leftPanelLayers, ...rightPanelLayers]
        .filter((l) => l.is_spread_layer)
        .sort((a, b) => a.position - b.position)
    : []
  const leftPageLayers = leftPanelLayers.filter((l) => !l.is_spread_layer)
  const rightPageLayers = rightPanelLayers.filter((l) => !l.is_spread_layer)

  useEffect(() => {
    if (activePanel) setCustomHeight(String(activePanel.height))
  }, [activePanelId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePreset = (height: number): void => {
    if (!activePanelId) return
    updatePanel(activePanelId, { height })
    setCustomHeight(String(height))
    setSaveStatus('unsaved')
  }

  const handleCustomHeight = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const raw = e.target.value
    setCustomHeight(raw)
    const num = parseInt(raw, 10)
    if (!isNaN(num) && activePanelId) {
      const clamped = Math.min(800, Math.max(80, num))
      updatePanel(activePanelId, { height: clamped })
      setSaveStatus('unsaved')
    }
  }

  const handleAddTextLayer = useCallback(async (type: TextLayerType): Promise<void> => {
    if (!activePanelId || !story) return
    setTextTypeMenuOpen(false)
    setIsAddingText(true)
    const panelLayers = layers.filter((l) => l.panel_id === activePanelId)
    const typeDefaults = TEXT_LAYER_TYPE_DEFAULTS[type]
    const newLayer = {
      panel_id: activePanelId,
      story_id: story.id,
      position: panelLayers.reduce((max, l) => Math.max(max, l.position), -1) + 1,
      media_type: 'text' as const,
      media_url: null,
      asset_id: null,
      name: null,
      is_fill: false,
      fill_mode: 'custom' as const,
      focal_x_percent: 50,
      focal_y_percent: 50,
      opacity: 1,
      autoplay: false,
      loop: false,
      muted: true,
      playback_rate: 1,
      panel_span_count: 1,
      ...typeDefaults,
    }
    const { data, error } = await supabase.from('layers').insert(newLayer).select().single()
    setIsAddingText(false)
    if (error || !data) {
      pushToast('Failed to add text layer', 'error')
      return
    }
    addLayer(data as Layer)
    setActiveLayerId((data as Layer).id)
    setRailTab('properties')
    setSaveStatus('unsaved')
  }, [activePanelId, story, layers, addLayer, setActiveLayerId, setRailTab, setSaveStatus, pushToast])

  const handleLayerUpdate = useCallback((layerId: string, updates: Partial<Layer>): void => {
    updateLayer(layerId, updates)
    setSaveStatus('unsaved')
  }, [updateLayer, setSaveStatus])

  const activePresetKey = (Object.entries(PANEL_HEIGHT_PRESETS) as [PanelHeightPreset, number][])
    .find(([, v]) => v === panelHeight)?.[0] ?? null

  const canAddLayer = Boolean(activePanelId)

  return (
    <div className="editor-canvas-area">
      {/* Toolbar */}
      <div className="editor-canvas-toolbar">
        {/* Left: add-layer actions (always shown) */}
        <AssetsFolder />

        <button
          onClick={() => panelFileInputRef.current?.click()}
          disabled={isPanelUploading || !canAddLayer}
          className="canvas-preset-btn"
          aria-label="Add content layer"
        >
          {isPanelUploading ? 'Uploading…' : '+ Content'}
        </button>

        {/* Text type dropdown */}
        <div ref={textTypeMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setTextTypeMenuOpen((o) => !o)}
            disabled={isAddingText || !canAddLayer}
            className={textTypeMenuOpen ? 'canvas-preset-btn canvas-preset-btn--active' : 'canvas-preset-btn'}
            aria-haspopup="menu"
            aria-expanded={textTypeMenuOpen}
            aria-label="Add text layer"
          >
            T ▾
          </button>

          {textTypeMenuOpen && (
            <div className="text-type-menu" role="menu">
              {TEXT_TYPE_OPTIONS.map(({ type, label, desc }) => (
                <button
                  key={type}
                  role="menuitem"
                  className="text-type-menu-item"
                  onClick={() => void handleAddTextLayer(type)}
                  disabled={isAddingText}
                >
                  <span className="text-type-menu-label">{label}</span>
                  <span className="text-type-menu-desc">{desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: 'var(--border)', flexShrink: 0, margin: '0 4px' }} />

        {/* Right: format controls */}
        {isCinematic ? (
          <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
            Cinematic — 400 × 640px fixed
          </span>
        ) : isBook ? (
          <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
            Book — 796 × 879px per page
          </span>
        ) : (
          <>
            {FORMAT_LABELS.map(({ key, label, disabled }) => {
              const isActive = activePresetKey === key
              return (
                <button
                  key={key}
                  onClick={() => !disabled && handlePreset(PANEL_HEIGHT_PRESETS[key])}
                  disabled={disabled || !activePanel}
                  title={disabled ? 'Coming soon' : undefined}
                  className={
                    disabled
                      ? 'canvas-preset-btn canvas-preset-btn--format-disabled'
                      : isActive
                        ? 'canvas-preset-btn canvas-preset-btn--active'
                        : 'canvas-preset-btn'
                  }
                >
                  {label}
                </button>
              )
            })}
            <input
              type="number"
              value={customHeight}
              onChange={handleCustomHeight}
              disabled={!activePanel}
              min={80}
              max={800}
              className="canvas-height-input"
              aria-label="Custom panel height in pixels"
            />
          </>
        )}
      </div>

      {/* Hidden file input — shared by book and single-panel modes */}
      <input
        ref={panelFileInputRef}
        type="file"
        accept={ACCEPTED_MEDIA}
        onChange={handlePanelUpload}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {/* Canvas body */}
      <div className="editor-canvas-body">
        <div
          className="editor-canvas-viewport"
          onMouseDown={() => { setActiveLayerId(null); setRailTab('layers') }}
        >
          {isBook ? (
            !leftPanel ? (
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-muted)' }}>
                Add a spread to start
              </span>
            ) : (
              <div className="editor-canvas-book-spread" ref={spreadRef}>
                {/* Left page */}
                <div
                  ref={panelFrameRef}
                  className={`editor-canvas-book-page${leftPanel.id === activePanelId ? ' editor-canvas-book-page--active' : ''}`}
                  onMouseDown={() => setActivePanelId(leftPanel.id)}
                >
                  {!leftPanelLayers.some((l) => l.media_type !== 'audio' && l.media_type !== 'text') && leftPanel.id === activePanelId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); panelFileInputRef.current?.click() }}
                      disabled={isPanelUploading}
                      className="canvas-empty-upload"
                      aria-label="Add content to panel"
                    >
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                        <rect x="2" y="2" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M14 9v10M9 14h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      {isPanelUploading ? 'Uploading…' : 'Add content'}
                    </button>
                  )}
                  {gridVisible && (
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        zIndex: 1000,
                        backgroundImage: `
                          linear-gradient(to right, rgba(220,90,138,0.28) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(220,90,138,0.28) 1px, transparent 1px)
                        `,
                        backgroundSize: `${gridSize}px ${gridSize}px`,
                        mixBlendMode: 'screen',
                      }}
                    />
                  )}
                  {leftPageLayers.map((layer) => (
                    <LayerCanvas
                      key={layer.id}
                      layer={layer}
                      panelWidth={displayedSize.w}
                      panelHeight={displayedSize.h}
                      isActive={layer.id === activeLayerId}
                      onSelect={() => {
                        setActivePanelId(leftPanel.id)
                        setActiveLayerId(layer.id)
                        setRailTab(layer.media_type === 'text' ? 'properties' : 'layers')
                      }}
                      onUpdate={(updates) => handleLayerUpdate(layer.id, updates)}
                    />
                  ))}
                  <div className="editor-canvas-book-page-num">{spreadIdx * 2 + 1}</div>
                </div>

                {/* Spine */}
                <div className="editor-canvas-book-spine" />

                {/* Right page */}
                {rightPanel ? (
                  <div
                    className={`editor-canvas-book-page${rightPanel.id === activePanelId ? ' editor-canvas-book-page--active' : ''}`}
                    onMouseDown={() => setActivePanelId(rightPanel.id)}
                  >
                    {!rightPanelLayers.some((l) => l.media_type !== 'audio' && l.media_type !== 'text') && rightPanel.id === activePanelId && (
                      <button
                        onClick={(e) => { e.stopPropagation(); panelFileInputRef.current?.click() }}
                        disabled={isPanelUploading}
                        className="canvas-empty-upload"
                        aria-label="Add content to panel"
                      >
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                          <rect x="2" y="2" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M14 9v10M9 14h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        {isPanelUploading ? 'Uploading…' : 'Add content'}
                      </button>
                    )}
                    {gridVisible && (
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          pointerEvents: 'none',
                          zIndex: 1000,
                          backgroundImage: `
                            linear-gradient(to right, rgba(220,90,138,0.28) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(220,90,138,0.28) 1px, transparent 1px)
                          `,
                          backgroundSize: `${gridSize}px ${gridSize}px`,
                          mixBlendMode: 'screen',
                        }}
                      />
                    )}
                    {rightPageLayers.map((layer) => (
                      <LayerCanvas
                        key={layer.id}
                        layer={layer}
                        panelWidth={displayedSize.w}
                        panelHeight={displayedSize.h}
                        isActive={layer.id === activeLayerId}
                        onSelect={() => {
                          setActivePanelId(rightPanel.id)
                          setActiveLayerId(layer.id)
                          setRailTab(layer.media_type === 'text' ? 'properties' : 'layers')
                        }}
                        onUpdate={(updates) => handleLayerUpdate(layer.id, updates)}
                      />
                    ))}
                    <div className="editor-canvas-book-page-num">{spreadIdx * 2 + 2}</div>
                  </div>
                ) : (
                  <div className="editor-canvas-book-page editor-canvas-book-page--empty">
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--text-faint)' }}>—</span>
                  </div>
                )}

                {/* Spread overlay — layers with is_spread_layer=true, coords relative to full 800px spread */}
                {spreadOverlayLayers.length > 0 && (
                  <div className="editor-canvas-book-spread-overlay">
                    {spreadOverlayLayers.map((layer) => (
                      <LayerCanvas
                        key={layer.id}
                        layer={layer}
                        panelWidth={displayedSpreadSize.w}
                        panelHeight={displayedSpreadSize.h}
                        isActive={layer.id === activeLayerId}
                        onSelect={() => {
                          setActivePanelId(layer.panel_id)
                          setActiveLayerId(layer.id)
                          setRailTab(layer.media_type === 'text' ? 'properties' : 'layers')
                        }}
                        onUpdate={(updates) => handleLayerUpdate(layer.id, updates)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          ) : !activePanel ? (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-muted)' }}>
              Select a panel to edit
            </span>
          ) : (
            <>
              {/* Panel frame */}
              <div
                ref={panelFrameRef}
                style={{
                  width: '100%',
                  maxWidth: '30vw',
                  aspectRatio: `400 / ${panelHeight}`,
                  background: 'var(--bg-dd)',
                  border: '1px solid var(--border)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                {!activePanelLayers.some((l) => l.media_type !== 'audio' && l.media_type !== 'text') && (
                  <button
                    onClick={() => panelFileInputRef.current?.click()}
                    disabled={isPanelUploading}
                    className="canvas-empty-upload"
                    aria-label="Add content to panel"
                  >
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                      <rect x="2" y="2" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M14 9v10M9 14h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {isPanelUploading ? 'Uploading…' : 'Add content'}
                  </button>
                )}

                {gridVisible && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      zIndex: 1000,
                      backgroundImage: `
                        linear-gradient(to right, rgba(220,90,138,0.28) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(220,90,138,0.28) 1px, transparent 1px)
                      `,
                      backgroundSize: `${gridSize}px ${gridSize}px`,
                      mixBlendMode: 'screen',
                    }}
                  />
                )}

                {activePanelLayers.map((layer) => (
                  <LayerCanvas
                    key={layer.id}
                    layer={layer}
                    panelWidth={displayedSize.w}
                    panelHeight={displayedSize.h}
                    isActive={layer.id === activeLayerId}
                    onSelect={() => { setActiveLayerId(layer.id); setRailTab(layer.media_type === 'text' ? 'properties' : 'layers') }}
                    onUpdate={(updates) => handleLayerUpdate(layer.id, updates)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
