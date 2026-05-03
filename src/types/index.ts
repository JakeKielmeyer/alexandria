// src/types/index.ts

export type ContentRating = 'mature' | 'explicit'

export type MediaType = 'image' | 'gif' | 'video' | 'audio'

export type ReadingMode = 'cinematic' | 'scroll'

export type TransitionStyle = 'stacked' | 'fade' | 'cut'

export interface User {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  created_at: string
}

export interface Story {
  id: string
  user_id: string
  title: string
  slug: string
  content_rating: ContentRating
  reading_mode: ReadingMode
  password_hash: string | null
  is_published: boolean
  cover_url: string | null
  font_manifest: string[]
  creator_bio: string | null
  creator_links: { label: string; url: string }[]
  transition_style: TransitionStyle | null
  transition_duration_ms: number | null
  created_at: string
  updated_at: string
}

export interface StoryWithCreator extends Story {
  username: string
  display_name: string | null
}

export interface Chunk {
  id: string
  story_id: string
  chapter_number: number
  chapter_title: string | null
  position: number
  created_at: string
}

export interface Panel {
  id: string
  chunk_id: string | null
  story_id: string
  position: number
  image_url: string | null
  height: number
  created_at: string
}

export type FillMode = 'stretch' | 'crop' | 'custom'

export interface Asset {
  id: string
  story_id: string
  media_type: 'image' | 'video' | 'audio'
  media_url: string
  filename: string
  created_at: string
}

export interface Layer {
  id: string
  panel_id: string
  story_id: string
  position: number
  media_type: MediaType
  media_url: string | null
  // FK to the assets table. Null on legacy rows created before P3-B.
  asset_id: string | null
  // Optional creator-facing label. Falls back to media_type in the Layers tab.
  name: string | null
  x_percent: number
  y_percent: number
  width_percent: number | null
  height_percent: number | null
  is_fill: boolean
  // fill_mode supersedes is_fill. Legacy rows without this column fall back to
  // is_fill=true → 'crop', is_fill=false → 'custom'. Reader and editor both
  // use the resolved value, never read is_fill directly.
  fill_mode: FillMode | null
  // Focal point for 'crop' fill — percentage from top-left of the layer frame.
  focal_x_percent: number | null
  focal_y_percent: number | null
  opacity: number
  // Video playback settings (also harmless on image/gif/audio rows — readers ignore).
  autoplay: boolean
  loop: boolean
  muted: boolean
  playback_rate: number
  // Audio-only: how many consecutive panels (starting at this layer's panel)
  // the audio should keep playing through. 1 = single-panel (current behaviour).
  // > 1 = the reader mounts the audio at story level, plays it while the active
  //       panel is within the span, and loops within that range.
  panel_span_count: number
  created_at: string
}

export const PANEL_HEIGHT_PRESETS = {
  ACCENT: 160,
  STANDARD: 240,
  DRAMATIC: 320,
  CINEMATIC: 480,
  FULL: 620,
} as const

export type PanelHeightPreset = keyof typeof PANEL_HEIGHT_PRESETS

export const CINEMATIC_PANEL_HEIGHT = 640

export const LAYER_DEFAULTS: Record<MediaType, {
  x_percent: number
  y_percent: number
  width_percent: number | null
  height_percent: number | null
  is_fill: boolean
  fill_mode: FillMode
  focal_x_percent: number
  focal_y_percent: number
  opacity: number
  autoplay: boolean
  loop: boolean
  muted: boolean
  playback_rate: number
  panel_span_count: number
}> = {
  image: {
    x_percent: 0,
    y_percent: 0,
    width_percent: null,
    height_percent: null,
    is_fill: true,
    fill_mode: 'crop',
    focal_x_percent: 50,
    focal_y_percent: 50,
    opacity: 1,
    autoplay: true,
    loop: true,
    muted: true,
    playback_rate: 1,
    panel_span_count: 1,
  },
  gif: {
    x_percent: 0,
    y_percent: 0,
    width_percent: null,
    height_percent: null,
    is_fill: true,
    fill_mode: 'crop',
    focal_x_percent: 50,
    focal_y_percent: 50,
    opacity: 1,
    autoplay: true,
    loop: true,
    muted: true,
    playback_rate: 1,
    panel_span_count: 1,
  },
  video: {
    x_percent: 0,
    y_percent: 0,
    width_percent: null,
    height_percent: null,
    is_fill: true,
    fill_mode: 'crop',
    focal_x_percent: 50,
    focal_y_percent: 50,
    opacity: 1,
    autoplay: true,
    loop: true,
    // `muted: false` means a new video layer defers to the viewer's global
    // Video & SFX preference (off by default in the reader). A creator who
    // wants a silent clip — e.g. ambient loop layered under music — flips
    // the Muted switch in EditorRail to ON, which is a hard-override the
    // viewer can't undo.
    muted: false,
    playback_rate: 1,
    panel_span_count: 1,
  },
  audio: {
    x_percent: 0,
    y_percent: 0,
    width_percent: null,
    height_percent: null,
    is_fill: false,
    fill_mode: 'custom',
    focal_x_percent: 50,
    focal_y_percent: 50,
    opacity: 1,
    autoplay: true,
    loop: true,
    muted: false,
    playback_rate: 1,
    panel_span_count: 1,
  },
}
