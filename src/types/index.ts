// src/types/index.ts

export type ContentRating = 'mature' | 'explicit'

export type MediaType = 'image' | 'gif' | 'video' | 'audio' | 'text'

export type TextLayerType = 'dialogue' | 'narrative' | 'caption' | 'sound_fx' | 'plain'

export type TailDirection =
  | 'top-left' | 'top' | 'top-right'
  | 'right'
  | 'bottom-right' | 'bottom' | 'bottom-left'
  | 'left'

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
  read_count: number
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
  // Text layer fields. Null on all non-text rows.
  text_content:    string | null
  font_family:     string | null
  font_size:       number | null
  text_color:      string | null
  font_weight:     string | null
  text_align:      string | null
  line_height:     number | null
  letter_spacing:  number | null
  // Text layer type system. Null on legacy plain-text rows — treated as 'plain'.
  text_layer_type: TextLayerType | null
  background_color: string | null
  has_tail:         boolean
  border_radius:    number | null
  // Tail position. Non-nullable — DB defaults: direction='bottom', offset=50.
  tail_direction:      TailDirection
  tail_offset_percent: number
  tail_length:         number
  created_at: string
}

export const PANEL_HEIGHT_PRESETS = {
  WEBTOON: 640,
  BOOK:    1200,
  COMIC:   800,
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
  // Text-specific defaults. Present only on the 'text' entry; undefined on others.
  text_content?: string
  font_family?: string
  font_size?: number
  text_color?: string
  font_weight?: string
  text_align?: string
  line_height?: number
  letter_spacing?: number
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
  text: {
    x_percent: 10,
    y_percent: 75,
    width_percent: 80,
    height_percent: 20,
    is_fill: false,
    fill_mode: 'custom',
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
    text_layer_type: null,
    background_color: null,
    has_tail: false,
    border_radius: null,
  },
}

export interface TextLayerTypeDefaults {
  text_layer_type: TextLayerType
  font_family: string
  font_size: number
  text_color: string
  font_weight: string
  text_align: string
  line_height: number
  letter_spacing: number
  background_color: string | null
  border_radius: number | null
  has_tail: boolean
  tail_direction: TailDirection
  tail_offset_percent: number
  tail_length: number
  x_percent: number
  y_percent: number
  width_percent: number
  height_percent: number
  text_content: string
}

export const TEXT_LAYER_TYPE_DEFAULTS: Record<TextLayerType, TextLayerTypeDefaults> = {
  dialogue: {
    text_layer_type: 'dialogue',
    font_family: 'Bangers',
    font_size: 22,
    text_color: '#1A1A1A',
    font_weight: '400',
    text_align: 'center',
    line_height: 1.4,
    letter_spacing: 0,
    background_color: '#FFFFFF',
    border_radius: 16,
    has_tail: true,
    tail_direction: 'bottom',
    tail_offset_percent: 50,
    tail_length: 40,
    x_percent: 5,
    y_percent: 5,
    width_percent: 65,
    height_percent: 22,
    text_content: 'Dialogue...',
  },
  narrative: {
    text_layer_type: 'narrative',
    font_family: 'DM Sans',
    font_size: 18,
    text_color: '#F5EEE8',
    font_weight: '400',
    text_align: 'left',
    line_height: 1.6,
    letter_spacing: 0,
    background_color: 'rgba(14,6,8,0.78)',
    border_radius: 0,
    has_tail: false,
    tail_direction: 'bottom',
    tail_offset_percent: 50,
    tail_length: 40,
    x_percent: 0,
    y_percent: 0,
    width_percent: 100,
    height_percent: 18,
    text_content: 'Narration...',
  },
  caption: {
    text_layer_type: 'caption',
    font_family: 'DM Sans',
    font_size: 20,
    text_color: '#FFFFFF',
    font_weight: '500',
    text_align: 'center',
    line_height: 1.4,
    letter_spacing: 0.5,
    background_color: null,
    border_radius: null,
    has_tail: false,
    tail_direction: 'bottom',
    tail_offset_percent: 50,
    tail_length: 40,
    x_percent: 10,
    y_percent: 82,
    width_percent: 80,
    height_percent: 14,
    text_content: 'Caption',
  },
  sound_fx: {
    text_layer_type: 'sound_fx',
    font_family: 'Bangers',
    font_size: 52,
    text_color: '#F5EEE8',
    font_weight: '400',
    text_align: 'center',
    line_height: 1.1,
    letter_spacing: 2,
    background_color: null,
    border_radius: null,
    has_tail: false,
    tail_direction: 'bottom',
    tail_offset_percent: 50,
    tail_length: 40,
    x_percent: 20,
    y_percent: 35,
    width_percent: 60,
    height_percent: 22,
    text_content: 'BOOM!',
  },
  plain: {
    text_layer_type: 'plain',
    font_family: 'DM Sans',
    font_size: 24,
    text_color: '#F5EEE8',
    font_weight: '400',
    text_align: 'left',
    line_height: 1.4,
    letter_spacing: 0,
    background_color: null,
    border_radius: null,
    has_tail: false,
    tail_direction: 'bottom',
    tail_offset_percent: 50,
    tail_length: 40,
    x_percent: 10,
    y_percent: 75,
    width_percent: 80,
    height_percent: 20,
    text_content: 'Type here',
  },
}
