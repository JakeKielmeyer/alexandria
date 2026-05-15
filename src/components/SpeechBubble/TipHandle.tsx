import React, { useCallback, useEffect, useRef } from 'react'

interface TipHandleProps {
  tip: { x: number; y: number }
  panelWidth: number
  panelHeight: number
  onDragStart: () => void
  onDrag: (x: number, y: number) => void
  onDragEnd: (x: number, y: number) => void
}

export function TipHandle({
  tip,
  panelWidth,
  panelHeight,
  onDragStart,
  onDrag,
  onDragEnd,
}: TipHandleProps): React.JSX.Element {
  // Store pointerId + the SVG bounding rect captured at drag-start so that
  // coordinate math stays stable even if the panel resizes mid-drag.
  const dragRef = useRef<{ pointerId: number; svgRect: DOMRect } | null>(null)

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
      onDrag(coords.x, coords.y)
    },
    [toSVGCoords, onDrag],
  )

  const handleWindowPointerUp = useCallback(
    (e: PointerEvent) => {
      if (!dragRef.current || e.pointerId !== dragRef.current.pointerId) return
      const coords = toSVGCoords(e.clientX, e.clientY, dragRef.current.svgRect)
      dragRef.current = null
      onDragEnd(coords.x, coords.y)
    },
    [toSVGCoords, onDragEnd],
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
    (e: React.PointerEvent<SVGCircleElement>) => {
      e.stopPropagation()
      const svgEl = e.currentTarget.ownerSVGElement
      if (!svgEl) return
      ;(e.currentTarget as SVGCircleElement).setPointerCapture(e.pointerId)
      dragRef.current = { pointerId: e.pointerId, svgRect: svgEl.getBoundingClientRect() }
      onDragStart()
    },
    [onDragStart],
  )

  return (
    <circle
      cx={tip.x}
      cy={tip.y}
      r={8}
      fill="white"
      stroke="#DC5A8A"
      strokeWidth={2}
      style={{ cursor: 'crosshair' }}
      onPointerDown={handlePointerDown}
      onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
    />
  )
}

export default TipHandle
