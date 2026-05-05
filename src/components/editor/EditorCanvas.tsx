// src/components/editor/EditorCanvas.tsx

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useToastStore } from '../../store/toastStore'
import { supabase } from '../../lib/supabase'
import { PANEL_HEIGHT_PRESETS, CINEMATIC_PANEL_HEIGHT, LAYER_DEFAULTS } from '../../types'
import type { PanelHeightPreset, Layer, FillMode } from '../../types'
import {
  ACCEPTED_MEDIA, getMediaType,
  uploadToPanelsBucket, panelLayerPath,
  validateMediaFile, registerAsset,
} from '../../lib/upload'
import AssetsFolder from './AssetsFolder'

// ── Constants ──────────────────────────────────────────────────────────────

const CANVAS_WIDTH = 400

const PRESET_LABELS: { key: PanelHeightPreset; label: string }[] = [
  { key: 'ACCENT', label: 'Accent' },
  { key: 'STANDARD', label: 'Standard' },
  { key: 'DRAMATIC', label: 'Dramatic' },
  { key: 'CINEMATIC', label: 'Cinematic' },
  { key: 'FULL', label: 'Full' },
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
  // custom — fill the positioned box
  return { objectFit: 'cover' }
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
  // NEW-B: track active drag to swap cursor from 'grab' → 'grabbing'
  const [isDragging, setIsDragging] = useState(false)

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

  // Image-pan drag: dragging an active crop-fill layer pans the image within
  // its frame by updating focal_x/y_percent relative to the drag delta.
  // Only called when the layer is already active (gated below in onMouseDown).
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

  const renderMedia = (): React.JSX.Element | null => {
    if (layer.media_type === 'text') {
      return (
        <textarea
          value={layer.text_content ?? ''}
          placeholder={isActive ? '' : 'Type here'}
          onChange={(e) => onUpdate({ text_content: e.target.value })}
          onMouseDown={(e) => {
            if (!isActive) {
              e.preventDefault()
              onSelect()
            } else {
              e.stopPropagation()
            }
          }}
          style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
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
            cursor: isActive ? 'text' : 'default',
            pointerEvents: 'auto',
          }}
        />
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

  // Cursor: text layers hand off cursor control to the textarea inside.
  // For media layers: grab for crop, move for custom.
  const cursor = !isActive
    ? 'default'
    : layer.media_type === 'text'
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
        // Two-click flow:
        // • Inactive layer → first click just selects (textarea handles its own click)
        // • Active text layer → outer div does nothing; textarea handles clicks
        // • Active crop layer �� drag updates focal point
        // • Active custom layer → drag moves the layer
        // • Active stretch layer → no drag
        !isActive
          ? (e) => { e.stopPropagation(); onSelect() }
          : layer.media_type === 'text'
            ? undefined
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
          {/* Corner handles */}
          <div style={{ position: 'absolute', top: -5, left: -5, width: 10, height: 10, background: '#DC5A8A', borderRadius: 2, cursor: 'nw-resize' }} onMouseDown={(e) => handleMouseDown(e, 'tl')} />
          <div style={{ position: 'absolute', top: -5, right: -5, width: 10, height: 10, background: '#DC5A8A', borderRadius: 2, cursor: 'ne-resize' }} onMouseDown={(e) => handleMouseDown(e, 'tr')} />
          <div style={{ position: 'absolute', bottom: -5, left: -5, width: 10, height: 10, background: '#DC5A8A', borderRadius: 2, cursor: 'sw-resize' }} onMouseDown={(e) => handleMouseDown(e, 'bl')} />
          <div style={{ position: 'absolute', bottom: -5, right: -5, width: 10, height: 10, background: '#DC5A8A', borderRadius: 2, cursor: 'se-resize' }} onMouseDown={(e) => handleMouseDown(e, 'br')} />
          {/* Edge handles */}
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
    setActiveLayerId, activeLayerId,
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
  const panelFileInputRef = useRef<HTMLInputElement>(null)

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
        position: panelLayers.length,
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
  const panelHeight = isCinematic ? CINEMATIC_PANEL_HEIGHT : (activePanel?.height ?? 240)

  useEffect(() => {
    if (activePanel) setCustomHeight(String(activePanel.height))
  }, [activePanelId])

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

  const handleAddTextLayer = useCallback(async (): Promise<void> => {
    if (!activePanelId || !story) return
    setIsAddingText(true)
    const panelLayers = layers.filter((l) => l.panel_id === activePanelId)
    const newLayer = {
      panel_id: activePanelId,
      story_id: story.id,
      position: panelLayers.length,
      media_type: 'text' as const,
      media_url: null,
      asset_id: null,
      name: null,
      x_percent: 10,
      y_percent: 75,
      width_percent: 80,
      height_percent: 20,
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
      text_content: 'Type here',
      font_family: 'DM Sans',
      font_size: 24,
      text_color: '#F5EEE8',
      font_weight: '400',
      text_align: 'left',
      line_height: 1.4,
      letter_spacing: 0,
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

  return (
    <div className="editor-canvas-area">
      {/* Toolbar */}
      <div className="editor-canvas-toolbar">
        {isCinematic ? (
          <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
            Cinematic — 400 × 640px fixed
          </span>
        ) : (
          <>
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', flexShrink: 0 }}>Height</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {PRESET_LABELS.map(({ key, label }) => {
                const isActive = activePresetKey === key
                return (
                  <button
                    key={key}
                    onClick={() => handlePreset(PANEL_HEIGHT_PRESETS[key])}
                    disabled={!activePanel}
                    className={isActive ? 'canvas-preset-btn canvas-preset-btn--active' : 'canvas-preset-btn'}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
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
            <div style={{ width: '1px', height: '20px', background: 'var(--border)', flexShrink: 0 }} />
          </>
        )}
      </div>

      {/* Canvas body: assets column + scrollable viewport */}
      <div className="editor-canvas-body">
        <div className="assets-column">
          <AssetsFolder />
        </div>

      {/* Viewport */}
      <div
        className="editor-canvas-viewport"
        onMouseDown={() => { setActiveLayerId(null); setRailTab('layers') }}
      >
        {!activePanel ? (
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-muted)' }}>
            Select a panel to edit
          </span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, flexShrink: 0 }}>
            {/* Panel frame */}
            <div
              style={{
                width: `30vw`,
                height: `88vh`,
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
                  aria-label="Add media to panel"
                >
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                    <rect x="2" y="2" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M14 9v10M9 14h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {isPanelUploading ? 'Uploading…' : 'Add media'}
                </button>
              )}

              {/* Hidden file input — always mounted so the add bar can reach it */}
              <input
                ref={panelFileInputRef}
                type="file"
                accept={ACCEPTED_MEDIA}
                onChange={handlePanelUpload}
                style={{ display: 'none' }}
                aria-hidden="true"
              />

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
                  panelWidth={CANVAS_WIDTH}
                  panelHeight={panelHeight}
                  isActive={layer.id === activeLayerId}
                  onSelect={() => { setActiveLayerId(layer.id); setRailTab('layers') }}
                  onUpdate={(updates) => handleLayerUpdate(layer.id, updates)}
                />
              ))}
            </div>

            {/* Persistent add bar — always visible when a panel is active */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => panelFileInputRef.current?.click()}
                disabled={isPanelUploading}
                className="canvas-preset-btn"
                aria-label="Add media layer"
              >
                {isPanelUploading ? 'Uploading…' : '+ Media'}
              </button>
              <button
                onClick={() => void handleAddTextLayer()}
                disabled={isAddingText}
                className="canvas-preset-btn"
                aria-label="Add text layer"
              >
                T Text
              </button>
            </div>
          </div>
        )}
      </div>
      </div>{/* end editor-canvas-body */}
    </div>
  )
}
