// src/pages/Editor.tsx

import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useEditorStore } from '../store/editorStore'
import { useAuthStore } from '../store/authStore'
import { useAutoSave } from '../hooks/useAutoSave'
import EditorTopBar from '../components/editor/EditorTopBar'
import EditorFilmstrip from '../components/editor/EditorFilmstrip'
import EditorCanvas from '../components/editor/EditorCanvas'
import EditorRail from '../components/editor/EditorRail'
import type { StoryWithCreator, Panel, Layer } from '../types'
import '../styles/editor.css'

export default function Editor(): React.JSX.Element {
  const { storyId } = useParams<{ storyId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    story,
    setStory, setPanels, setLayers,
    setActivePanelId, setSaveStatus, setDefaultChunkId, reset,
  } = useEditorStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useAutoSave()

  useEffect(() => {
    if (!storyId || !user) return

    const load = async (): Promise<void> => {
      try {
        const { data: storyData, error: storyError } = await supabase
          .from('stories')
          .select('*, users!inner(username, display_name)')
          .eq('id', storyId)
          .eq('user_id', user.id)
          .single()

        if (storyError || !storyData) {
          setError('Story not found or you do not have permission to edit it.')
          setLoading(false)
          return
        }

        const storyWithCreator: StoryWithCreator = {
          ...storyData,
          username: (storyData.users as { username: string; display_name: string | null }).username,
          display_name: (storyData.users as { username: string; display_name: string | null }).display_name,
        }

        setStory(storyWithCreator)

        const { data: panelData, error: panelError } = await supabase
          .from('panels')
          .select('*')
          .eq('story_id', storyId)
          .order('position', { ascending: true })

        if (panelError) throw panelError

        const loadedPanels: Panel[] = panelData ?? []
        setPanels(loadedPanels)

        if (loadedPanels.length > 0) {
          setActivePanelId(loadedPanels[0].id)

          const panelIds = loadedPanels.map((p) => p.id)
          const { data: layerData, error: layerError } = await supabase
            .from('layers')
            .select('*')
            .in('panel_id', panelIds)
            .order('position', { ascending: true })

          if (layerError) throw layerError
          setLayers((layerData ?? []) as Layer[])
        }

        const { data: chunkData } = await supabase
          .from('chunks')
          .select('id')
          .eq('story_id', storyId)
          .order('position', { ascending: true })
          .limit(1)
          .single()

        if (chunkData) {
          setDefaultChunkId((chunkData as { id: string }).id)
        }

        setSaveStatus('saved')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load story.'
        setError(msg)
        if (import.meta.env.DEV) console.error('[editor-load]', err)
      } finally {
        setLoading(false)
      }
    }

    void load()
    return () => { reset() }
    // The listed Zustand setters (`setStory`, `setPanels`, `setLayers`,
    // `setActivePanelId`, `setSaveStatus`, `setDefaultChunkId`, `reset`) are
    // stable across renders. Including them would widen the dep array without
    // changing effect behavior — this effect must only re-run when the story
    // being edited changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, user])

  if (loading) {
    return (
      <div className="editor-root" data-theme="dark" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>Loading editor…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="editor-root" data-theme="dark" style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <span style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>{error}</span>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ color: 'var(--rose-accent)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="editor-root" data-theme="dark">
      {/* Keyed so switching stories remounts with the new title; lets
          EditorTopBar drop its prop→state sync useEffect. */}
      <EditorTopBar key={story?.id ?? 'no-story'} />
      <div className="editor-body">
        <EditorFilmstrip />
        <EditorCanvas />
        <EditorRail />
      </div>
    </div>
  )
}
