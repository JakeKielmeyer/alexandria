import React, { Suspense } from 'react'
import { useTexture } from '@react-three/drei'

interface BookCoverProps {
  coverUrl: string | null
  onClick: () => void
}

function CoverWithTexture({ coverUrl, onClick }: { coverUrl: string; onClick: () => void }): React.JSX.Element {
  const texture = useTexture(coverUrl)
  return (
    <mesh onClick={onClick}>
      <planeGeometry args={[796, 879]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}

function CoverPlain({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <mesh onClick={onClick}>
      <planeGeometry args={[796, 879]} />
      <meshStandardMaterial color="#2a1a1f" />
    </mesh>
  )
}

export default function BookCover({ coverUrl, onClick }: BookCoverProps): React.JSX.Element {
  return (
    <group>
      {coverUrl ? (
        <Suspense fallback={<CoverPlain onClick={onClick} />}>
          <CoverWithTexture coverUrl={coverUrl} onClick={onClick} />
        </Suspense>
      ) : (
        <CoverPlain onClick={onClick} />
      )}
    </group>
  )
}
