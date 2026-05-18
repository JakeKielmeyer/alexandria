import React from 'react'
import { useThree } from '@react-three/fiber'
import BookCover from './BookCover'
import BookSpread from './BookSpread'
import type { PanelWithMeta } from '../../hooks/useReaderData'
import type { StoryWithCreator } from '../../types'

interface BookSceneProps {
  story: StoryWithCreator
  panels: PanelWithMeta[]
  spreadIndex: number
  onOpenCover: () => void
  onClickLeft: () => void
  onClickRight: () => void
  videoSfxEnabled: boolean
  musicEnabled: boolean
  videoVolume: number
}

export default function BookScene({
  story,
  panels,
  spreadIndex,
  onOpenCover,
  onClickLeft,
  onClickRight,
  videoSfxEnabled,
  musicEnabled,
  videoVolume,
}: BookSceneProps): React.JSX.Element {
  const { size } = useThree()

  // Scale the scene so the book fills the viewport with a small margin.
  // Cover (400×600) uses single-page width; spread (800×600) uses double.
  const contentWidth = spreadIndex === 0 ? 400 : 800
  const scale = Math.min(size.height / 600, size.width / contentWidth) * 0.93

  const leftPanel = spreadIndex > 0 ? (panels[(spreadIndex - 1) * 2] ?? null) : null
  const rightPanel = spreadIndex > 0 ? (panels[(spreadIndex - 1) * 2 + 1] ?? null) : null

  return (
    <>
      <color attach="background" args={['#0E0608']} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[-5, 8, 5]} intensity={0.45} />

      <group scale={[scale, scale, 1]}>
        {spreadIndex === 0 ? (
          <BookCover
            key="cover"
            coverUrl={story.cover_url}
            onClick={onOpenCover}
          />
        ) : (
          <BookSpread
            key={spreadIndex}
            spreadIndex={spreadIndex}
            leftPanel={leftPanel}
            rightPanel={rightPanel}
            videoSfxEnabled={videoSfxEnabled}
            musicEnabled={musicEnabled}
            videoVolume={videoVolume}
            onClickLeft={onClickLeft}
            onClickRight={onClickRight}
          />
        )}
      </group>
    </>
  )
}
