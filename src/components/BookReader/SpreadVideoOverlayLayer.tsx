import React, { useRef, useEffect } from 'react'
import type { Layer } from '../../types'

interface Props {
  layer: Layer
  videoSfxEnabled: boolean
  videoVolume: number
  isFreezing: boolean
}

export default function SpreadVideoOverlayLayer({ layer, videoSfxEnabled, videoVolume, isFreezing }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const effectiveMuted = layer.muted || !videoSfxEnabled

  // Play when not freezing; pause when freezing. Runs on mount too, so if
  // the overlay appears before the flip has fully settled (isFreezing=true),
  // the video stays paused until isFreezing becomes false — prevents the
  // play→pause→play stutter that would otherwise occur on arrival.
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (isFreezing) {
      el.pause()
    } else if (layer.autoplay) {
      el.play().catch(() => {})
    }
  }, [isFreezing, layer.autoplay])

  // Reset to the beginning when this spread is navigated away from.
  useEffect(() => {
    return () => {
      const el = videoRef.current
      if (!el) return
      el.pause()
      try { el.currentTime = 0 } catch { /* noop */ }
    }
  }, [])

  useEffect(() => {
    const el = videoRef.current
    if (el) el.muted = effectiveMuted
  }, [effectiveMuted])

  useEffect(() => {
    const el = videoRef.current
    if (el) el.volume = videoVolume
  }, [videoVolume])

  // layer x/y/w/h are spread-relative % — the overlay covers the full spread,
  // so these apply directly without the 2× page-width conversion PanelLayers uses.
  const fillMode = layer.fill_mode ?? (layer.is_fill ? 'crop' : 'custom')

  const containerStyle: React.CSSProperties = fillMode === 'custom'
    ? {
        position: 'absolute',
        left: `${layer.x_percent ?? 0}%`,
        top: `${layer.y_percent ?? 0}%`,
        width: `${layer.width_percent ?? 100}%`,
        height: `${layer.height_percent ?? 100}%`,
        opacity: layer.opacity,
        overflow: 'hidden',
      }
    : { position: 'absolute', inset: 0, opacity: layer.opacity, overflow: 'hidden' }

  const objectFit: React.CSSProperties['objectFit'] =
    fillMode === 'crop' ? 'cover' : fillMode === 'stretch' ? 'fill' : 'contain'

  return (
    <div style={containerStyle}>
      <video
        ref={videoRef}
        src={layer.media_url!}
        style={{ width: '100%', height: '100%', display: 'block', objectFit }}
        muted={effectiveMuted}
        loop={layer.loop}
        playsInline
        preload="auto"
      />
    </div>
  )
}
