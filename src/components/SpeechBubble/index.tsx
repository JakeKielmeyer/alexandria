import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { Layer } from '../../types'
import { computeBasePoint } from './geometry'
import type { BubbleState, Point } from './geometry'
import { BubbleBody } from './BubbleBody'
import type { ResizeHandle } from './BubbleBody'
import { BubbleTail } from './BubbleTail'
import { TipHandle } from './TipHandle'

interface SpeechBubbleProps {
  layer: Layer
  panelWidth: number
  panelHeight: number
  isActive: boolean
  isEditingText: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<Layer>) => void
  onDoubleClick: () => void
  onExitEdit: () => void
}

interface BubblePixels {
  x: number
  y: number
  width: number
  height: number
  rx: number
}

const HALF_WIDTH = 11
const CURVATURE = 0.5
const MIN_BUBBLE_SIZE = 40

function toBubbleState(b: BubblePixels): BubbleState {
  return { x: b.x, y: b.y, width: b.width, height: b.height, rx: b.rx, ry: b.rx }
}

function initBubble(layer: Layer, pw: number, ph: number): BubblePixels {
  const x = (layer.x_percent / 100) * pw
  const y = (layer.y_percent / 100) * ph
  const width = ((layer.width_percent ?? 65) / 100) * pw
  const height = ((layer.height_percent ?? 22) / 100) * ph
  const rx = layer.border_radius ?? 16
  return { x, y, width, height, rx }
}

function initTip(layer: Layer, pw: number, ph: number, bubble: BubblePixels): Point {
  if (layer.tip_x_percent != null && layer.tip_y_percent != null) {
    return {
      x: (layer.tip_x_percent / 100) * pw,
      y: (layer.tip_y_percent / 100) * ph,
    }
  }
  return { x: bubble.x + bubble.width / 2, y: bubble.y + bubble.height + 50 }
}

function applyResize(
  handle: ResizeHandle,
  bubble: BubblePixels,
  dx: number,
  dy: number,
): BubblePixels {
  let { x, y, width, height } = bubble
  if (handle === 'tl') {
    x += dx
    y += dy
    width -= dx
    height -= dy
  }
  if (handle === 'tr') {
    y += dy
    width += dx
    height -= dy
  }
  if (handle === 'bl') {
    x += dx
    width -= dx
    height += dy
  }
  if (handle === 'br') {
    width += dx
    height += dy
  }
  // Clamp size; if we hit the floor on a top/left handle, freeze the origin so
  // the bubble doesn't drift while the user keeps dragging past the minimum.
  if (width < MIN_BUBBLE_SIZE) {
    if (handle === 'tl' || handle === 'bl') {
      x = bubble.x + bubble.width - MIN_BUBBLE_SIZE
    }
    width = MIN_BUBBLE_SIZE
  }
  if (height < MIN_BUBBLE_SIZE) {
    if (handle === 'tl' || handle === 'tr') {
      y = bubble.y + bubble.height - MIN_BUBBLE_SIZE
    }
    height = MIN_BUBBLE_SIZE
  }
  return { ...bubble, x, y, width, height }
}

export function SpeechBubble({
  layer,
  panelWidth,
  panelHeight,
  isActive,
  isEditingText,
  onSelect,
  onUpdate,
  onDoubleClick,
  onExitEdit,
}: SpeechBubbleProps): React.JSX.Element {
  const [bubble, setBubble] = useState<BubblePixels>(() =>
    initBubble(layer, panelWidth, panelHeight),
  )
  const [tip, setTip] = useState<Point>(() => {
    const b = initBubble(layer, panelWidth, panelHeight)
    return initTip(layer, panelWidth, panelHeight, b)
  })

  // Refs for drag/resize bookkeeping
  const rafRef = useRef<number>(0)
  const tipRafRef = useRef<number>(0)
  const dragStartBubbleRef = useRef<BubblePixels | null>(null)
  const resizeStartBubbleRef = useRef<BubblePixels | null>(null)

  // Re-init local state when canvas dimensions or externally-edited layer fields change.
  // Individual fields are listed (not the whole `layer` object) so that the effect doesn't
  // fire on every render. tip_x/y_percent are omitted — those are only set by this component.
  useEffect(() => {
    const next = initBubble(layer, panelWidth, panelHeight)
    setBubble(next)
    setTip(initTip(layer, panelWidth, panelHeight, next))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- layer object ref changes every render; tracking specific fields instead
  }, [
    panelWidth,
    panelHeight,
    layer.x_percent,
    layer.y_percent,
    layer.width_percent,
    layer.height_percent,
    layer.border_radius,
  ])

  // Cleanup any pending rAFs on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      cancelAnimationFrame(tipRafRef.current)
    }
  }, [])

  // -------------------------------------------------------------------------
  // Bubble drag
  // -------------------------------------------------------------------------
  const handleBubbleDragStart = useCallback(() => {
    dragStartBubbleRef.current = bubble
  }, [bubble])

  const handleBubbleDrag = useCallback((dx: number, dy: number) => {
    const start = dragStartBubbleRef.current
    if (!start) return
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      setBubble((prev) => ({ ...prev, x: start.x + dx, y: start.y + dy }))
    })
  }, [])

  const handleBubbleDragEnd = useCallback(
    (dx: number, dy: number) => {
      const start = dragStartBubbleRef.current
      dragStartBubbleRef.current = null
      cancelAnimationFrame(rafRef.current)
      if (!start) return
      const newX = start.x + dx
      const newY = start.y + dy
      setBubble((prev) => ({ ...prev, x: newX, y: newY }))
      if (panelWidth > 0 && panelHeight > 0) {
        onUpdate({
          x_percent: (newX / panelWidth) * 100,
          y_percent: (newY / panelHeight) * 100,
        })
      }
    },
    [onUpdate, panelWidth, panelHeight],
  )

  // -------------------------------------------------------------------------
  // Resize
  // -------------------------------------------------------------------------
  const handleResizeStart = useCallback(
    (_handle: ResizeHandle) => {
      resizeStartBubbleRef.current = bubble
    },
    [bubble],
  )

  const handleResize = useCallback((handle: ResizeHandle, dx: number, dy: number) => {
    const start = resizeStartBubbleRef.current
    if (!start) return
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      setBubble(applyResize(handle, start, dx, dy))
    })
  }, [])

  const handleResizeEnd = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    resizeStartBubbleRef.current = null
    if (panelWidth <= 0 || panelHeight <= 0) return
    // Use the latest bubble state via setBubble's functional updater so we
    // emit the truly final dimensions.
    setBubble((prev) => {
      onUpdate({
        x_percent: (prev.x / panelWidth) * 100,
        y_percent: (prev.y / panelHeight) * 100,
        width_percent: (prev.width / panelWidth) * 100,
        height_percent: (prev.height / panelHeight) * 100,
      })
      return prev
    })
  }, [onUpdate, panelWidth, panelHeight])

  // -------------------------------------------------------------------------
  // Tip drag
  // -------------------------------------------------------------------------
  const handleTipDragStart = useCallback(() => {
    // No-op: TipHandle reports absolute coords on each move
  }, [])

  const handleTipDrag = useCallback((x: number, y: number) => {
    cancelAnimationFrame(tipRafRef.current)
    tipRafRef.current = requestAnimationFrame(() => {
      setTip({ x, y })
    })
  }, [])

  const handleTipDragEnd = useCallback(
    (x: number, y: number) => {
      cancelAnimationFrame(tipRafRef.current)
      setTip({ x, y })
      if (panelWidth > 0 && panelHeight > 0) {
        onUpdate({
          tip_x_percent: (x / panelWidth) * 100,
          tip_y_percent: (y / panelHeight) * 100,
        })
      }
    },
    [onUpdate, panelWidth, panelHeight],
  )

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------
  const bubbleState = toBubbleState(bubble)
  const { base, tangent } = computeBasePoint(tip, bubbleState)
  const tipInsideBubble =
    tip.x >= bubble.x &&
    tip.x <= bubble.x + bubble.width &&
    tip.y >= bubble.y &&
    tip.y <= bubble.y + bubble.height

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'visible',
      }}
      width={panelWidth}
      height={panelHeight}
    >
      {layer.has_tail && (
        <BubbleTail
          base={base}
          tangent={tangent}
          tip={tip}
          halfWidth={HALF_WIDTH}
          curvature={CURVATURE}
          fill={layer.background_color ?? '#ffffff'}
          tipInsideBubble={tipInsideBubble}
          isActive={isActive}
          panelWidth={panelWidth}
          panelHeight={panelHeight}
          onSelect={onSelect}
          onTipDragStart={handleTipDragStart}
          onTipDrag={handleTipDrag}
          onTipDragEnd={handleTipDragEnd}
        />
      )}
      <BubbleBody
        bubble={bubbleState}
        fill={layer.background_color ?? '#ffffff'}
        stroke="#DC5A8A"
        isActive={isActive}
        isEditingText={isEditingText}
        textContent={layer.text_content ?? ''}
        fontFamily={layer.font_family ?? 'DM Sans'}
        fontSize={layer.font_size ?? 22}
        textColor={layer.text_color ?? '#1A1A1A'}
        fontWeight={layer.font_weight ?? '400'}
        textAlign={layer.text_align ?? 'center'}
        lineHeight={layer.line_height ?? 1.4}
        letterSpacing={layer.letter_spacing ?? 0}
        onSelect={onSelect}
        onDragStart={handleBubbleDragStart}
        onDrag={handleBubbleDrag}
        onDragEnd={handleBubbleDragEnd}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
        onDoubleClick={onDoubleClick}
        onTextChange={(value) => onUpdate({ text_content: value })}
        onExitEdit={onExitEdit}
      />
      {isActive && layer.has_tail && (
        <TipHandle
          tip={tip}
          panelWidth={panelWidth}
          panelHeight={panelHeight}
          onDragStart={handleTipDragStart}
          onDrag={handleTipDrag}
          onDragEnd={handleTipDragEnd}
        />
      )}
    </svg>
  )
}

export default SpeechBubble
