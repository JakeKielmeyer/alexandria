import React, { useCallback, useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { buildTailPath } from './geometry'
import type { Point } from './types'

interface BubbleTailProps {
  base: Point
  tangent: Point
  tip: Point
  halfWidth: number
  curvature: number
  fill: string
  tipInsideBubble: boolean
  isActive: boolean
  panelWidth: number
  panelHeight: number
  onSelect: () => void
  onTipDragStart: () => void
  onTipDrag: (x: number, y: number) => void
  onTipDragEnd: (x: number, y: number) => void
}

export function BubbleTail({
  base,
  tangent,
  tip,
  halfWidth,
  curvature,
  fill,
  tipInsideBubble,
  isActive,
  panelWidth,
  panelHeight,
  onSelect,
  onTipDragStart,
  onTipDrag,
  onTipDragEnd,
}: BubbleTailProps): React.JSX.Element {
  const SPRING_CONFIG = { stiffness: 200, damping: 25 }

  const springX = useSpring(base.x, SPRING_CONFIG)
  const springY = useSpring(base.y, SPRING_CONFIG)
  const pathD = useMotionValue(buildTailPath(base, tangent, tip, halfWidth, curvature))

  const dragRef = useRef<{ pointerId: number; svgRect: DOMRect } | null>(null)

  useEffect(() => {
    springX.set(base.x)
    springY.set(base.y)
  }, [base.x, base.y, springX, springY])

  useEffect(() => {
    const unsubX = springX.on('change', (x) => {
      pathD.set(buildTailPath({ x, y: springY.get() }, tangent, tip, halfWidth, curvature))
    })
    const unsubY = springY.on('change', (y) => {
      pathD.set(buildTailPath({ x: springX.get(), y }, tangent, tip, halfWidth, curvature))
    })
    return () => {
      unsubX()
      unsubY()
    }
  }, [springX, springY, pathD, tangent, tip, halfWidth, curvature])

  useEffect(() => {
    pathD.set(
      buildTailPath(
        { x: springX.get(), y: springY.get() },
        tangent,
        tip,
        halfWidth,
        curvature,
      ),
    )
  }, [tip.x, tip.y, tangent.x, tangent.y, halfWidth, curvature, pathD, springX, springY])

  const toSVGCoords = useCallback(
    (clientX: number, clientY: number, svgRect: DOMRect) => {
      const scaleX = panelWidth / svgRect.width
      const scaleY = panelHeight / svgRect.height
      return {
        x: Math.min(Math.max((clientX - svgRect.left) * scaleX, 0), panelWidth),
        y: Math.min(Math.max((clientY - svgRect.top) * scaleY, 0), panelHeight),
      }
    },
    [panelWidth, panelHeight],
  )

  const handleWindowPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragRef.current || e.pointerId !== dragRef.current.pointerId) return
      const coords = toSVGCoords(e.clientX, e.clientY, dragRef.current.svgRect)
      onTipDrag(coords.x, coords.y)
    },
    [toSVGCoords, onTipDrag],
  )

  const handleWindowPointerUp = useCallback(
    (e: PointerEvent) => {
      if (!dragRef.current || e.pointerId !== dragRef.current.pointerId) return
      const coords = toSVGCoords(e.clientX, e.clientY, dragRef.current.svgRect)
      dragRef.current = null
      onTipDragEnd(coords.x, coords.y)
    },
    [toSVGCoords, onTipDragEnd],
  )

  useEffect(() => {
    window.addEventListener('pointermove', handleWindowPointerMove)
    window.addEventListener('pointerup', handleWindowPointerUp)
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', handleWindowPointerUp)
    }
  }, [handleWindowPointerMove, handleWindowPointerUp])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGPathElement>) => {
      e.stopPropagation()
      if (!isActive) {
        onSelect()
        return
      }
      const svgEl = e.currentTarget.ownerSVGElement
      if (!svgEl) return
      ;(e.currentTarget as SVGPathElement).setPointerCapture(e.pointerId)
      dragRef.current = { pointerId: e.pointerId, svgRect: svgEl.getBoundingClientRect() }
      onTipDragStart()
    },
    [isActive, onSelect, onTipDragStart],
  )

  return (
    <motion.path
      d={pathD}
      fill={fill}
      stroke="none"
      style={{
        opacity: tipInsideBubble ? 0 : 1,
        transition: 'opacity 0.15s ease',
        cursor: isActive ? 'crosshair' : 'default',
        pointerEvents: tipInsideBubble ? 'none' : 'auto',
      }}
      onPointerDown={handlePointerDown}
      onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
    />
  )
}
