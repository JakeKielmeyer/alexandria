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
