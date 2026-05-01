// src/components/reader/PanelScrollItem.tsx
//
// Scroll-driven 3D panel wrapper.
//
// In CINEMATIC mode:
//   Each card rotates, scales, and fades based on its slot's position within
//   the viewport (window scroll). The pivot switches between top and bottom so
//   the card feels like a physical page turning away or into view. The outer
//   slot is 95vh; the panel height is fixed by the reading mode.
//
// In SCROLL mode:
//   No 3D transforms — just a plain block that stacks vertically. Height is
//   set to the per-panel pixel value from the creator. onActivate still fires
//   when the panel's center crosses the viewport midpoint.
//
// Scroll source: WINDOW. No `container` arg to useScroll, which is the most
// reliable path for framer-motion scroll-linked transforms and plays nicely
// with scroll-snap on document.documentElement.

import React, { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion, useMotionValueEvent } from 'framer-motion'

interface PanelScrollItemProps {
  /** 'cinematic' enables scroll-driven transforms + snap. 'scroll' is plain continuous block. */
  mode: 'cinematic' | 'scroll'
  /**
   * Which cinematic animation to use. Ignored in scroll mode.
   * 'stacked' = 3D rotateX/scale card. 'fade' = opacity only.
   */
  transitionStyle?: 'stacked' | 'fade'
  /** Per-panel height in pixels. Retained for future use; scroll mode now uses 95vh. */
  heightPx?: number
  /** Called when this panel's center crosses the viewport center. */
  onActivate?: () => void
  /** DOM id attached to the outer slot so the parent can scroll to it. */
  id?: string
  /** Extra class names for the outer slot (optional). */
  slotClassName?: string
  /** Extra class names for the inner motion card (optional). */
  cardClassName?: string
  /**
   * Optional one-shot entrance animation variant. `'first'` runs a
   * dramatic scale + rotate + rise when the panel mounts — used on
   * panel 0 when the reader enters the story from the Cover.
   * Only applied in cinematic mode.
   */
  introVariant?: 'first'
  children: React.ReactNode
}

// ── Scroll mode (plain block, no 3D) ──────────────────────────────────────

function ScrollPanelItem({
  onActivate, id, slotClassName, cardClassName, children,
}: Omit<PanelScrollItemProps, 'mode' | 'introVariant'>): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  // Fire onActivate when the panel center crosses the viewport midpoint.
  useEffect(() => {
    const el = ref.current
    if (!el || !onActivate) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onActivate()
        }
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [onActivate])

  return (
    <div
      ref={ref}
      id={id}
      className={`reader-panel-slot reader-panel-slot--scroll${slotClassName ? ' ' + slotClassName : ''}`}
    >
      <div className={`reader-panel-card${cardClassName ? ' ' + cardClassName : ''}`}>
        {children}
      </div>
    </div>
  )
}

// ── Cinematic mode — Fade (opacity only, no 3D) ───────────────────────────

function FadePanelItem({
  onActivate, id, slotClassName, cardClassName, introVariant, children,
}: Omit<PanelScrollItemProps, 'mode' | 'heightPx' | 'transitionStyle'>): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center', 'end start'],
  })

  // Opacity only — near-triangle curve. Fades drive almost the entire scroll
  // (~45% on each side) with only a 10% peak hold at centre, so the fade is
  // continuously visible as the reader moves through a panel.
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.45, 0.5, 0.55, 1],
    reduce ? [1, 1, 1, 1, 1] : [0, 1, 1, 1, 0],
  )

  // Same onActivate logic as CinematicPanelItem
  const wasActive = useRef(false)
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const active = p > 0.45 && p < 0.55
    if (active && !wasActive.current) {
      wasActive.current = true
      onActivate?.()
    } else if (!active && wasActive.current) {
      wasActive.current = false
    }
  })
  useEffect(() => {
    const el = ref.current
    if (!el || !onActivate) return
    const rect = el.getBoundingClientRect()
    const vhMid = window.innerHeight / 2
    if (rect.top < vhMid && rect.bottom > vhMid) {
      onActivate()
      wasActive.current = true
    }
  }, [onActivate])

  const slotClass = `reader-panel-slot reader-panel-slot--snap${slotClassName ? ' ' + slotClassName : ''}`
  const cardClass = `reader-panel-card${cardClassName ? ' ' + cardClassName : ''}`

  // First-panel intro: simple opacity fade-in (no 3D scale/rotate)
  const showIntro = introVariant === 'first'
  const content = showIntro ? (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } }}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  ) : children

  return (
    <div ref={ref} id={id} className={slotClass}>
      <motion.div className={cardClass} style={{ opacity }}>
        {content}
      </motion.div>
    </div>
  )
}

// ── Cinematic mode (scroll-driven 3D) ─────────────────────────────────────

function CinematicPanelItem({
  onActivate, id, slotClassName, cardClassName, introVariant, children,
}: Omit<PanelScrollItemProps, 'mode' | 'heightPx'>): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center', 'end start'],
  })

  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], reduce ? [0, 0, 0] : [-30, 0, 40])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], reduce ? [1, 1, 1] : [0.88, 1, 0.84])
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.45, 1, 0.25])
  const transformOrigin = useTransform(scrollYProgress, (p) =>
    p < 0.5 ? 'center top' : 'center bottom'
  )
  const shadowOpacity = useTransform(scrollYProgress, [0, 0.45, 0.55, 1], [0, 0.95, 0.95, 0])
  const boxShadow = useTransform(shadowOpacity, (o) =>
    reduce ? 'none' : `0 -20px 44px rgba(0,0,0,${o.toFixed(3)})`
  )

  const wasActive = useRef(false)
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const active = p > 0.45 && p < 0.55
    if (active && !wasActive.current) {
      wasActive.current = true
      onActivate?.()
    } else if (!active && wasActive.current) {
      wasActive.current = false
    }
  })

  useEffect(() => {
    const el = ref.current
    if (!el || !onActivate) return
    const rect = el.getBoundingClientRect()
    const vhMid = window.innerHeight / 2
    if (rect.top < vhMid && rect.bottom > vhMid) {
      onActivate()
      wasActive.current = true
    }
  }, [onActivate])

  const slotClass = `reader-panel-slot reader-panel-slot--snap${slotClassName ? ' ' + slotClassName : ''}`
  const cardClass = `reader-panel-card${cardClassName ? ' ' + cardClassName : ''}`

  const showIntro = introVariant === 'first'
  const introInitial = reduce
    ? { opacity: 0 }
    : { scale: 0.55, y: 180, rotateX: -60, opacity: 0 }
  const introAnimate = reduce
    ? { opacity: 1, transition: { duration: 0.35 } }
    : {
        scale: 1, y: 0, rotateX: 0, opacity: 1,
        transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const, delay: 0.1 },
      }

  const content = showIntro ? (
    <motion.div
      initial={introInitial}
      animate={introAnimate}
      style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', transformOrigin: 'center bottom' }}
    >
      {children}
    </motion.div>
  ) : children

  return (
    <div ref={ref} id={id} className={slotClass}>
      <motion.div
        className={cardClass}
        style={{ rotateX, scale, opacity, transformOrigin, boxShadow }}
      >
        {content}
      </motion.div>
    </div>
  )
}

// ── Public component ───────────────────────────────────────────────────────

export default function PanelScrollItem(props: PanelScrollItemProps): React.JSX.Element {
  if (props.mode === 'scroll') {
    return (
      <ScrollPanelItem
        onActivate={props.onActivate}
        id={props.id}
        slotClassName={props.slotClassName}
        cardClassName={props.cardClassName}
      >
        {props.children}
      </ScrollPanelItem>
    )
  }

  if (props.transitionStyle === 'fade') {
    return (
      <FadePanelItem
        onActivate={props.onActivate}
        id={props.id}
        slotClassName={props.slotClassName}
        cardClassName={props.cardClassName}
        introVariant={props.introVariant}
      >
        {props.children}
      </FadePanelItem>
    )
  }

  return (
    <CinematicPanelItem
      onActivate={props.onActivate}
      id={props.id}
      slotClassName={props.slotClassName}
      cardClassName={props.cardClassName}
      introVariant={props.introVariant}
    >
      {props.children}
    </CinematicPanelItem>
  )
}
