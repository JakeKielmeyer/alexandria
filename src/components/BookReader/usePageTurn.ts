import { useState, useCallback, useRef } from 'react'

export interface PageTurnState {
  spreadIndex: number
  totalSpreads: number
  goNext: () => void
  goPrev: () => void
}

export function usePageTurn(totalSpreads: number, onEnd: () => void): PageTurnState {
  const [spreadIndex, setSpreadIndex] = useState(0)
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const goNext = useCallback(() => {
    setSpreadIndex(prev => {
      if (prev >= totalSpreads) {
        // Schedule outside the updater to avoid side-effect-in-reducer warnings
        Promise.resolve().then(() => onEndRef.current())
        return prev
      }
      return prev + 1
    })
  }, [totalSpreads])

  const goPrev = useCallback(() => {
    setSpreadIndex(prev => Math.max(0, prev - 1))
  }, [])

  return { spreadIndex, totalSpreads, goNext, goPrev }
}
