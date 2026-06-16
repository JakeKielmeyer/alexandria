// src/lib/upload.ts
//
// Shared Supabase Storage upload helper. Used by the panel-layer uploader in
// EditorCanvas and the cover uploader in EditorRail — both push into the same
// `panels` bucket with distinct path prefixes so we keep deletion scoping
// simple.

import { supabase } from './supabase'
import type { Asset, MediaType } from '../types'

export const ACCEPTED_MEDIA = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg'
export const ACCEPTED_COVER = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm'

const ACCEPTED_MEDIA_TYPES = new Set(ACCEPTED_MEDIA.split(','))
const ACCEPTED_COVER_TYPES = new Set(ACCEPTED_COVER.split(','))

// 100 MB cap. Comfortably above any reasonable single-panel image and well
// below Supabase Storage limits (50 MB on free tier, 5 GB on Pro). Above this
// the Supabase JS client would silently choke during in-memory file
// preparation before issuing the network request, leaving the editor with
// a hung spinner and no error.
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

export function validateMediaFile(file: File, accept: 'media' | 'cover' = 'media'): void {
  const allowed = accept === 'cover' ? ACCEPTED_COVER_TYPES : ACCEPTED_MEDIA_TYPES
  if (!allowed.has(file.type)) {
    throw new Error(`Unsupported file type (${file.type || 'unknown'})`)
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File too large (${formatBytes(file.size)}; max ${formatBytes(MAX_UPLOAD_BYTES)})`)
  }
}

export function getMediaType(file: File): MediaType | null {
  if (file.type.startsWith('image/gif')) return 'gif'
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return null
}

export interface UploadResult {
  url: string
  path: string
}

/**
 * Upload a file to the `panels` bucket and return its public URL + storage path.
 * Callers provide the full path (so cover uploads, panel uploads, etc. have
 * consistent naming conventions owned at the call site).
 */
export async function uploadToPanelsBucket(file: File, path: string): Promise<UploadResult> {
  const { error: uploadError } = await supabase.storage
    .from('panels')
    .upload(path, file, { upsert: true })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('panels').getPublicUrl(path)
  return { url: data.publicUrl, path }
}

/**
 * Build the path for a cover upload. Kept next to `uploadToPanelsBucket` so
 * both the editor and any other callers use the same convention.
 */
export function coverPath(storyId: string, file: File): string {
  const ext = file.name.split('.').pop() ?? 'bin'
  return `${storyId}/cover/${Date.now()}.${ext}`
}

/**
 * Build the path for a panel-layer media upload. Matches the pattern
 * EditorCanvas already uses so existing uploads keep working.
 */
export function panelLayerPath(storyId: string, panelId: string, file: File): string {
  const ext = file.name.split('.').pop() ?? 'bin'
  return `${storyId}/${panelId}/${Date.now()}.${ext}`
}

// The assets table CHECK constraint uses 'image' | 'video' | 'audio'.
// GIF is stored as media_type 'image' in assets (it is an image format).
function toAssetMediaType(mt: MediaType): Asset['media_type'] {
  if (mt === 'gif' || mt === 'text') return 'image'
  return mt as Asset['media_type']
}

export function extractStoragePath(mediaUrl: string): string | null {
  const marker = '/storage/v1/object/public/panels/'
  const idx = mediaUrl.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(mediaUrl.slice(idx + marker.length))
}

export async function deleteFromPanelsBucket(path: string): Promise<void> {
  const { error } = await supabase.storage.from('panels').remove([path])
  if (error) throw error
}

// Call this BEFORE deleting the story from the DB. The storage DELETE policy
// queries public.stories to verify ownership, so the row must still exist.
export async function deleteStoryStorage(
  coverUrl: string | null | undefined,
  backCoverUrl: string | null | undefined,
  assetUrls: string[],
): Promise<void> {
  const paths = [coverUrl, backCoverUrl, ...assetUrls]
    .map((url) => (url ? extractStoragePath(url) : null))
    .filter((p): p is string => p !== null)
  if (paths.length === 0) return
  await supabase.storage.from('panels').remove(paths)
}

/**
 * Register a successfully uploaded file as an `assets` row for the story.
 * Uses upsert on (story_id, filename) so re-uploading the same filename
 * refreshes the URL rather than erroring. Returns the asset id.
 */
export async function registerAsset(
  storyId: string,
  mediaType: MediaType,
  mediaUrl: string,
  filename: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('assets')
    .upsert(
      {
        story_id: storyId,
        media_type: toAssetMediaType(mediaType),
        media_url: mediaUrl,
        filename,
      },
      { onConflict: 'story_id,filename' },
    )
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('Failed to register asset')
  return (data as { id: string }).id
}
