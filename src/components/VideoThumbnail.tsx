// src/components/VideoThumbnail.tsx
//
// Frame-grab a still from a video URL to use as a poster. Drawn into a
// canvas on mount, converted to a data URL, then the <video> element is
// torn down. If canvas draw is blocked (usually CORS on Supabase), we fall
// back to a live <video> tag seeked to the same timestamp — frames are
// safe to render even when taint prevents canvas export.

import React, { useEffect, useRef, useState } from 'react'

interface VideoThumbnailProps {
  src: string
  alt?: string
  /** Seconds into the clip to sample. Defaults to min(1, duration*0.1). */
  seekTo?: number
  className?: string
  style?: React.CSSProperties
}

export default function VideoThumbnail({
  src, alt = '', seekTo, className, style,
}: VideoThumbnailProps): React.JSX.Element {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [fallbackVideo, setFallbackVideo] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    let cancelled = false
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.src = src
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'

    const onMeta = (): void => {
      if (cancelled) return
      const t = seekTo ?? Math.min(1, (video.duration || 10) * 0.1)
      video.currentTime = Math.max(0, t)
    }

    const onSeeked = (): void => {
      if (cancelled) return
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 320
        canvas.height = video.videoHeight || 180
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          setFallbackVideo(true)
          return
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        // Will throw SecurityError if the canvas is tainted by CORS.
        const url = canvas.toDataURL('image/jpeg', 0.7)
        setDataUrl(url)
      } catch {
        setFallbackVideo(true)
      } finally {
        video.src = ''
        video.load()
      }
    }

    const onError = (): void => {
      if (cancelled) return
      setFallbackVideo(true)
    }

    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)

    return () => {
      cancelled = true
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      video.src = ''
    }
  }, [src, seekTo])

  if (dataUrl) {
    return <img src={dataUrl} alt={alt} className={className} style={style} draggable={false} />
  }

  if (fallbackVideo) {
    // Tainted canvas fallback — render a muted paused <video> seeked to a frame.
    // Frames display safely even when canvas export is blocked.
    return (
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => {
          const el = e.currentTarget
          const t = seekTo ?? Math.min(1, (el.duration || 10) * 0.1)
          try { el.currentTime = Math.max(0, t) } catch { /* noop */ }
        }}
        className={className}
        style={style}
        aria-label={alt}
      />
    )
  }

  // Loading state — dark placeholder with a small play glyph.
  return (
    <div
      className={className}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(14,6,8,0.9)',
      }}
      aria-label={alt}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ opacity: 0.5 }}>
        <path d="M4 3l7 4-7 4V3z" fill="currentColor" />
      </svg>
    </div>
  )
}
