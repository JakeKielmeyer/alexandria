import React, { useCallback, useRef, useEffect } from 'react'
import type { BubbleState } from './types'

export type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br'

interface BubbleBodyProps {
  bubble: BubbleState
  fill: string
  stroke: string
  isActive: boolean
  isEditingText: boolean
  textContent: string
  fontFamily: string
  fontSize: number
  textColor: string
  fontWeight: string
  textAlign: string
  lineHeight: number
  letterSpacing: number
  onSelect: () => void
  onDragStart: () => void
  onDrag: (dx: number, dy: number) => void
  onDragEnd: (dx: number, dy: number) => void
  onResizeStart: (handle: ResizeHandle) => void
  onResize: (handle: ResizeHandle, dx: number, dy: number) => void
  onResizeEnd: () => void
  onDoubleClick: () => void
  onTextChange: (value: string) => void
  onExitEdit: () => void
}

type DragRef = { startX: number; startY: number; pointerId: number } | null

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  tl: 'nwse-resize',
  br: 'nwse-resize',
  tr: 'nesw-resize',
  bl: 'nesw-resize',
}

export function BubbleBody({
  bubble,
  fill,
  stroke,
  isActive,
  isEditingText,
  textContent,
  fontFamily,
  fontSize,
  textColor,
  fontWeight,
  textAlign,
  lineHeight,
  letterSpacing,
  onSelect,
  onDragStart,
  onDrag,
  onDragEnd,
  onResizeStart,
  onResize,
  onResizeEnd,
  onDoubleClick,
  onTextChange,
  onExitEdit,
}: BubbleBodyProps): React.JSX.Element {
  const dragRef = useRef<DragRef>(null)
  const resizeRef = useRef<{ startX: number; startY: number; pointerId: number; handle: ResizeHandle } | null>(null)
  const isDragging = dragRef.current !== null

  // Drag pointer move / up handlers on window
  const handleWindowPointerMove = useCallback(
    (e: PointerEvent) => {
      if (dragRef.current !== null && e.pointerId === dragRef.current.pointerId) {
        const dx = e.clientX - dragRef.current.startX
        const dy = e.clientY - dragRef.current.startY
        onDrag(dx, dy)
      }
      if (resizeRef.current !== null && e.pointerId === resizeRef.current.pointerId) {
        const dx = e.clientX - resizeRef.current.startX
        const dy = e.clientY - resizeRef.current.startY
        onResize(resizeRef.current.handle, dx, dy)
      }
    },
    [onDrag, onResize],
  )

  const handleWindowPointerUp = useCallback(
    (e: PointerEvent) => {
      if (dragRef.current !== null && e.pointerId === dragRef.current.pointerId) {
        const dx = e.clientX - dragRef.current.startX
        const dy = e.clientY - dragRef.current.startY
        dragRef.current = null
        onDragEnd(dx, dy)
      }
      if (resizeRef.current !== null && e.pointerId === resizeRef.current.pointerId) {
        resizeRef.current = null
        onResizeEnd()
      }
    },
    [onDragEnd, onResizeEnd],
  )

  useEffect(() => {
    window.addEventListener('pointermove', handleWindowPointerMove)
    window.addEventListener('pointerup', handleWindowPointerUp)
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', handleWindowPointerUp)
    }
  }, [handleWindowPointerMove, handleWindowPointerUp])

  // Rect pointer down: select when inactive, start drag when active
  const handleRectPointerDown = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      if (!isActive) {
        e.stopPropagation()
        onSelect()
        return
      }
      // Don't start drag if a resize is in progress
      if (resizeRef.current !== null) return
      e.stopPropagation()
      ;(e.currentTarget as SVGRectElement).setPointerCapture(e.pointerId)
      dragRef.current = { startX: e.clientX, startY: e.clientY, pointerId: e.pointerId }
      onDragStart()
    },
    [isActive, onSelect, onDragStart],
  )

  // Resize handle pointer down factory
  const handleResizePointerDown = useCallback(
    (handle: ResizeHandle) =>
      (e: React.PointerEvent<SVGCircleElement>) => {
        // Don't start resize if a drag is in progress
        if (dragRef.current !== null) return
        e.stopPropagation()
        ;(e.currentTarget as SVGCircleElement).setPointerCapture(e.pointerId)
        resizeRef.current = { startX: e.clientX, startY: e.clientY, pointerId: e.pointerId, handle }
        onResizeStart(handle)
      },
    [onResizeStart],
  )

  const handleCorners: Array<{ handle: ResizeHandle; cx: number; cy: number }> = [
    { handle: 'tl', cx: bubble.x, cy: bubble.y },
    { handle: 'tr', cx: bubble.x + bubble.width, cy: bubble.y },
    { handle: 'bl', cx: bubble.x, cy: bubble.y + bubble.height },
    { handle: 'br', cx: bubble.x + bubble.width, cy: bubble.y + bubble.height },
  ]

  return (
    <g>
      <rect
        x={bubble.x}
        y={bubble.y}
        width={bubble.width}
        height={bubble.height}
        rx={bubble.rx}
        ry={bubble.ry}
        fill={fill}
        stroke={isActive ? stroke : 'none'}
        strokeWidth={1.5}
        style={{ cursor: isActive ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        onPointerDown={handleRectPointerDown}
        onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
        onDoubleClick={onDoubleClick}
      />

      <foreignObject
        x={bubble.x}
        y={bubble.y}
        width={bubble.width}
        height={bubble.height}
        pointerEvents={isEditingText ? 'auto' : 'none'}
      >
        {isEditingText ? (
          <textarea
            xmlns="http://www.w3.org/1999/xhtml"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={textContent}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') onExitEdit() }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: '100%',
              padding: '8px 12px',
              boxSizing: 'border-box' as React.CSSProperties['boxSizing'],
              fontFamily,
              fontSize,
              color: textColor,
              fontWeight,
              textAlign: textAlign as React.CSSProperties['textAlign'],
              lineHeight,
              letterSpacing,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              cursor: 'text',
            }}
          />
        ) : (
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              width: '100%',
              height: '100%',
              padding: '8px 12px',
              boxSizing: 'border-box',
              fontFamily,
              fontSize,
              color: textColor,
              fontWeight,
              textAlign: textAlign as React.CSSProperties['textAlign'],
              lineHeight,
              letterSpacing,
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            {textContent || <span style={{ opacity: 0.35 }}>Double-click to edit</span>}
          </div>
        )}
      </foreignObject>

      {isActive &&
        handleCorners.map(({ handle, cx, cy }) => (
          <circle
            key={handle}
            cx={cx}
            cy={cy}
            r={5}
            fill="#DC5A8A"
            style={{ cursor: HANDLE_CURSORS[handle] }}
            onPointerDown={handleResizePointerDown(handle)}
          />
        ))}
    </g>
  )
}
