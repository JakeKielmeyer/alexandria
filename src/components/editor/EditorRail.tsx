// src/components/editor/EditorRail.tsx

import React, { useRef, useState } from 'react'
import { Reorder } from 'framer-motion'
import { useEditorStore } from '../../store/editorStore'
import { useToastStore } from '../../store/toastStore'
import { supabase } from '../../lib/supabase'
import { ACCEPTED_COVER, coverPath, uploadToPanelsBucket, validateMediaFile } from '../../lib/upload'
import { loadFont } from '../../lib/fonts'
import FontSelect from './FontSelect'
import type { ContentRating, FillMode, Layer, ReadingDirection, ReadingMode, TransitionStyle, TextLayerType, TailDirection } from '../../types'

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
  { value: 'cinematic', label: 'Webtoons: Cinematic', desc: '400 × 640px, transitions' },
  { value: 'scroll', label: 'Webtoons: Classic/Scroll', desc: 'Variable height, continuous' },
  { value: 'book', label: 'Book', desc: '400 × 600px per page, 3D page turn' },
]

const READING_DIRECTION_OPTIONS: { value: ReadingDirection; label: string; desc: string }[] = [
  { value: 'ltr', label: 'LTR', desc: 'Left-to-right — western comics' },
  { value: 'rtl', label: 'RTL', desc: 'Right-to-left — manga' },
]

const MIN_OPACITY = 0
const MAX_OPACITY = 1
const OPACITY_STEP = 0.05

const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const

const TEXT_TYPE_LABELS: { type: TextLayerType; label: string }[] = [
  { type: 'dialogue',  label: 'Dialogue'  },
  { type: 'narrative', label: 'Narrative' },
  { type: 'caption',   label: 'Caption'   },
  { type: 'sound_fx',  label: 'Sound FX'  },
  { type: 'plain',     label: 'Plain'     },
]

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
    updateLayer, updateStory, deleteLayer, addLayer,
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
  const [editingLayerNameId, setEditingLayerNameId] = useState<string | null>(null)
  const [editingLayerNameValue, setEditingLayerNameValue] = useState('')
  const [publishConfirm, setPublishConfirm] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [showPasswordInput, setShowPasswordInput] = useState(false)

  const activePanel = panels.find((p) => p.id === activePanelId) ?? null
  const activeLayer = layers.find((l) => l.id === activeLayerId) ?? null
  const activePanelLayers = layers
    .filter((l) => l.panel_id === activePanelId)
    .sort((a, b) => a.position - b.position)

  const isCinematic = story?.reading_mode === 'cinematic'
  const isBook = story?.reading_mode === 'book'

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

  const handlePasswordClear = async (): Promise<void> => {
    if (!story) return
    setPasswordSaving(true)
    const { error } = await supabase
      .from('stories')
      .update({ password_hash: null, updated_at: new Date().toISOString() })
      .eq('id', story.id)
    setPasswordSaving(false)
    if (!error) {
      updateStory({ password_hash: null })
      setPasswordInput('')
      setShowPasswordInput(false)
    }
  }

  const handlePasswordSet = async (): Promise<void> => {
    if (!story || !passwordInput.trim()) return
    setPasswordSaving(true)
    const raw = passwordInput.trim()
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
    const hash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
    const { error } = await supabase
      .from('stories')
      .update({ password_hash: hash, updated_at: new Date().toISOString() })
      .eq('id', story.id)
    setPasswordSaving(false)
    if (!error) {
      updateStory({ password_hash: hash })
      setPasswordInput('')
      setShowPasswordInput(false)
      pushToast('Password set', 'success')
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

  const handleLayerReorder = (newOrder: Layer[]): void => {
    // newOrder is in display order: index 0 = frontmost (highest z-order).
    // Map to positions: frontmost gets the highest position value.
    const total = newOrder.length
    newOrder.forEach((l, i) => {
      updateLayer(l.id, { position: total - 1 - i })
    })
    setSaveStatus('unsaved')
  }

  const handleDuplicateLayer = async (layer: Layer): Promise<void> => {
    if (!activePanelId) return
    const panelLayers = layers.filter((l) => l.panel_id === activePanelId)
    const newPosition = panelLayers.reduce((max, l) => Math.max(max, l.position), -1) + 1
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, created_at: _ca, ...rest } = layer
    const newLayerData = {
      ...rest,
      position: newPosition,
      name: layer.name ? `${layer.name} copy` : null,
    }
    const { data, error } = await supabase.from('layers').insert(newLayerData).select().single()
    if (error || !data) {
      pushToast('Failed to duplicate layer', 'error')
      return
    }
    addLayer(data as Layer)
    setActiveLayerId((data as Layer).id)
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
              <Reorder.Group
                as="div"
                axis="y"
                className="layers-list"
                values={[...activePanelLayers].reverse()}
                onReorder={handleLayerReorder}
                style={{ listStyle: 'none', margin: 0, padding: 0 }}
              >
                {[...activePanelLayers].reverse().map((layer, reversedIndex) => {
                  const index = activePanelLayers.length - 1 - reversedIndex
                  const isActive = layer.id === activeLayerId
                  const isEditingName = editingLayerNameId === layer.id
                  return (
                    <Reorder.Item
                      key={layer.id}
                      value={layer}
                      as="div"
                      className={isActive ? 'layer-row layer-row--active' : 'layer-row'}
                      onClick={() => setActiveLayerId(layer.id)}
                    >
                      <div
                        className="layer-row-drag-handle"
                        aria-hidden="true"
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{ cursor: 'grab', padding: '0 3px 0 0', opacity: 0.35, flexShrink: 0 }}
                      >
                        <svg width="7" height="11" viewBox="0 0 7 11" fill="none">
                          <circle cx="2" cy="1.5" r="1" fill="currentColor"/>
                          <circle cx="5" cy="1.5" r="1" fill="currentColor"/>
                          <circle cx="2" cy="5.5" r="1" fill="currentColor"/>
                          <circle cx="5" cy="5.5" r="1" fill="currentColor"/>
                          <circle cx="2" cy="9.5" r="1" fill="currentColor"/>
                          <circle cx="5" cy="9.5" r="1" fill="currentColor"/>
                        </svg>
                      </div>
                      <div className="layer-row-icon" aria-hidden="true">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <rect x="1" y="1" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1"/>
                        </svg>
                      </div>
                      {isEditingName ? (
                        <input
                          // eslint-disable-next-line jsx-a11y/no-autofocus
                          autoFocus
                          value={editingLayerNameValue}
                          placeholder={layer.media_type}
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          onChange={(e) => setEditingLayerNameValue(e.target.value)}
                          onBlur={() => {
                            const trimmed = editingLayerNameValue.trim()
                            updateLayer(layer.id, { name: trimmed || null })
                            setSaveStatus('unsaved')
                            setEditingLayerNameId(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const trimmed = editingLayerNameValue.trim()
                              updateLayer(layer.id, { name: trimmed || null })
                              setSaveStatus('unsaved')
                              setEditingLayerNameId(null)
                            }
                            if (e.key === 'Escape') {
                              setEditingLayerNameId(null)
                            }
                          }}
                          style={{
                            flex: 1,
                            fontSize: '11px',
                            padding: '2px 4px',
                            background: 'rgba(0,0,0,0.3)',
                            color: 'rgba(245,238,232,0.9)',
                            border: '1px solid rgba(220,90,138,0.5)',
                            borderRadius: '3px',
                            minWidth: 0,
                          }}
                        />
                      ) : (
                        <span
                          className="layer-row-label"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveLayerId(layer.id)
                            setEditingLayerNameId(layer.id)
                            setEditingLayerNameValue(layer.name ?? '')
                          }}
                          title="Click to rename"
                          style={{ cursor: 'text' }}
                        >
                          {layer.name?.trim() || layer.media_type}
                        </span>
                      )}
                      <div className="layer-row-actions">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveLayer(layer.id, 'up') }}
                          onPointerDown={(e) => e.stopPropagation()}
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
                          onPointerDown={(e) => e.stopPropagation()}
                          disabled={index === 0}
                          className="layer-action-btn"
                          aria-label="Move layer down (backward)"
                        >
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                            <path d="M4 1.5v5M1.5 4L4 6.5 6.5 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); void handleDuplicateLayer(layer) }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="layer-action-btn"
                          aria-label="Duplicate layer"
                          title="Duplicate"
                        >
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                            <rect x="0.5" y="2.5" width="4.5" height="4.5" rx="0.7" stroke="currentColor" strokeWidth="1"/>
                            <rect x="3" y="0.5" width="4.5" height="4.5" rx="0.7" stroke="currentColor" strokeWidth="1"/>
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); void handleDeleteLayer(layer.id) }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="layer-action-btn layer-action-btn--delete"
                          aria-label="Delete layer"
                        >
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                            <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </Reorder.Item>
                  )
                })}
              </Reorder.Group>
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

                {isBook && (
                  <div className="rail-row" style={{ marginBottom: 8 }}>
                    <span className="rail-row-label">Spread layer</span>
                    <button
                      role="switch"
                      aria-checked={activeLayer.is_spread_layer}
                      onClick={() => handleLayerUpdate({ is_spread_layer: !activeLayer.is_spread_layer })}
                      className={activeLayer.is_spread_layer ? 'rail-toggle rail-toggle--on' : 'rail-toggle'}
                    >
                      <span className="rail-toggle-thumb" />
                    </button>
                  </div>
                )}

                {activeLayer.media_type === 'text' && (
                  <>
                    <SectionLabel>Type</SectionLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: 8 }}>
                      {TEXT_TYPE_LABELS.map(({ type, label }) => {
                        const current = activeLayer.text_layer_type ?? 'plain'
                        const isActive = current === type
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleLayerUpdate({ text_layer_type: type })}
                            className={isActive ? 'rail-option-btn rail-option-btn--active' : 'rail-option-btn'}
                            aria-pressed={isActive}
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>

                    <SectionLabel>Text</SectionLabel>
                    <div className="rail-section-inner" style={{ marginBottom: 8 }}>
                      <textarea
                        className="rail-textarea"
                        placeholder="Layer text content"
                        value={activeLayer.text_content ?? ''}
                        onChange={(e) => handleLayerUpdate({ text_content: e.target.value })}
                        aria-label="Text content"
                        rows={3}
                      />
                    </div>

                    <SectionLabel>Font</SectionLabel>
                    <div className="rail-row" style={{ marginBottom: 8 }}>
                      <FontSelect
                        value={activeLayer.font_family ?? 'DM Sans'}
                        onChange={(fontLabel) => {
                          loadFont(fontLabel)
                          handleLayerUpdate({ font_family: fontLabel })
                        }}
                      />
                    </div>

                    <div className="rail-row" style={{ marginBottom: 8 }}>
                      <span className="rail-row-label">Size</span>
                      <div className="rail-input-group">
                        <input
                          type="number"
                          value={activeLayer.font_size ?? 24}
                          min={8} max={200} step={1}
                          onChange={(e) => handleLayerUpdate({ font_size: parseInt(e.target.value, 10) || 24 })}
                          className="rail-number-input"
                          aria-label="Font size in pixels"
                        />
                        <span className="rail-input-unit">px</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                        {(['400', '700'] as const).map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => handleLayerUpdate({ font_weight: w })}
                            className={(activeLayer.font_weight ?? '400') === w ? 'rail-option-btn rail-option-btn--active' : 'rail-option-btn'}
                            aria-pressed={(activeLayer.font_weight ?? '400') === w}
                            style={{ padding: '4px 8px', fontSize: '11px', fontWeight: w === '700' ? 700 : 400 }}
                          >
                            {w === '400' ? 'Reg' : 'Bold'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rail-row" style={{ marginBottom: 8 }}>
                      <span className="rail-row-label">Align</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {(['left', 'center', 'right'] as const).map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => handleLayerUpdate({ text_align: a })}
                            className={(activeLayer.text_align ?? 'left') === a ? 'rail-option-btn rail-option-btn--active' : 'rail-option-btn'}
                            aria-pressed={(activeLayer.text_align ?? 'left') === a}
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            {a.charAt(0).toUpperCase() + a.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rail-row" style={{ marginBottom: 8 }}>
                      <span className="rail-row-label">Color</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="color"
                          value={activeLayer.text_color ?? '#F5EEE8'}
                          onChange={(e) => handleLayerUpdate({ text_color: e.target.value })}
                          aria-label="Text color"
                          style={{ width: '28px', height: '24px', padding: '1px', border: '1px solid rgba(245,238,232,0.15)', borderRadius: '3px', background: 'none', cursor: 'pointer' }}
                        />
                        <input
                          type="text"
                          value={activeLayer.text_color ?? '#F5EEE8'}
                          onChange={(e) => {
                            const v = e.target.value
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleLayerUpdate({ text_color: v })
                          }}
                          maxLength={7}
                          aria-label="Text color hex value"
                          style={{
                            width: '70px',
                            padding: '4px 6px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            background: 'rgba(0,0,0,0.25)',
                            color: 'rgba(245,238,232,0.9)',
                            border: '1px solid rgba(245,238,232,0.15)',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>

                    <div className="rail-row" style={{ marginBottom: 8 }}>
                      <span className="rail-row-label">Leading</span>
                      <div className="rail-input-group">
                        <input
                          type="number"
                          value={activeLayer.line_height ?? 1.4}
                          min={0.5} max={4} step={0.1}
                          onChange={(e) => handleLayerUpdate({ line_height: parseFloat(e.target.value) || 1.4 })}
                          className="rail-number-input"
                          aria-label="Line height"
                        />
                      </div>
                      <span className="rail-row-label" style={{ marginLeft: '12px' }}>Tracking</span>
                      <div className="rail-input-group">
                        <input
                          type="number"
                          value={activeLayer.letter_spacing ?? 0}
                          min={-5} max={30} step={0.5}
                          onChange={(e) => handleLayerUpdate({ letter_spacing: parseFloat(e.target.value) || 0 })}
                          className="rail-number-input"
                          aria-label="Letter spacing in pixels"
                        />
                        <span className="rail-input-unit">px</span>
                      </div>
                    </div>

                    {/* Background fill */}
                    <SectionLabel>Background</SectionLabel>
                    <div className="rail-row" style={{ marginBottom: 4 }}>
                      <span className="rail-row-label">Fill</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="color"
                          value={activeLayer.background_color && !activeLayer.background_color.startsWith('rgba') ? activeLayer.background_color : '#000000'}
                          onChange={(e) => handleLayerUpdate({ background_color: e.target.value })}
                          aria-label="Background fill color"
                          style={{ width: '28px', height: '24px', padding: '1px', border: '1px solid rgba(245,238,232,0.15)', borderRadius: '3px', background: 'none', cursor: 'pointer' }}
                        />
                        <input
                          type="text"
                          value={activeLayer.background_color ?? ''}
                          placeholder="none"
                          onChange={(e) => {
                            const v = e.target.value
                            if (v === '') { handleLayerUpdate({ background_color: null }); return }
                            handleLayerUpdate({ background_color: v })
                          }}
                          aria-label="Background color value"
                          style={{
                            width: '100px',
                            padding: '4px 6px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            background: 'rgba(0,0,0,0.25)',
                            color: 'rgba(245,238,232,0.9)',
                            border: '1px solid rgba(245,238,232,0.15)',
                            borderRadius: '4px',
                          }}
                        />
                        {activeLayer.background_color && (
                          <button
                            type="button"
                            onClick={() => handleLayerUpdate({ background_color: null })}
                            aria-label="Clear background"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,238,232,0.4)', fontSize: '14px', lineHeight: 1, padding: '2px' }}
                          >×</button>
                        )}
                      </div>
                    </div>

                    {/* Corner radius — only useful when there's a background */}
                    {activeLayer.background_color && (
                      <div className="rail-row" style={{ marginBottom: 8 }}>
                        <span className="rail-row-label">Radius</span>
                        <div className="rail-input-group">
                          <input
                            type="number"
                            value={activeLayer.border_radius ?? 0}
                            min={0} max={100} step={1}
                            onChange={(e) => handleLayerUpdate({ border_radius: parseInt(e.target.value, 10) || 0 })}
                            className="rail-number-input"
                            aria-label="Corner radius in pixels"
                          />
                          <span className="rail-input-unit">px</span>
                        </div>
                      </div>
                    )}

                    {/* Border — dialogue type only */}
                    {activeLayer.text_layer_type === 'dialogue' && (
                      <>
                        <SectionLabel>Border</SectionLabel>
                        <div className="rail-row" style={{ marginBottom: 6 }}>
                          <span className="rail-row-label">Show border</span>
                          <button
                            role="switch"
                            aria-checked={activeLayer.has_stroke ?? true}
                            onClick={() => handleLayerUpdate({ has_stroke: !(activeLayer.has_stroke ?? true) })}
                            className={(activeLayer.has_stroke ?? true) ? 'rail-toggle rail-toggle--on' : 'rail-toggle'}
                          >
                            <span className="rail-toggle-thumb" />
                          </button>
                        </div>
                        {(activeLayer.has_stroke ?? true) && (
                          <>
                            <div className="rail-row" style={{ marginBottom: 6 }}>
                              <span className="rail-row-label">Color</span>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <input
                                  type="color"
                                  value={activeLayer.stroke_color ?? '#DC5A8A'}
                                  onChange={(e) => handleLayerUpdate({ stroke_color: e.target.value })}
                                  aria-label="Border color"
                                  style={{ width: '28px', height: '24px', padding: '1px', border: '1px solid rgba(245,238,232,0.15)', borderRadius: '3px', background: 'none', cursor: 'pointer' }}
                                />
                                <input
                                  type="text"
                                  value={activeLayer.stroke_color ?? ''}
                                  placeholder="#DC5A8A"
                                  onChange={(e) => {
                                    const v = e.target.value
                                    if (v === '') { handleLayerUpdate({ stroke_color: null }); return }
                                    handleLayerUpdate({ stroke_color: v })
                                  }}
                                  aria-label="Border color hex"
                                  style={{
                                    width: '90px',
                                    padding: '4px 6px',
                                    fontSize: '12px',
                                    background: 'rgba(0,0,0,0.25)',
                                    color: 'rgba(245,238,232,0.9)',
                                    border: '1px solid rgba(245,238,232,0.15)',
                                    borderRadius: '4px',
                                  }}
                                />
                                {activeLayer.stroke_color && (
                                  <button
                                    type="button"
                                    onClick={() => handleLayerUpdate({ stroke_color: null })}
                                    aria-label="Reset color to default"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,238,232,0.4)', fontSize: '14px', lineHeight: 1, padding: '2px' }}
                                  >×</button>
                                )}
                              </div>
                            </div>
                            <div className="rail-row" style={{ marginBottom: 8 }}>
                              <span className="rail-row-label">Thickness</span>
                              <div className="rail-input-group">
                                <input
                                  type="number"
                                  value={activeLayer.stroke_width ?? 1.5}
                                  min={0.5}
                                  max={12}
                                  step={0.5}
                                  onChange={(e) => {
                                    const v = parseFloat(e.target.value)
                                    handleLayerUpdate({ stroke_width: isNaN(v) ? null : v })
                                  }}
                                  className="rail-number-input"
                                  aria-label="Border thickness in pixels"
                                />
                                <span className="rail-input-unit">px</span>
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {/* Speech bubble tail — show for dialogue type or when tail is already on */}
                    {(activeLayer.text_layer_type === 'dialogue' || activeLayer.has_tail) && (
                      <div className="rail-row" style={{ marginBottom: 6 }}>
                        <span className="rail-row-label">Speech tail</span>
                        <button
                          role="switch"
                          aria-checked={activeLayer.has_tail}
                          onClick={() => handleLayerUpdate({ has_tail: !activeLayer.has_tail })}
                          className={activeLayer.has_tail ? 'rail-toggle rail-toggle--on' : 'rail-toggle'}
                        >
                          <span className="rail-toggle-thumb" />
                        </button>
                      </div>
                    )}

                    {activeLayer.has_tail && activeLayer.text_layer_type !== 'dialogue' && (() => {
                      const COMPASS: (TailDirection | null)[][] = [
                        ['top-left',    'top',    'top-right'   ],
                        ['left',         null,    'right'       ],
                        ['bottom-left', 'bottom', 'bottom-right'],
                      ]
                      const ARROWS: Partial<Record<TailDirection, string>> = {
                        'top-left': '↖', top: '↑', 'top-right': '↗',
                        left: '←',                  right: '→',
                        'bottom-left': '↙', bottom: '↓', 'bottom-right': '↘',
                      }
                      const curDir = activeLayer.tail_direction ?? 'bottom'
                      const isCorner = curDir.includes('-')
                      return (
                        <>
                          <div className="rail-row" style={{ marginBottom: 6, alignItems: 'flex-start' }}>
                            <span className="rail-row-label" style={{ paddingTop: 4 }}>Tail side</span>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 26px)', gap: 3 }}>
                              {COMPASS.flat().map((dir, i) =>
                                dir === null
                                  ? <div key={i} style={{ width: 26, height: 26 }} />
                                  : (
                                    <button
                                      key={dir}
                                      onClick={() => handleLayerUpdate({ tail_direction: dir })}
                                      className={curDir === dir ? 'canvas-preset-btn canvas-preset-btn--active' : 'canvas-preset-btn'}
                                      style={{ padding: 0, width: 26, height: 26, textAlign: 'center' }}
                                      title={dir}
                                    >
                                      {ARROWS[dir]}
                                    </button>
                                  )
                              )}
                            </div>
                          </div>
                          <div className="rail-row" style={{ marginBottom: 6 }}>
                            <span className="rail-row-label">Length</span>
                            <div className="rail-input-group">
                              <input
                                type="number"
                                min={10}
                                max={120}
                                value={activeLayer.tail_length ?? 40}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value, 10)
                                  if (!isNaN(v)) handleLayerUpdate({ tail_length: Math.max(10, Math.min(120, v)) })
                                }}
                                className="rail-number-input"
                                aria-label="Tail length in pixels"
                              />
                              <span className="rail-input-unit">px</span>
                            </div>
                          </div>
                          {!isCorner && (
                            <div className="rail-row" style={{ marginBottom: 8 }}>
                              <span className="rail-row-label">Position</span>
                              <div className="rail-input-group">
                                <input
                                  type="number"
                                  min={5}
                                  max={95}
                                  value={Math.round(activeLayer.tail_offset_percent ?? 50)}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value, 10)
                                    if (!isNaN(v)) handleLayerUpdate({ tail_offset_percent: Math.max(5, Math.min(95, v)) })
                                  }}
                                  className="rail-number-input"
                                  aria-label="Tail position along edge"
                                />
                                <span className="rail-input-unit">%</span>
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()}

                    <SectionLabel>Position</SectionLabel>
                    <div className="rail-row">
                      <span className="rail-row-label">X</span>
                      <div className="rail-input-group">
                        <input type="number" value={Math.round(activeLayer.x_percent * 10) / 10} min={0} max={100} step={0.5}
                          onChange={(e) => handleLayerUpdate({ x_percent: parseFloat(e.target.value) })}
                          className="rail-number-input" aria-label="X position percent" />
                        <span className="rail-input-unit">%</span>
                      </div>
                    </div>
                    <div className="rail-row">
                      <span className="rail-row-label">Y</span>
                      <div className="rail-input-group">
                        <input type="number" value={Math.round(activeLayer.y_percent * 10) / 10} min={0} max={100} step={0.5}
                          onChange={(e) => handleLayerUpdate({ y_percent: parseFloat(e.target.value) })}
                          className="rail-number-input" aria-label="Y position percent" />
                        <span className="rail-input-unit">%</span>
                      </div>
                    </div>
                    <SectionLabel>Size</SectionLabel>
                    <div className="rail-row">
                      <span className="rail-row-label">W</span>
                      <div className="rail-input-group">
                        <input type="number" value={Math.round((activeLayer.width_percent ?? 80) * 10) / 10} min={5} max={100} step={0.5}
                          onChange={(e) => handleLayerUpdate({ width_percent: parseFloat(e.target.value) })}
                          className="rail-number-input" aria-label="Layer width percent" />
                        <span className="rail-input-unit">%</span>
                      </div>
                    </div>
                    <div className="rail-row">
                      <span className="rail-row-label">H</span>
                      <div className="rail-input-group">
                        <input type="number" value={Math.round((activeLayer.height_percent ?? 20) * 10) / 10} min={5} max={100} step={0.5}
                          onChange={(e) => handleLayerUpdate({ height_percent: parseFloat(e.target.value) })}
                          className="rail-number-input" aria-label="Layer height percent" />
                        <span className="rail-input-unit">%</span>
                      </div>
                    </div>
                  </>
                )}

                {activeLayer.media_type !== 'audio' && activeLayer.media_type !== 'text' && (
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

                </>) /* end audio + text guard */}

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

        {isBook && (
          <>
            <SectionLabel>Reading Direction</SectionLabel>
            <div className="rail-option-list">
              {READING_DIRECTION_OPTIONS.map(({ value, label, desc }) => {
                const isSelected = story?.reading_direction === value
                return (
                  <button
                    key={value}
                    onClick={() => { updateStory({ reading_direction: value }); setSaveStatus('unsaved') }}
                    className={isSelected ? 'rail-option-btn rail-option-btn--active' : 'rail-option-btn'}
                    aria-pressed={isSelected}
                  >
                    <div className="rail-option-label">{label}</div>
                    <div className="rail-option-desc">{desc}</div>
                  </button>
                )
              })}
            </div>
          </>
        )}

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
        <div className="rail-row">
          <span className="rail-row-label">Password protect</span>
          <div
            role="switch"
            aria-checked={!!story?.password_hash}
            tabIndex={0}
            className={story?.password_hash ? 'rail-toggle rail-toggle--on' : 'rail-toggle'}
            style={{ cursor: passwordSaving ? 'wait' : 'pointer' }}
            onClick={() => {
              if (passwordSaving) return
              if (story?.password_hash) { void handlePasswordClear() }
              else { setShowPasswordInput((v) => !v) }
            }}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                if (passwordSaving) return
                if (story?.password_hash) { void handlePasswordClear() }
                else { setShowPasswordInput((v) => !v) }
              }
            }}
          >
            <div className="rail-toggle-thumb" />
          </div>
        </div>
        {story?.password_hash ? (
          <div className="rail-hint" style={{ color: '#3DAA70' }}>Protected — readers need a password to open this story.</div>
        ) : showPasswordInput ? (
          <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
            <input
              type="password"
              className="rail-text-input"
              placeholder="Set password…"
              value={passwordInput}
              autoFocus
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handlePasswordSet() }}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="rail-link-add"
              onClick={() => void handlePasswordSet()}
              disabled={!passwordInput.trim() || passwordSaving}
            >{passwordSaving ? '…' : 'Set'}</button>
            <button
              type="button"
              className="rail-link-remove"
              onClick={() => { setShowPasswordInput(false); setPasswordInput('') }}
              aria-label="Cancel"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ) : (
          <div className="rail-hint">No password — anyone with the link can read.</div>
        )}

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
