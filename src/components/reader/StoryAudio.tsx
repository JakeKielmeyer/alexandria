// src/components/reader/StoryAudio.tsx
//
// Story-level audio player for layers with panel_span_count > 1.
//
// Why lift this out of PanelLayers:
//   PanelLayers renders one <audio> element per panel. For a single-panel
//   audio that's fine, but a multi-panel audio rendered per panel would create
//   N independent <audio> elements that fight each other for playback. By
//   mounting span-mode audio once at the Reader level we keep one element per
//   layer and drive its play/pause from the active panel index — the audio
//   then loops seamlessly across panel transitions.
//
// Behaviour:
//   - Plays (with loop=true) while activePanelIndex ∈ [start, start+span-1].
//   - Pauses (without resetting currentTime) outside that range, so the reader
//     can scroll back and pick up where they left off.
//   - Respects the global Video & SFX toggle and volume from readerStore.

import React, { useEffect, useRef } from 'react'
import type { Layer } from '../../types'

export interface SpanAudioEntry {
  layer: Layer
  /** Index of the panel this layer originates on, in the panels array. */
  startPanelIndex: number
}

interface StoryAudioProps {
  entries: SpanAudioEntry[]
  activePanelIndex: number
  videoSfxEnabled: boolean
  videoVolume: number
}

function SpanAudioElement({
  layer, startPanelIndex, activePanelIndex, videoSfxEnabled, videoVolume,
}: SpanAudioEntry & {
  activePanelIndex: number
  videoSfxEnabled: boolean
  videoVolume: number
}): React.JSX.Element | null {
  const ref = useRef<HTMLAudioElement>(null)

  const span = Math.max(1, layer.panel_span_count ?? 1)
  const inRange =
    activePanelIndex >= startPanelIndex &&
    activePanelIndex < startPanelIndex + span

  const effectiveMuted = layer.muted || !videoSfxEnabled

  // Drive play / pause off the in-range flag.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (inRange) {
      if (layer.autoplay) {
        el.play().catch(() => { /* autoplay policy — ignore */ })
      }
    } else {
      el.pause()
    }
  }, [inRange, layer.autoplay])

  // Keep muted in sync (HTML attribute is initial-only).
  useEffect(() => {
    const el = ref.current
    if (el) el.muted = effectiveMuted
  }, [effectiveMuted])

  // Keep volume in sync.
  useEffect(() => {
    const el = ref.current
    if (el) el.volume = videoVolume
  }, [videoVolume])

  if (!layer.media_url) return null

  return (
    <audio
      ref={ref}
      src={layer.media_url}
      // Loop is forced on: span-mode audio is meant to play continuously
      // across the panel range, even if the source clip is shorter than the
      // total scroll time the reader spends in the span.
      loop
      autoPlay={layer.autoplay && inRange}
      muted={effectiveMuted}
      preload="auto"
      style={{ display: 'none' }}
    />
  )
}

export default function StoryAudio({
  entries, activePanelIndex, videoSfxEnabled, videoVolume,
}: StoryAudioProps): React.JSX.Element {
  return (
    <div aria-hidden style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      {entries.map((entry) => (
        <SpanAudioElement
          key={entry.layer.id}
          layer={entry.layer}
          startPanelIndex={entry.startPanelIndex}
          activePanelIndex={activePanelIndex}
          videoSfxEnabled={videoSfxEnabled}
          videoVolume={videoVolume}
        />
      ))}
    </div>
  )
}
