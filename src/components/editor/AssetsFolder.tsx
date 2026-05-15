// src/components/editor/AssetsFolder.tsx
//
// Dropdown trigger + panel for story-wide asset management.
// Sits at the top of the panel filmstrip (left sidebar).
//
// Upload section:
//   • Multiple files at once — progress shows "N / M".
//   • On success: registers in `assets` only — does NOT auto-add to any
//     panel. Use "Use in panel" to explicitly place an asset on a panel.
//
// Assets grid:
//   • Inline-editable filename (renames sync to all layers using the asset).
//   • "Use in panel" — adds a layer with no re-upload (P3-D).
//   • Delete — two-click confirm. DB cascade removes layers; store is
//     cleaned up so canvas panels update immediately.

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useToastStore } from '../../store/toastStore'
import { supabase } from '../../lib/supabase'
import {
  ACCEPTED_MEDIA, getMediaType,
  uploadToPanelsBucket,
  validateMediaFile, registerAsset,
} from '../../lib/upload'
import { LAYER_DEFAULTS } from '../../types'
import type { Asset, Layer, MediaType } from '../../types'

// ── thumbnail ────────────────────────────────────────────────────────────────

function MediaPreview({ asset }: { asset: Asset }): React.JSX.Element {
  if (asset.media_type === 'audio') {
    return (
      <div className="asset-thumb asset-thumb--icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 9h4l5-5v16l-5-5H3V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M17 9c1.5 1 2.5 2.5 2.5 3s-1 2-2.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    )
  }
  if (asset.media_type === 'video') {
    return (
      <div className="asset-thumb">
        <video src={asset.media_url} className="asset-thumb-media" muted preload="metadata" />
        <div className="asset-thumb-play" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" fill="rgba(0,0,0,0.55)"/>
            <path d="M6.5 5.5l5 2.5-5 2.5V5.5z" fill="white"/>
          </svg>
        </div>
      </div>
    )
  }
  return (
    <div className="asset-thumb">
      <img src={asset.media_url} alt={asset.filename} className="asset-thumb-media" />
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function AssetsFolder(): React.JSX.Element {
  const {
    assetsModalOpen, setAssetsModalOpen,
    assets, setAssets, removeAsset, updateAsset,
    story, layers, activePanelId,
    addLayer, updateLayer, deleteLayer, setSaveStatus,
  } = useEditorStore()
  const pushToast = useToastStore((s) => s.pushToast)

  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [usingAssetId, setUsingAssetId] = useState<string | null>(null)
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const wrapperRef = useRef<HTMLDivElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const confirmTimeoutRef = useRef<number | null>(null)
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null)

  // ── fetch assets when opened ──────────────────────────────────────────────

  useEffect(() => {
    if (!assetsModalOpen || !story) return
    setLoading(true)
    supabase
      .from('assets')
      .select('*')
      .eq('story_id', story.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) pushToast('Failed to load assets', 'error')
        else setAssets((data ?? []) as Asset[])
        setLoading(false)
      })
  }, [assetsModalOpen, story?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── close on outside click ────────────────────────────────────────────────

  useEffect(() => {
    if (!assetsModalOpen) return
    const onDoc = (e: MouseEvent): void => {
      if (wrapperRef.current?.contains(e.target as Node)) return
      setAssetsModalOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [assetsModalOpen, setAssetsModalOpen])

  // ── close on Escape ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!assetsModalOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      if (editingAssetId) { setEditingAssetId(null); return }
      setAssetsModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [assetsModalOpen, editingAssetId, setAssetsModalOpen])

  // ── focus rename input when it appears ────────────────────────────────────

  useEffect(() => {
    if (editingAssetId) renameInputRef.current?.select()
  }, [editingAssetId])

  // ── reset delete-confirm when clicking elsewhere ──────────────────────────

  useEffect(() => {
    if (!confirmingDeleteId) return
    const onDoc = (e: MouseEvent): void => {
      if (confirmBtnRef.current?.contains(e.target as Node)) return
      setConfirmingDeleteId(null)
      clearConfirmTimeout()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [confirmingDeleteId])

  useEffect(() => () => clearConfirmTimeout(), [])

  const clearConfirmTimeout = (): void => {
    if (confirmTimeoutRef.current !== null) {
      window.clearTimeout(confirmTimeoutRef.current)
      confirmTimeoutRef.current = null
    }
  }

  // ── upload (multi-file) ───────────────────────────────────────────────────

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || !story) return
    if (e.target) e.target.value = ''

    setUploadProgress({ current: 0, total: files.length })
    setSaveStatus('saving')

    let successCount = 0

    const batchTs = Date.now()

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadProgress({ current: i + 1, total: files.length })

      const mediaType = getMediaType(file)
      if (!mediaType) continue

      try {
        validateMediaFile(file, 'media')

        // Use batchTs + index so rapid uploads never share a storage path.
        const path = `${story.id}/assets/${batchTs}_${i}_${file.name}`
        const { url: mediaUrl } = await uploadToPanelsBucket(file, path)
        const assetId = await registerAsset(story.id, mediaType, mediaUrl, file.name)

        const newAsset: Asset = {
          id: assetId,
          story_id: story.id,
          media_type: (mediaType === 'gif' || mediaType === 'text') ? 'image' : mediaType as Asset['media_type'],
          media_url: mediaUrl,
          filename: file.name,
          created_at: new Date().toISOString(),
        }
        setAssets([newAsset, ...useEditorStore.getState().assets])
        successCount++
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        pushToast(`Failed to upload ${file.name}: ${msg}`, 'error')
      }
    }

    setUploadProgress(null)
    if (successCount > 0) setSaveStatus('saved')
    else setSaveStatus('error')
  }, [story, setAssets, setSaveStatus, pushToast])

  // ── rename ────────────────────────────────────────────────────────────────

  const startEditing = (asset: Asset): void => {
    setEditingAssetId(asset.id)
    setEditingName(asset.filename)
  }

  const handleRenameSubmit = useCallback(async (): Promise<void> => {
    if (!editingAssetId) return
    const trimmed = editingName.trim()
    const current = assets.find((a) => a.id === editingAssetId)
    setEditingAssetId(null)

    if (!trimmed || !current || trimmed === current.filename) return

    const { data, error } = await supabase
      .from('assets')
      .update({ filename: trimmed })
      .eq('id', editingAssetId)
      .select()

    if (error) {
      pushToast(
        error.code === '23505' ? 'An asset with that name already exists' : 'Rename failed',
        'error',
      )
      return
    }
    if (!data || data.length === 0) {
      pushToast('Rename blocked — refresh and try again', 'error')
      return
    }

    updateAsset(editingAssetId, { filename: trimmed })

    // Sync all layers using this asset
    const affectedLayers = useEditorStore.getState().layers.filter((l) => l.asset_id === editingAssetId)
    for (const layer of affectedLayers) {
      updateLayer(layer.id, { name: trimmed })
    }
    if (affectedLayers.length > 0) setSaveStatus('unsaved')
  }, [editingAssetId, editingName, assets, updateAsset, updateLayer, setSaveStatus, pushToast])

  const handleRenameKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') { e.preventDefault(); void handleRenameSubmit() }
    if (e.key === 'Escape') { e.stopPropagation(); setEditingAssetId(null) }
  }

  // ── delete (DB cascades to layers; mirror in store) ──────────────────────

  const handleDelete = useCallback(async (assetId: string): Promise<void> => {
    if (confirmingDeleteId !== assetId) {
      setConfirmingDeleteId(assetId)
      clearConfirmTimeout()
      confirmTimeoutRef.current = window.setTimeout(() => {
        setConfirmingDeleteId(null)
        confirmTimeoutRef.current = null
      }, 3000)
      return
    }
    setConfirmingDeleteId(null)
    clearConfirmTimeout()

    const { error } = await supabase.from('assets').delete().eq('id', assetId)
    if (error) { pushToast('Delete failed', 'error'); return }

    // The DB cascades layer deletion; mirror in store so the canvas updates
    // immediately without waiting for a reload.
    const affectedLayers = useEditorStore.getState().layers.filter((l) => l.asset_id === assetId)
    for (const layer of affectedLayers) {
      deleteLayer(layer.id)
    }
    removeAsset(assetId)
  }, [confirmingDeleteId, pushToast, removeAsset, deleteLayer])

  // ── use in panel ──────────────────────────────────────────────────────────

  const handleUseInPanel = useCallback(async (asset: Asset): Promise<void> => {
    if (!activePanelId || !story) return
    setUsingAssetId(asset.id)
    const mt = asset.media_type as MediaType
    const panelLayers = layers.filter((l) => l.panel_id === activePanelId)
    const newLayer = {
      panel_id: activePanelId,
      story_id: story.id,
      position: panelLayers.reduce((max, l) => Math.max(max, l.position), -1) + 1,
      media_type: mt,
      media_url: asset.media_url,
      asset_id: asset.id,
      name: asset.filename,
      ...LAYER_DEFAULTS[mt],
    }
    try {
      setSaveStatus('saving')
      const { data, error } = await supabase.from('layers').insert(newLayer).select().single()
      if (error || !data) throw error
      addLayer(data as Layer)
      setSaveStatus('saved')
      setAssetsModalOpen(false)
    } catch (err) {
      setSaveStatus('error')
      pushToast(`Failed to add layer: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
    } finally {
      setUsingAssetId(null)
    }
  }, [activePanelId, story, layers, addLayer, setSaveStatus, setAssetsModalOpen, pushToast])

  // ── render ────────────────────────────────────────────────────────────────

  const isUploading = uploadProgress !== null

  return (
    <div className="assets-folder-wrapper" ref={wrapperRef}>
      <button
        className={assetsModalOpen ? 'assets-folder-trigger assets-folder-trigger--open' : 'assets-folder-trigger'}
        onClick={() => setAssetsModalOpen(!assetsModalOpen)}
        aria-expanded={assetsModalOpen}
        aria-haspopup="dialog"
      >
        Assets Folder
        <svg
          className="assets-folder-chevron"
          width="9"
          height="9"
          viewBox="0 0 9 9"
          fill="none"
          aria-hidden="true"
          style={{ transform: assetsModalOpen ? 'rotate(180deg)' : 'rotate(0)' }}
        >
          <path d="M2 3.5L4.5 6 7 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {assetsModalOpen && (
        <div className="assets-folder-dropdown" role="dialog" aria-label="Story assets">
          {/* Upload strip */}
          <div className="asset-upload-strip">
            <button
              className="asset-upload-btn"
              onClick={() => mediaInputRef.current?.click()}
              disabled={isUploading}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path d="M6.5 1v8M2.5 4.5l4-4 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 10.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              {isUploading
                ? `Uploading ${uploadProgress.current} / ${uploadProgress.total}…`
                : 'Upload image or video'}
            </button>
            <button
              className="asset-upload-btn"
              onClick={() => audioInputRef.current?.click()}
              disabled={isUploading}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path d="M2 5h3l3.5-3.5v10L5 8H2V5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M10 5c1 .7 1.5 1.5 1.5 1.5S11 8 10 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Upload audio
            </button>
            <input
              ref={mediaInputRef}
              type="file"
              accept={ACCEPTED_MEDIA}
              multiple
              onChange={handleUpload}
              style={{ display: 'none' }}
              aria-hidden="true"
            />
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/mpeg,audio/wav,audio/ogg"
              multiple
              onChange={handleUpload}
              style={{ display: 'none' }}
              aria-hidden="true"
            />
          </div>

          {/* Assets grid */}
          <div className="assets-folder-body">
            {loading ? (
              <div className="asset-modal-empty">Loading…</div>
            ) : assets.length === 0 ? (
              <div className="asset-modal-empty">No assets yet — upload something above.</div>
            ) : (
              <div className="asset-grid">
                {assets.map((asset) => {
                  const usedCount = layers.filter((l) => l.asset_id === asset.id).length
                  const isConfirming = confirmingDeleteId === asset.id
                  const isUsing = usingAssetId === asset.id
                  const isRenaming = editingAssetId === asset.id
                  return (
                    <div key={asset.id} className="asset-card">
                      <MediaPreview asset={asset} />

                      <div className="asset-card-info">
                        {isRenaming ? (
                          <input
                            ref={renameInputRef}
                            className="asset-rename-input"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => void handleRenameSubmit()}
                            onKeyDown={handleRenameKeyDown}
                            aria-label="Rename asset"
                          />
                        ) : (
                          <button
                            className="asset-card-name asset-card-name--btn"
                            onClick={() => startEditing(asset)}
                            title="Click to rename"
                          >
                            {asset.filename}
                            <svg className="asset-rename-icon" width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
                              <path d="M1 7.5h2l4-4-2-2-4 4v2zM6.5 1.5l1 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                        <div className="asset-card-meta">
                          <span className="asset-type-badge">{asset.media_type}</span>
                          <span className="asset-usage-count">
                            {usedCount === 0 ? 'Unused' : `${usedCount} panel${usedCount !== 1 ? 's' : ''}`}
                          </span>
                        </div>
                      </div>

                      <div className="asset-card-actions">
                        <button
                          className="asset-btn asset-btn--primary"
                          onClick={() => void handleUseInPanel(asset)}
                          disabled={!activePanelId || isUsing}
                          title={activePanelId ? 'Add to active panel' : 'Select a panel first'}
                        >
                          {isUsing ? 'Adding…' : 'Use in panel'}
                        </button>
                        <button
                          ref={isConfirming ? confirmBtnRef : undefined}
                          className={isConfirming ? 'asset-btn asset-btn--danger asset-btn--confirm' : 'asset-btn asset-btn--ghost'}
                          onClick={() => void handleDelete(asset.id)}
                        >
                          {isConfirming ? 'Confirm' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
