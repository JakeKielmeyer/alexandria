import React from 'react'
import BookPage from './BookPage'

interface BookSpreadProps {
  onClickLeft: () => void
  onClickRight: () => void
}

export default function BookSpread({ onClickLeft, onClickRight }: BookSpreadProps): React.JSX.Element {
  return (
    <group>
      <BookPage position={[-398, 0, 0]} onClick={onClickLeft} />

      {/* Spine shadow */}
      <mesh position={[0, 0, 0.5]}>
        <planeGeometry args={[4, 879]} />
        <meshStandardMaterial color="#555555" opacity={0.35} transparent />
      </mesh>

      <BookPage position={[398, 0, 0]} onClick={onClickRight} />
    </group>
  )
}
