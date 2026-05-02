// src/store/editorStore.ts

import { create } from 'zustand'
import type { Asset, Story, StoryWithCreator, Panel, Layer } from '../types'

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'
export type EditorMode = 'design' | 'publish'
export type RailTab = 'properties' | 'layers'

interface EditorState {
  story: StoryWithCreator | null
  panels: Panel[]
  layers: Layer[]
  activePanelId: string | null
  activeLayerId: string | null
  saveStatus: SaveStatus
  editorMode: EditorMode
  defaultChunkId: string | null
  gridVisible: boolean
  gridSize: number
  railTab: RailTab

  setStory: (story: StoryWithCreator) => void
  setPanels: (panels: Panel[]) => void
  setLayers: (layers: Layer[]) => void
  addPanel: (panel: Panel) => void
  updatePanel: (panelId: string, updates: Partial<Panel>) => void
  updateStory: (updates: Partial<Story>) => void
  deletePanel: (panelId: string) => void
  addLayer: (layer: Layer) => void
  updateLayer: (layerId: string, updates: Partial<Layer>) => void
  deleteLayer: (layerId: string) => void
  setActivePanelId: (id: string | null) => void
  setActiveLayerId: (id: string | null) => void
  setSaveStatus: (status: SaveStatus) => void
  setEditorMode: (mode: EditorMode) => void
  reorderPanels: (orderedIds: string[]) => void
  setDefaultChunkId: (id: string | null) => void
  toggleGrid: () => void
  setGridSize: (size: number) => void
  setRailTab: (tab: RailTab) => void
  reset: () => void
}

const initialState = {
  story: null,
  panels: [],
  layers: [],
  activePanelId: null,
  activeLayerId: null,
  saveStatus: 'saved' as SaveStatus,
  editorMode: 'design' as EditorMode,
  defaultChunkId: null,
  gridVisible: false,
  gridSize: 48,
  railTab: 'properties' as RailTab,
}

export const useEditorStore = create<EditorState>((set) => ({
  ...initialState,

  setStory: (story) => set({ story }),
  setPanels: (panels) => set({ panels }),
  setLayers: (layers) => set({ layers }),

  addPanel: (panel) => set((state) => ({
    panels: [...state.panels, panel],
  })),

  updatePanel: (panelId, updates) => set((state) => ({
    panels: state.panels.map((p) => p.id === panelId ? { ...p, ...updates } : p),
  })),

  updateStory: (updates) => set((state) => ({
    story: state.story ? { ...state.story, ...updates } : null,
  })),

  deletePanel: (panelId) => set((state) => ({
    panels: state.panels.filter((p) => p.id !== panelId),
    activePanelId: state.activePanelId === panelId ? null : state.activePanelId,
    layers: state.layers.filter((l) => l.panel_id !== panelId),
  })),

  addLayer: (layer) => set((state) => ({
    layers: [...state.layers, layer],
  })),

  updateLayer: (layerId, updates) => set((state) => ({
    layers: state.layers.map((l) => l.id === layerId ? { ...l, ...updates } : l),
  })),

  deleteLayer: (layerId) => set((state) => ({
    layers: state.layers.filter((l) => l.id !== layerId),
    activeLayerId: state.activeLayerId === layerId ? null : state.activeLayerId,
  })),

  setActivePanelId: (id) => set({ activePanelId: id, activeLayerId: null }),
  setActiveLayerId: (id) => set({ activeLayerId: id }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setEditorMode: (editorMode) => set({ editorMode }),
  reorderPanels: (orderedIds) => set((state) => ({
    panels: state.panels.map((p) => ({ ...p, position: orderedIds.indexOf(p.id) })),
  })),
  setDefaultChunkId: (defaultChunkId) => set({ defaultChunkId }),
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  setGridSize: (gridSize) => set({ gridSize }),
  setRailTab: (railTab) => set({ railTab }),
  reset: () => set(initialState),
}))
