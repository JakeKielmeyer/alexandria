import { useState, useCallback, useRef } from 'react'

export interface PageTurnState {
  spreadIndex: number
  totalSpreads: number
  goNext: () => void
  goPrev: () => void
}

export function usePageTurn(totalSpreads: number, onEnd: () => void, startAt = 1): PageTurnState {
  const [spreadIndex, setSpreadIndex] = useState(startAt)
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const goNext = useCallback(() => {
    setSpreadIndex(prev => {
      if (prev >= totalSpreads) {
        Promise.resolve().then(() => onEndRef.current())
        return prev
      }
      return prev + 1
    })
  }, [totalSpreads])

  const goPrev = useCallback(() => {
    setSpreadIndex(prev => Math.max(startAt, prev - 1))
  }, [startAt])

  return { spreadIndex, totalSpreads, goNext, goPrev }
}
