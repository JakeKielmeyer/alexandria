import { useCallback, useEffect, useRef, useState } from 'react'

export function useIdleHide(delayMs = 3000): { visible: boolean } {
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => {
    setVisible(true)
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), delayMs)
  }, [delayMs])

  useEffect(() => {
    show()
    const events = ['mousemove', 'touchstart', 'keydown', 'click'] as const
    events.forEach(ev => window.addEventListener(ev, show, { passive: true }))
    return () => {
      events.forEach(ev => window.removeEventListener(ev, show))
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [show])

  return { visible }
}
