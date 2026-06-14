import { create } from 'zustand'

// Reader-side playback preferences. Both the Interstitial gate and the
// Navbar speaker button write to `videoSfxEnabled` — they are two control
// surfaces over the same underlying state. `musicEnabled` is set by the
// Interstitial's Music switch; the music feature itself isn't wired into
// playback yet, so the flag is currently UI-only.
interface ReaderState {
  videoSfxEnabled: boolean
  musicEnabled: boolean
  videoVolume: number
  setVideoSfx: (on: boolean) => void
  toggleVideoSfx: () => void
  setMusic: (on: boolean) => void
  toggleMusic: () => void
  setVideoVolume: (volume: number) => void
}

export const useReaderStore = create<ReaderState>((set) => ({
  videoSfxEnabled: false,
  musicEnabled: false,
  videoVolume: 1,
  setVideoSfx: (on) => set({ videoSfxEnabled: on }),
  toggleVideoSfx: () => set((s) => ({ videoSfxEnabled: !s.videoSfxEnabled })),
  setMusic: (on) => set({ musicEnabled: on }),
  toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
  setVideoVolume: (volume) => set({ videoVolume: volume }),
}))
