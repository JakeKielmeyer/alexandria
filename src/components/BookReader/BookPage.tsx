import React from 'react'
import { Html } from '@react-three/drei'
import { motion } from 'framer-motion'
import PanelLayers from '../reader/PanelLayers'
import type { Layer } from '../../types'

interface BookPageProps {
  panelId: string | null
  position: [number, number, number]
  layers: Layer[]
  videoSfxEnabled: boolean
  musicEnabled: boolean
  videoVolume: number
  onClick?: () => void
}

export default function BookPage({
  panelId,
  position,
  layers,
  videoSfxEnabled,
  musicEnabled,
  videoVolume,
  onClick,
}: BookPageProps): React.JSX.Element {
  const pageLayers = layers.filter(l => !l.is_spread_layer)

  return (
    <group position={position}>
      <mesh onClick={onClick}>
        <planeGeometry args={[400, 600]} />
        <meshStandardMaterial color="#f0ece4" />
      </mesh>
      <Html
        transform
        position={[0, 0, 1]}
        style={{ width: '400px', height: '600px', overflow: 'hidden', pointerEvents: 'none' }}
      >
        <motion.div
          key={panelId ?? 'empty'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          style={{ position: 'relative', width: '400px', height: '600px', overflow: 'hidden' }}
        >
          {pageLayers.length > 0 && (
            <PanelLayers
              layers={pageLayers}
              videoSfxEnabled={videoSfxEnabled}
              musicEnabled={musicEnabled}
              videoVolume={videoVolume}
            />
          )}
        </motion.div>
      </Html>
    </group>
  )
}
