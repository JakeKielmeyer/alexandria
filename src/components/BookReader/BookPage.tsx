import React from 'react'

interface BookPageProps {
  position: [number, number, number]
  /** Reserved for Phase 5 mobile override cascade. No logic here yet. */
  isMobile?: boolean
  onClick?: () => void
}

export default function BookPage({ position, onClick }: BookPageProps): React.JSX.Element {
  return (
    <group position={position}>
      <mesh onClick={onClick}>
        <planeGeometry args={[796, 879]} />
        <meshStandardMaterial color="#f0ece4" />
      </mesh>
    </group>
  )
}
