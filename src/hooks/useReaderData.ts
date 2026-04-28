import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Chunk, Panel, Layer, MediaType, StoryWithCreator } from '../types'

export interface PanelWithMeta {
  panelId: string
  /** All visual + audio layers for this panel, sorted ascending by position (low = behind). */
  layers: Layer[]
  /** URL of the top visual layer — kept for thumbnail strip rendering. */
  image_url: string
  /** Media type of the top visual layer — kept for thumbnail strip. */
  mediaType: MediaType | null
  height: number
  chapterNumber: number
  chapterTitle: string | null
  pageInChapter: number
  isFirstInChapter: boolean
}

interface ReaderData {
  panels: PanelWithMeta[]
  loading: boolean
  error: string | null
}

export function useReaderData(story: StoryWithCreator | null): ReaderData {
  const [panels, setPanels] = useState<PanelWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!story) return

    let cancelled = false

    async function load(): Promise<void> {
      try {
        setLoading(true)
        setError(null)

        const { data: chunkData, error: chunkError } = await supabase
          .from('chunks')
          .select('*')
          .eq('story_id', story!.id)
          .order('position', { ascending: true })

        if (chunkError) throw new Error(chunkError.message)

        if (!chunkData || chunkData.length === 0) {
          if (!cancelled) { setPanels([]); setLoading(false) }
          return
        }

        const chunks = chunkData as Chunk[]

        const { data: panelData, error: panelError } = await supabase
          .from('panels')
          .select('*')
          .eq('story_id', story!.id)
          .order('position', { ascending: true })

        if (panelError) throw new Error(panelError.message)

        const rawPanels = (panelData ?? []) as Panel[]

        if (rawPanels.length === 0) {
          if (!cancelled) { setPanels([]); setLoading(false) }
          return
        }

        const panelIds = rawPanels.map(p => p.id)

        const { data: layerData, error: layerError } = await supabase
          .from('layers')
          .select('*')
          .in('panel_id', panelIds)
          .order('position', { ascending: true })

        if (layerError) throw new Error(layerError.message)

        const allLayers = (layerData ?? []) as Layer[]

        // Build lookup maps
        const chunkMap = new Map<string, Chunk>()
        for (const chunk of chunks) {
          chunkMap.set(chunk.id, chunk)
        }

        const layerMap = new Map<string, Layer[]>()
        for (const layer of allLayers) {
          const existing = layerMap.get(layer.panel_id) ?? []
          layerMap.set(layer.panel_id, [...existing, layer])
        }

        const pageCountPerChapter = new Map<number, number>()
        const built: PanelWithMeta[] = []

        // Fallback: if a panel has a null or orphaned chunk_id, assume it belongs
        // to the story's first chunk. Prevents silent data loss when the editor
        // created a panel before the default chunk finished loading.
        const firstChunk = chunks[0] ?? null

        for (const panel of rawPanels) {
          const chunk = (panel.chunk_id ? chunkMap.get(panel.chunk_id) : null) ?? firstChunk
          if (!chunk) continue

          const chapterNumber = chunk.chapter_number
          const prior = pageCountPerChapter.get(chapterNumber) ?? 0
          const pageInChapter = prior + 1
          pageCountPerChapter.set(chapterNumber, pageInChapter)

          // Derive display image from the top visual layer (highest position, non-audio, has URL)
          const panelLayers = layerMap.get(panel.id) ?? []
          const topVisualLayer = panelLayers
            .filter((l): l is Layer => l.media_type !== 'audio' && l.media_url !== null)
            .sort((a, b) => b.position - a.position)[0]

          // Full layer list sorted ascending (low position = behind, high = in front).
          // The PanelLayers renderer walks this in order so CSS stacking matches.
          const sortedLayers = [...panelLayers].sort((a, b) => a.position - b.position)

          built.push({
            panelId: panel.id,
            layers: sortedLayers,
            // Thumbnail / strip still needs the top-visual-layer URL + type.
            image_url: topVisualLayer?.media_url ?? '',
            mediaType: topVisualLayer?.media_type ?? null,
            height: panel.height,
            chapterNumber,
            chapterTitle: chunk.chapter_title,
            pageInChapter,
            isFirstInChapter: pageInChapter === 1,
          })
        }

        if (!cancelled) {
          setPanels(built)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load story.')
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
    // The effect only needs to re-run when we switch stories, which `story?.id`
    // captures — re-creating on every `story` object identity change would
    // refetch every time the creator-links array (or any other field) mutates
    // in the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id])

  return { panels, loading, error }
}
