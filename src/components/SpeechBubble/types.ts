import type { BubbleState, Point } from './geometry'

export type { BubbleState, Point }

export interface TailState {
  tip: Point
  basePoint: Point
  halfWidth: number
  curvature: number
}

export interface AppState {
  bubble: BubbleState
  tail: TailState
  isDraggingBubble: boolean
  isDraggingTip: boolean
  isResizing: boolean
}
