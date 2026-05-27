import React from 'react'
import { useThree } from '@react-three/fiber'
import BookSpread from './BookSpread'
import BookPage from './BookPage'
import { BOOK_PAGE_HEIGHT, BOOK_PAGE_WIDTH, BOOK_SPREAD_WIDTH } from '../../types'

interface BookSceneProps {
  /** Used as key on BookSpread to remount on spread change (landscape only). */
  spreadIndex: number
  /** When true, renders a single centred page instead of a full spread. */
  portrait?: boolean
  onClickLeft: () => void
  onClickRight: () => void
}

export default function BookScene({
  spreadIndex,
  portrait = false,
  onClickLeft,
  onClickRight,
}: BookSceneProps): React.JSX.Element {
  const { size } = useThree()

  // Match the CSS overlay's scale formula so the mesh aligns with the overlaid content.
  const scale = portrait
    ? Math.min(size.height / BOOK_PAGE_HEIGHT, size.width / BOOK_PAGE_WIDTH) * 0.93
    : Math.min(size.height / BOOK_PAGE_HEIGHT, size.width / BOOK_SPREAD_WIDTH) * 0.93

  return (
    <>
      <color attach="background" args={['#0E0608']} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[-5, 8, 5]} intensity={0.45} />

      <group scale={[scale, scale, 1]}>
        {portrait ? (
          // Portrait: single parchment page centred in the scene.
          // Click anywhere → advance (same direction as swipe right).
          <BookPage position={[0, 0, 0]} isMobile onClick={onClickRight} />
        ) : (
          // Landscape: two-page spread with spine.
          <BookSpread
            key={spreadIndex}
            onClickLeft={onClickLeft}
            onClickRight={onClickRight}
          />
        )}
      </group>
    </>
  )
}
