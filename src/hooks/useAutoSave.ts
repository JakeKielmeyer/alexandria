// src/hooks/useAutoSave.ts

import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useEditorStore } from '../store/editorStore'

const DEBOUNCE_MS = 2000

export function useAutoSave(): void {
  const { story, panels, layers, saveStatus, setSaveStatus } = useEditorStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMounted = useRef(true)
  const requestIdRef = useRef(0)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const save = useCallback(async (): Promise<void> => {
    if (!story) return
    if (!isMounted.current) return

    const myId = ++requestIdRef.current
    const isStale = (): boolean => !isMounted.current || myId !== requestIdRef.current

    setSaveStatus('saving')

    try {
      const storyUpdates: Record<string, unknown> = {
        title: story.title,
        content_rating: story.content_rating,
        reading_mode: story.reading_mode,
        creator_bio: story.creator_bio,
        creator_links: story.creator_links,
        updated_at: new Date().toISOString(),
      }
      if (story.transition_style != null) storyUpdates.transition_style = story.transition_style
      if (story.transition_duration_ms != null) storyUpdates.transition_duration_ms = story.transition_duration_ms

      const { error: storyError } = await supabase
        .from('stories')
        .update(storyUpdates)
        .eq('id', story.id)

      if (isStale()) return
      if (storyError) throw new Error(storyError.message)

      for (let i = 0; i < panels.length; i++) {
        if (isStale()) return
        const panel = panels[i]
        const { error: panelError } = await supabase
          .from('panels')
          .update({
            // Use panel.position (mutated by reorderPanels) rather than the
            // array index — the panels[] array isn't reordered after a drag,
            // so writing `position: i` would silently undo the reorder on
            // the next autosave.
            position: panel.position,
            height: panel.height,
            image_url: panel.image_url,
          })
          .eq('id', panel.id)
        if (panelError) throw new Error(panelError.message)
      }

      for (const layer of layers) {
        if (isStale()) return
        const { data: updatedLayer, error: layerError } = await supabase
          .from('layers')
          .update({
            position: layer.position,
            media_url: layer.media_url,
            name: layer.name ?? null,
            x_percent: layer.x_percent,
            y_percent: layer.y_percent,
            width_percent: layer.width_percent,
            height_percent: layer.height_percent,
            is_fill: layer.is_fill,
            fill_mode: layer.fill_mode,
            focal_x_percent: layer.focal_x_percent,
            focal_y_percent: layer.focal_y_percent,
            opacity: layer.opacity,
            autoplay: layer.autoplay,
            loop: layer.loop,
            muted: layer.muted,
            playback_rate: layer.playback_rate,
            panel_span_count: layer.panel_span_count ?? 1,
            text_content: layer.text_content ?? null,
            font_family: layer.font_family ?? null,
            font_size: layer.font_size ?? null,
            text_color: layer.text_color ?? null,
            font_weight: layer.font_weight ?? null,
            text_align: layer.text_align ?? null,
            line_height: layer.line_height ?? null,
            letter_spacing: layer.letter_spacing ?? null,
            text_layer_type: layer.text_layer_type ?? null,
            background_color: layer.background_color ?? null,
            has_tail: layer.has_tail ?? false,
            border_radius: layer.border_radius ?? null,
            tail_direction: layer.tail_direction ?? 'bottom',
            tail_offset_percent: layer.tail_offset_percent ?? 50,
            tail_length: layer.tail_length ?? 40,
            tip_x_percent: layer.tip_x_percent ?? null,
            tip_y_percent: layer.tip_y_percent ?? null,
          })
          .eq('id', layer.id)
          .select('id')
          .single()
        if (layerError) throw new Error(layerError.message)
        if (!updatedLayer) throw new Error(`Layer ${layer.id} not found — possible session expiry or RLS violation`)
      }

      // Sync font_manifest: collect all unique fonts used by text layers and
      // persist them on the story so the reader can preload them.
      if (!isStale()) {
        const usedFonts = Array.from(new Set(
          layers
            .filter((l) => l.media_type === 'text' && l.font_family)
            .map((l) => l.font_family as string),
        ))
        const currentManifest: string[] = story.font_manifest ?? []
        const merged = Array.from(new Set([...currentManifest, ...usedFonts]))
        if (merged.length !== currentManifest.length || merged.some((f) => !currentManifest.includes(f))) {
          await supabase.from('stories').update({ font_manifest: merged }).eq('id', story.id)
        }
      }

      // Sync font_manifest: collect all unique fonts used by text layers and
      // persist them on the story so the reader can preload them.
      if (!isStale()) {
        const usedFonts = Array.from(new Set(
          layers
            .filter((l) => l.media_type === 'text' && l.font_family)
            .map((l) => l.font_family as string),
        ))
        const currentManifest: string[] = story.font_manifest ?? []
        const merged = Array.from(new Set([...currentManifest, ...usedFonts]))
        if (merged.length !== currentManifest.length || merged.some((f) => !currentManifest.includes(f))) {
          await supabase.from('stories').update({ font_manifest: merged }).eq('id', story.id)
        }
      }

      if (!isStale()) setSaveStatus('saved')
    } catch (err) {
      if (!isStale()) {
        setSaveStatus('error')
        if (import.meta.env.DEV) console.error('[autosave]', err)
      }
    }
  }, [story, panels, layers, setSaveStatus])

  useEffect(() => {
    if (saveStatus !== 'unsaved') return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      void save()
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [saveStatus, save])
}
