// src/components/editor/EditorRail.tsx

import React, { useRef, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useToastStore } from '../../store/toastStore'
import { supabase } from '../../lib/supabase'
import { ACCEPTED_COVER, coverPath, uploadToPanelsBucket, validateMediaFile } from '../../lib/upload'
import type { ContentRating, FillMode, ReadingMode, TransitionStyle } from '../../types'

function resolvedFillMode(layer: { fill_mode: FillMode | null; is_fill: boolean }): FillMode {
  if (layer.fill_mode) return layer.fill_mode
  return layer.is_fill ? 'crop' : 'custom'
}

// ── Constants ──────────────────────────────────────────────────────────────

const TRANSITION_PRESETS: { id: TransitionStyle; label: string; description: string; enabled: boolean }[] = [
  { id: 'stacked', label: 'Stacked Cards', description: 'Outgoing page stays pinned; incoming slides up with scale.', enabled: true },
  { id: 'fade', label: 'Fade', description: 'Smooth opacity crossfade between panels.', enabled: true },
]

const RATING_OPTIONS: { value: ContentRating; label: string; desc: string }[] = [
  { value: 'mature', label: 'Mature', desc: 'Age gate' },
  { value: 'explicit', label: 'Explicit', desc: 'Age + consent' },
]

const READING_MODE_OPTIONS: { value: ReadingMode; label: string; desc: string }[] = [
  { value: 'cinematic', label: 'Cinematic', desc: '400 × 640px, transitions' },
  { value: 'scroll', label: 'Scroll', desc: 'Variable height, continuous' },
]

const MIN_OPACITY = 0
const MAX_OPACITY = 1
const OPACITY_STEP = 0.05

const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const

// ── Section header ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="rail-section-label">{children}</div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function EditorRail(): React.JSX.Element {
  const {
    editorMode, activePanelId, activeLayerId,
    panels, layers, story,
    updateLayer, updateStory, deleteLayer,
    setActiveLayerId, setSaveStatus,
    railTab, setRailTab,
    updateAsset,
  } = useEditorStore()
  const pushToast = useToastStore((s) => s.pushToast)
  const selectedTransition: TransitionStyle = story?.transition_style ?? 'stacked'
  const transitionDuration = story?.transition_duration_ms ?? 600
  const setSelectedTransition = (id: TransitionStyle): void => {
    updateStory({ transition_style: id })
    setSaveStatus('unsaved')
  }
  const setTransitionDuration = (ms: number): void => {
    updateStory({ transition_duration_ms: ms })
    setSaveStatus('unsaved')
  }
  const [copyLabel, setCopyLabel] = useState('Copy')
  const [publishLoading, setPublishLoading] = useState(false)
  const [publishConfirm, setPublishConfirm] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const activePanel = panels.find((p) => p.id === activePanelId) ?? null
  const activeLayer = layers.find((l) => l.id === activeLayerId) ?? null
  const activePanelLayers = layers
    .filter((l) => l.panel_id === activePanelId)
    .sort((a, b) => a.position - b.position)

  const isCinematic = story?.reading_mode === 'cinematic'

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleCopyUrl = (): void => {
    if (!story) return
    const url = `${window.location.origin}/u/${story.username}/s/${story.slug}`
    void navigator.clipboard.writeText(url).then(() => {
      setCopyLabel('Copied!')
      setTimeout(() => setCopyLabel('Copy'), 2000)
    })
  }

  const handleGoLive = async (): Promise<void> => {
    if (!story) return
    const newPublished = !story.is_published
    setPublishLoading(true)
    const { error } = await supabase
      .from('stories')
      .update({ is_published: newPublished, updated_at: new Date().toISOString() })
      .eq('id', story.id)
    setPublishLoading(false)
    if (!error) {
      updateStory({ is_published: newPublished })
      if (newPublished) {
        setPublishConfirm(true)
        setTimeout(() => setPublishConfirm(false), 3000)
      }
    }
  }

  const handleDeleteLayer = async (layerId: string): Promise<void> => {
    const { error } = await supabase.from('layers').delete().eq('id', layerId)
    if (error) { setSaveStatus('error'); return }
    deleteLayer(layerId)
  }

  const handleLayerUpdate = (updates: Parameters<typeof updateLayer>[1]): void => {
    if (!activeLayerId) return
    updateLayer(activeLayerId, updates)
    setSaveStatus('unsaved')
  }

  // When the layer name field blurs, sync the new name back to the asset
  // record so the assets modal stays consistent.
  const handleLayerNameBlur = (): void => {
    const layer = activeLayer
    if (!layer?.asset_id || !layer.name?.trim()) return
    const trimmed = layer.name.trim()
    void supabase
      .from('assets')
      .update({ filename: trimmed })
      .eq('id', layer.asset_id)
      .then(({ error }) => {
        if (!error) updateAsset(layer.asset_id!, { filename: trimmed })
      })
  }

  const handleMoveLayer = (layerId: string, direction: 'up' | 'down'): void => {
    const index = activePanelLayers.findIndex((l) => l.id === layerId)
    if (direction === 'up' && index === activePanelLayers.length - 1) return
    if (direction === 'down' && index === 0) return

    const swapIndex = direction === 'up' ? index + 1 : index - 1
    const swapLayer = activePanelLayers[swapIndex]
    const originalPosition = activePanelLayers[index].position

    updateLayer(layerId, { position: swapLayer.position })
    updateLayer(swapLayer.id, { position: originalPosition })
    setSaveStatus('unsaved')
  }

  const handleReadingModeChange = (mode: ReadingMode): void => {
    updateStory({ reading_mode: mode })
    setSaveStatus('unsaved')
  }

  const BIO_MAX = 600

  const handleBioChange = (value: string): void => {
    updateStory({ creator_bio: value.slice(0, BIO_MAX) })
    setSaveStatus('unsaved')
  }

  const handleLinkChange = (index: number, field: 'label' | 'url', value: string): void => {
    const links = [...(story?.creator_links ?? [])]
    links[index] = { ...links[index], [field]: value }
    updateStory({ creator_links: links })
    setSaveStatus('unsaved')
  }

  const handleAddLink = (): void => {
    const links = [...(story?.creator_links ?? []), { label: '', url: '' }]
    updateStory({ creator_links: links })
    setSaveStatus('unsaved')
  }

  const handleRemoveLink = (index: number): void => {
    const links = (story?.creator_links ?? []).filter((_, i) => i !== index)
    updateStory({ creator_links: links })
    setSaveStatus('unsaved')
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file || !story) return
    setCoverUploading(true)
    setSaveStatus('saving')
    try {
      validateMediaFile(file, 'cover')
      const { url } = await uploadToPanelsBucket(file, coverPath(story.id, file))
      const { error } = await supabase
        .from('stories')
        .update({ cover_url: url })
        .eq('id', story.id)
      if (error) throw error
      updateStory({ cover_url: url })
      setSaveStatus('saved')
    } catch (err: unknown) {
      setSaveStatus('error')
      const msg = err instanceof Error ? err.message : 'Unknown error'
      pushToast(`Cover upload failed: ${msg}`, 'error')
    } finally {
      setCoverUploading(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  const handleCoverClear = async (): Promise<void> => {
    if (!story) return
    setSaveStatus('saving')
    const { error } = await supabase
      .from('stories')
      .update({ cover_url: null })
      .eq('id', story.id)
    if (error) {
      setSaveStatus('error')
      return
    }
    updateStory({ cover_url: null })
    setSaveStatus('saved')
  }

  const isValidUrl = (url: string): boolean => {
    if (url.length === 0) return true // empty is fine until user fills it
    try {
      const u = new URL(url)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  }

  // ── DESIGN MODE ────────────────────────────────────────────────────────

  if (editorMode === 'design') {
    return (
      <aside className="editor-rail" aria-label="Layer properties">
        {/* Tab bar */}
        <div className="rail-tabs">
          {(['properties', 'layers'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setRailTab(tab)}
              className={railTab === tab ? 'rail-tab rail-tab--active' : 'rail-tab'}
            >
              {tab === 'properties' ? 'Properties' : 'Layers'}
            </button>
          ))}
        </div>

        {/* Layers tab */}
        {railTab === 'layers' ? (
          <div className="rail-section">
            {activePanelLayers.length === 0 ? (
              <div className="rail-empty">No layers on this panel</div>
            ) : (
              <div className="layers-list">
                {[...activePanelLayers].reverse().map((layer, reversedIndex) => {
                  const index = activePanelLayers.length - 1 - reversedIndex
                  const isActive = layer.id === activeLayerId
                  return (
                    <div
                      key={layer.id}
                      className={isActive ? 'layer-row layer-row--active' : 'layer-row'}
                      onClick={() => setActiveLayerId(layer.id)}
                    >
                      <div className="layer-row-icon" aria-hidden="true">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <rect x="1" y="1" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1"/>
                        </svg>
                      </div>
                      <span className="layer-row-label">{layer.name?.trim() || layer.media_type}</span>
                      <div className="layer-row-actions">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveLayer(layer.id, 'up') }}
                          disabled={index === activePanelLayers.length - 1}
                          className="layer-action-btn"
                          aria-label="Move layer up (forward)"
                        >
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                            <path d="M4 6.5V1.5M1.5 4L4 1.5 6.5 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveLayer(layer.id, 'down') }}
                          disabled={index === 0}
                          className="layer-action-btn"
                          aria-label="Move layer down (backward)"
                        >
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                            <path d="M4 1.5v5M1.5 4L4 6.5 6.5 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); void handleDeleteLayer(layer.id) }}
                          className="layer-action-btn layer-action-btn--delete"
                          aria-label="Delete layer"
                        >
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                            <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* Properties tab */
          <div className="rail-section">
            {!activeLayer ? (
              <div className="rail-empty">
                {activePanel ? 'Select a layer to edit its properties' : 'Select a panel to begin'}
              </div>
            ) : (
              <>
                <SectionLabel>Name</SectionLabel>
                <div className="rail-row" style={{ marginBottom: 8 }}>
                  <input
                    type="text"
                    value={activeLayer.name ?? ''}
                    onChange={(e) => handleLayerUpdate({ name: e.target.value })}
                    onBlur={handleLayerNameBlur}
                    placeholder={activeLayer.media_type}
                    aria-label="Layer name"
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      fontSize: '12px',
                      background: 'rgba(0,0,0,0.25)',
                      color: 'rgba(245,238,232,0.9)',
                      border: '1px solid rgba(245,238,232,0.15)',
                      borderRadius: '4px',
                    }}
                  />
                </div>

                {activeLayer.media_type !== 'audio' && (
                <><SectionLabel>Fill Mode</SectionLabel>
                {(() => {
                  const currentMode = resolvedFillMode(activeLayer)
                  const FILL_MODES: { id: FillMode; label: string; desc: string }[] = [
                    { id: 'crop',    label: 'Crop',    desc: 'Covers panel, preserves proportions. Drag image to set focal point.' },
                    { id: 'stretch', label: 'Stretch', desc: 'Covers panel, ignores proportions.' },
                    { id: 'custom',  label: 'Custom',  desc: 'Free position and size via drag handles.' },
                  ]
                  return (
                    <div className="rail-option-list" style={{ marginBottom: 8 }}>
                      {FILL_MODES.map(({ id, label, desc }) => (
                        <button
                          key={id}
                          onClick={() => handleLayerUpdate({
                            fill_mode: id,
                            is_fill: id !== 'custom',
                          })}
                          className={currentMode === id ? 'rail-option-btn rail-option-btn--active' : 'rail-option-btn'}
                          aria-pressed={currentMode === id}
                        >
                          <div className="rail-option-label">{label}</div>
                          <div className="rail-option-desc">{desc}</div>
                        </button>
                      ))}
                    </div>
                  )
                })()}

                {/* Focal-point numeric inputs (backup to canvas drag) */}
                {resolvedFillMode(activeLayer) === 'crop' && (
                  <>
                    <SectionLabel>Focal Point</SectionLabel>
                    <div className="rail-hint" style={{ marginBottom: 6 }}>Drag the image on the canvas to reposition, or type exact values below.</div>
                    <div className="rail-row">
                      <span className="rail-row-label">X</span>
                      <div className="rail-input-group">
                        <input
                          type="number"
                          value={Math.round((activeLayer.focal_x_percent ?? 50) * 10) / 10}
                          min={0} max={100} step={1}
                          onChange={(e) => handleLayerUpdate({ focal_x_percent: parseFloat(e.target.value) })}
                          className="rail-number-input"
                          aria-label="Focal point X percent"
                        />
                        <span className="rail-input-unit">%</span>
                      </div>
                    </div>
                    <div className="rail-row">
                      <span className="rail-row-label">Y</span>
                      <div className="rail-input-group">
                        <input
                          type="number"
                          value={Math.round((activeLayer.focal_y_percent ?? 50) * 10) / 10}
                          min={0} max={100} step={1}
                          onChange={(e) => handleLayerUpdate({ focal_y_percent: parseFloat(e.target.value) })}
                          className="rail-number-input"
                          aria-label="Focal point Y percent"
                        />
                        <span className="rail-input-unit">%</span>
                      </div>
                    </div>
                  </>
                )}

                {resolvedFillMode(activeLayer) === 'custom' && (
                  <>
                    <SectionLabel>Position</SectionLabel>
                    <div className="rail-row">
                      <span className="rail-row-label">X</span>
                      <div className="rail-input-group">
                        <input
                          type="number"
                          value={Math.round(activeLayer.x_percent * 10) / 10}
                          min={0} max={100} step={0.5}
                          onChange={(e) => handleLayerUpdate({ x_percent: parseFloat(e.target.value) })}
                          className="rail-number-input"
                          aria-label="X position percent"
                        />
                        <span className="rail-input-unit">%</span>
                      </div>
                    </div>
                    <div className="rail-row">
                      <span className="rail-row-label">Y</span>
                      <div className="rail-input-group">
                        <input
                          type="number"
                          value={Math.round(activeLayer.y_percent * 10) / 10}
                          min={0} max={100} step={0.5}
                          onChange={(e) => handleLayerUpdate({ y_percent: parseFloat(e.target.value) })}
                          className="rail-number-input"
                          aria-label="Y position percent"
                        />
                        <span className="rail-input-unit">%</span>
                      </div>
                    </div>

                    <SectionLabel>Size</SectionLabel>
                    <div className="rail-row">
                      <span className="rail-row-label">W</span>
                      <div className="rail-input-group">
                        <input
                          type="number"
                          value={Math.round((activeLayer.width_percent ?? 50) * 10) / 10}
                          min={5} max={100} step={0.5}
                          onChange={(e) => handleLayerUpdate({ width_percent: parseFloat(e.target.value) })}
                          className="rail-number-input"
                          aria-label="Layer width percent"
                        />
                        <span className="rail-input-unit">%</span>
                      </div>
                    </div>
                    <div className="rail-row">
                      <span className="rail-row-label">H</span>
                      <div className="rail-input-group">
                        <input
                          type="number"
                          value={Math.round((activeLayer.height_percent ?? 50) * 10) / 10}
                          min={5} max={100} step={0.5}
                          onChange={(e) => handleLayerUpdate({ height_percent: parseFloat(e.target.value) })}
                          className="rail-number-input"
                          aria-label="Layer height percent"
                        />
                        <span className="rail-input-unit">%</span>
                      </div>
                    </div>
                  </>
                )}

                </>) /* end audio guard */}

                <SectionLabel>Opacity</SectionLabel>
                <div className="rail-row">
                  <input
                    type="range"
                    min={MIN_OPACITY}
                    max={MAX_OPACITY}
                    step={OPACITY_STEP}
                    value={activeLayer.opacity}
                    onChange={(e) => handleLayerUpdate({ opacity: parseFloat(e.target.value) })}
                    className="rail-slider"
                    aria-label="Layer opacity"
                  />
                  <span className="rail-slider-value">
                    {Math.round(activeLayer.opacity * 100)}%
                  </span>
                </div>

                {activeLayer.media_type === 'audio' && (
                  <>
                    <SectionLabel>Audio Settings</SectionLabel>
                    <div className="rail-row">
                      <span className="rail-row-label">Autoplay</span>
                      <button
                        role="switch"
                        aria-checked={activeLayer.autoplay}
                        onClick={() => handleLayerUpdate({ autoplay: !activeLayer.autoplay })}
                        className={activeLayer.autoplay ? 'rail-toggle rail-toggle--on' : 'rail-toggle'}
                      >
                        <span className="rail-toggle-thumb" />
                      </button>
                    </div>
                    <div className="rail-row">
                      <span className="rail-row-label">Loop</span>
                      <button
                        role="switch"
                        aria-checked={activeLayer.loop}
                        onClick={() => handleLayerUpdate({ loop: !activeLayer.loop })}
                        className={activeLayer.loop ? 'rail-toggle rail-toggle--on' : 'rail-toggle'}
                      >
                        <span className="rail-toggle-thumb" />
                      </button>
                    </div>
                    <div className="rail-row">
                      <span className="rail-row-label">Muted</span>
                      <button
                        role="switch"
                        aria-checked={activeLayer.muted}
                        onClick={() => handleLayerUpdate({ muted: !activeLayer.muted })}
                        className={activeLayer.muted ? 'rail-toggle rail-toggle--on' : 'rail-toggle'}
                      >
                        <span className="rail-toggle-thumb" />
                      </button>
                    </div>
                    <div className="rail-row">
                      <span className="rail-row-label">Span panels</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        step={1}
                        value={activeLayer.panel_span_count ?? 1}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value, 10)
                          const clamped = Number.isFinite(raw) ? Math.min(10, Math.max(1, raw)) : 1
                          handleLayerUpdate({ panel_span_count: clamped })
                        }}
                        aria-label="Number of consecutive panels this audio plays across"
                        style={{
                          width: '56px',
                          padding: '4px 6px',
                          fontSize: '12px',
                          background: 'rgba(0,0,0,0.25)',
                          color: 'rgba(245,238,232,0.9)',
                          border: '1px solid rgba(245,238,232,0.15)',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </>
                )}

                {activeLayer.media_type === 'video' && (
                  <>
                    <SectionLabel>Video Settings</SectionLabel>
                    <div className="rail-row">
                      <span className="rail-row-label">Autoplay</span>
                      <button
                        role="switch"
                        aria-checked={activeLayer.autoplay}
                        onClick={() => handleLayerUpdate({ autoplay: !activeLayer.autoplay })}
                        className={activeLayer.autoplay ? 'rail-toggle rail-toggle--on' : 'rail-toggle'}
                      >
                        <span className="rail-toggle-thumb" />
                      </button>
                    </div>
                    <div className="rail-row">
                      <span className="rail-row-label">Loop</span>
                      <button
                        role="switch"
                        aria-checked={activeLayer.loop}
                        onClick={() => handleLayerUpdate({ loop: !activeLayer.loop })}
                        className={activeLayer.loop ? 'rail-toggle rail-toggle--on' : 'rail-toggle'}
                      >
                        <span className="rail-toggle-thumb" />
                      </button>
                    </div>
                    <div className="rail-row">
                      <span className="rail-row-label">Muted</span>
                      <button
                        role="switch"
                        aria-checked={activeLayer.muted}
                        onClick={() => handleLayerUpdate({ muted: !activeLayer.muted })}
                        className={activeLayer.muted ? 'rail-toggle rail-toggle--on' : 'rail-toggle'}
                      >
                        <span className="rail-toggle-thumb" />
                      </button>
                    </div>
                    <div className="rail-row">
                      <span className="rail-row-label">Speed</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {PLAYBACK_RATES.map((rate) => {
                          const isActive = Math.abs(activeLayer.playback_rate - rate) < 0.01
                          return (
                            <button
                              key={rate}
                              type="button"
                              onClick={() => handleLayerUpdate({ playback_rate: rate })}
                              className={isActive ? 'rail-option-btn rail-option-btn--active' : 'rail-option-btn'}
                              aria-pressed={isActive}
                              style={{ padding: '4px 8px', fontSize: '11px', minWidth: '40px' }}
                            >
                              {rate}×
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                <SectionLabel>Delete</SectionLabel>
                <div className="rail-section-inner">
                  <button
                    onClick={() => void handleDeleteLayer(activeLayer.id)}
                    className="rail-delete-btn"
                  >
                    Remove layer
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </aside>
    )
  }

  // ── PUBLISH MODE ────────────────────────────────────────────────────────

  const shareUrl = `${window.location.origin}/u/${story?.username ?? ''}/s/${story?.slug ?? ''}`

  return (
    <aside className="editor-rail" aria-label="Publish">
      <div className="rail-header">
        <SectionLabel>Publish</SectionLabel>
      </div>
      <div className="rail-section">

        <SectionLabel>Share URL</SectionLabel>
        <div className="rail-url-row">
          <span className="rail-url-text">{shareUrl}</span>
          <button onClick={handleCopyUrl} className={copyLabel === 'Copied!' ? 'rail-copy-btn rail-copy-btn--copied' : 'rail-copy-btn'}>
            {copyLabel}
          </button>
        </div>
        <div className="rail-hint">This URL is permanent and won't change if you rename the story.</div>

        <SectionLabel>Reading Mode</SectionLabel>
        <div className="rail-option-list">
          {READING_MODE_OPTIONS.map(({ value, label, desc }) => {
            const isSelected = story?.reading_mode === value
            return (
              <button
                key={value}
                onClick={() => handleReadingModeChange(value)}
                className={isSelected ? 'rail-option-btn rail-option-btn--active' : 'rail-option-btn'}
                aria-pressed={isSelected}
              >
                <div className="rail-option-label">{label}</div>
                <div className="rail-option-desc">{desc}</div>
              </button>
            )
          })}
        </div>

        {isCinematic && (
          <>
            <SectionLabel>Transition Style</SectionLabel>
            <div className="rail-option-list">
              {TRANSITION_PRESETS.filter(p => p.enabled).map(({ id, label, description }) => {
                const isSelected = selectedTransition === id
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedTransition(id)}
                    className={isSelected ? 'rail-option-btn rail-option-btn--active' : 'rail-option-btn'}
                    aria-pressed={isSelected}
                  >
                    <div className="rail-option-label">{label}</div>
                    <div className="rail-option-desc">{description}</div>
                  </button>
                )
              })}
            </div>
            <div style={{ marginTop: '16px' }}>
              <div className="rail-row" style={{ marginBottom: '8px' }}>
                <SectionLabel>Animation Duration</SectionLabel>
                <span className="rail-slider-value">{transitionDuration}ms</span>
              </div>
              <input
                type="range"
                min={200}
                max={2400}
                step={50}
                value={transitionDuration}
                onChange={(e) => setTransitionDuration(Number(e.target.value))}
                className="rail-slider"
                aria-label="Transition duration"
              />
              <div className="rail-hint">Speed of arrow-key and button navigation.</div>
            </div>
          </>
        )}

        <SectionLabel>Content Rating</SectionLabel>
        <div className="rail-option-list">
          {RATING_OPTIONS.map(({ value, label, desc }) => {
            const isSelected = story?.content_rating === value
            return (
              <button
                key={value}
                onClick={() => { updateStory({ content_rating: value }); setSaveStatus('unsaved') }}
                className={isSelected ? 'rail-option-btn rail-option-btn--active' : 'rail-option-btn'}
                aria-pressed={isSelected}
              >
                <div className="rail-option-label">{label}</div>
                <div className="rail-option-desc">{desc}</div>
              </button>
            )
          })}
        </div>

        <SectionLabel>Access</SectionLabel>
        <div className="rail-row" style={{ opacity: 0.4 }}>
          <span className="rail-row-label">Password protect</span>
          <div className="rail-toggle" aria-disabled="true" />
        </div>
        <div className="rail-hint">Coming in next phase</div>

        <SectionLabel>Creator Bio</SectionLabel>
        <div className="rail-section-inner">
          <textarea
            className="rail-textarea"
            placeholder="A short description shown on the end page."
            value={story?.creator_bio ?? ''}
            onChange={(e) => handleBioChange(e.target.value)}
            maxLength={BIO_MAX}
            aria-label="Creator bio"
          />
          <div className="rail-char-count">{(story?.creator_bio ?? '').length} / {BIO_MAX}</div>
        </div>

        <SectionLabel>Creator Links</SectionLabel>
        <div className="rail-section-inner">
          {(story?.creator_links ?? []).map((link, i) => (
            <div key={i} className="rail-link-row">
              <input
                type="text"
                className="rail-text-input"
                placeholder="Label"
                value={link.label}
                onChange={(e) => handleLinkChange(i, 'label', e.target.value)}
                aria-label={`Link ${i + 1} label`}
              />
              <input
                type="url"
                className={isValidUrl(link.url) ? 'rail-text-input' : 'rail-text-input rail-text-input--error'}
                placeholder="https://…"
                value={link.url}
                onChange={(e) => handleLinkChange(i, 'url', e.target.value)}
                aria-label={`Link ${i + 1} URL`}
                aria-invalid={!isValidUrl(link.url)}
              />
              <button
                type="button"
                className="rail-link-remove"
                onClick={() => handleRemoveLink(i)}
                aria-label={`Remove link ${i + 1}`}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rail-link-add"
            onClick={handleAddLink}
          >+ Add link</button>
          <div className="rail-hint">Shown on the end page. Use the full URL including https://.</div>
        </div>

        <SectionLabel>Cover Image</SectionLabel>
        <div className="rail-section-inner">
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div
              style={{
                width: 68,
                height: 88,
                borderRadius: 6,
                overflow: 'hidden',
                background: 'var(--bg-dd)',
                border: '1px solid var(--thumb-brd)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {story?.cover_url ? (
                <img
                  src={story.cover_url}
                  alt="Cover preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" style={{ opacity: 0.3 }}>
                  <rect x="1" y="1" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M1 15l6-5 4 4 4-4 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
                className="rail-link-add"
                style={{ textAlign: 'left' }}
              >
                {coverUploading ? 'Uploading…' : (story?.cover_url ? 'Replace cover' : 'Upload cover')}
              </button>
              {story?.cover_url && (
                <button
                  type="button"
                  onClick={() => void handleCoverClear()}
                  disabled={coverUploading}
                  className="rail-link-add"
                  style={{ textAlign: 'left' }}
                >
                  Clear cover
                </button>
              )}
            </div>
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept={ACCEPTED_COVER}
            onChange={(e) => void handleCoverUpload(e)}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
          <div className="rail-hint">Upload a cover image that readers see before entering.</div>
        </div>

        <div className="rail-go-live">
          <button
            onClick={() => void handleGoLive()}
            disabled={publishLoading}
            className={story?.is_published ? 'rail-live-btn rail-live-btn--unpublish' : 'rail-live-btn'}
            aria-live="polite"
          >
            {publishLoading ? 'Working…' : publishConfirm ? '✓ Published!' : story?.is_published ? 'Unpublish' : 'Go Live'}
          </button>
        </div>

      </div>
    </aside>
  )
}
