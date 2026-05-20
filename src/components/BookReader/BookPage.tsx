import React from 'react'

interface BookPageProps {
  position: [number, number, number]
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
