import React from 'react'
import { Html } from '@react-three/drei'
import { motion } from 'framer-motion'
import BookPage from './BookPage'
import PanelLayers from '../reader/PanelLayers'
import type { PanelWithMeta } from '../../hooks/useReaderData'
import type { Layer } from '../../types'

interface BookSpreadProps {
  spreadIndex: number
  leftPanel: PanelWithMeta | null
  rightPanel: PanelWithMeta | null
  videoSfxEnabled: boolean
  musicEnabled: boolean
  videoVolume: number
  onClickLeft: () => void
  onClickRight: () => void
}

export default function BookSpread({
  spreadIndex,
  leftPanel,
  rightPanel,
  videoSfxEnabled,
  musicEnabled,
  videoVolume,
  onClickLeft,
  onClickRight,
}: BookSpreadProps): React.JSX.Element {
  const spreadLayers: Layer[] = [
    ...(leftPanel?.layers.filter(l => l.is_spread_layer) ?? []),
    ...(rightPanel?.layers.filter(l => l.is_spread_layer) ?? []),
  ].sort((a, b) => a.position - b.position)

  return (
    <group>
      {/* Left page — click goes to previous spread */}
      <BookPage
        panelId={leftPanel?.panelId ?? null}
        position={[-200, 0, 0]}
        layers={leftPanel?.layers ?? []}
        videoSfxEnabled={videoSfxEnabled}
        musicEnabled={musicEnabled}
        videoVolume={videoVolume}
        onClick={onClickLeft}
      />

      {/* Spine shadow */}
      <mesh position={[0, 0, 0.5]}>
        <planeGeometry args={[4, 600]} />
        <meshStandardMaterial color="#555555" opacity={0.35} transparent />
      </mesh>

      {/* Right page — click advances to next spread */}
      <BookPage
        panelId={rightPanel?.panelId ?? null}
        position={[200, 0, 0]}
        layers={rightPanel?.layers ?? []}
        videoSfxEnabled={videoSfxEnabled}
        musicEnabled={musicEnabled}
        videoVolume={videoVolume}
        onClick={onClickRight}
      />

      {/* Spread layers — 800×600 coordinate space spanning both pages */}
      {spreadLayers.length > 0 && (
        <Html
          transform
          position={[0, 0, 2]}
          style={{ width: '800px', height: '600px', overflow: 'hidden', pointerEvents: 'none' }}
        >
          <motion.div
            key={`spread-${spreadIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            style={{ position: 'relative', width: '800px', height: '600px', overflow: 'hidden' }}
          >
            <PanelLayers
              layers={spreadLayers}
              videoSfxEnabled={videoSfxEnabled}
              musicEnabled={musicEnabled}
              videoVolume={videoVolume}
            />
          </motion.div>
        </Html>
      )}
    </group>
  )
}
