// src/lib/upload.ts
//
// Shared Supabase Storage upload helper. Used by the panel-layer uploader in
// EditorCanvas and the cover uploader in EditorRail — both push into the same
// `panels` bucket with distinct path prefixes so we keep deletion scoping
// simple.

import { supabase } from './supabase'
import type { MediaType } from '../types'

export const ACCEPTED_MEDIA = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg'
export const ACCEPTED_COVER = 'image/jpeg,image/png,image/webp,image/gif'

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
