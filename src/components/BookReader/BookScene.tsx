import React from 'react'
import { useThree } from '@react-three/fiber'
import BookSpread from './BookSpread'
import type { StoryWithCreator } from '../../types'

interface BookSceneProps {
  story: StoryWithCreator
  spreadIndex: number
  onClickLeft: () => void
  onClickRight: () => void
}

export default function BookScene({
  spreadIndex,
  onClickLeft,
  onClickRight,
}: BookSceneProps): React.JSX.Element {
  const { size } = useThree()
  const scale = Math.min(size.height / 879, size.width / 1592) * 0.93

  return (
    <>
      <color attach="background" args={['#0E0608']} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[-5, 8, 5]} intensity={0.45} />

      <group scale={[scale, scale, 1]}>
        <BookSpread
          key={spreadIndex}
          onClickLeft={onClickLeft}
          onClickRight={onClickRight}
        />
      </group>
    </>
  )
}
