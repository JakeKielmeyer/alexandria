import { create } from 'zustand'
import type { GateName } from '../lib/gateFlow'
import type { StoryWithCreator } from '../types'

interface GateState {
  storyId: string | null
  story: StoryWithCreator | null
  clearedGates: GateName[]
  clearGate: (storyId: string, gate: GateName) => void
  unClearGate: (gate: GateName) => void
  resetForStory: (storyId: string, story: StoryWithCreator) => void
  setStory: (story: StoryWithCreator) => void
}

export const useGateStore = create<GateState>((set, get) => ({
  storyId: null,
  story: null,
  clearedGates: [],

  clearGate: (storyId, gate) => {
    const state = get()
    if (state.storyId !== storyId) {
      set({ storyId, clearedGates: [gate] })
    } else {
      if (!state.clearedGates.includes(gate)) {
        set({ clearedGates: [...state.clearedGates, gate] })
      }
    }
  },

  unClearGate: (gate) => set(state => ({
    clearedGates: state.clearedGates.filter(g => g !== gate)
  })),

  resetForStory: (storyId, story) => {
    const state = get()
    if (state.storyId !== storyId) {
      set({ storyId, story, clearedGates: [] })
    }
  },

  setStory: (story) => set({ story })
}))
