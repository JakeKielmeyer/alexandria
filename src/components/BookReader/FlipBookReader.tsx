import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
  useState,
  useEffect,
} from 'react'
// react-pageflip ships partial TS types; the ref is typed `any` in its own declarations.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import HTMLFlipBook from 'react-pageflip'
import FlipPage from './FlipPage'
import SpreadVideoOverlayLayer from './SpreadVideoOverlayLayer'
import { BOOK_PAGE_WIDTH, BOOK_PAGE_HEIGHT, CINEMATIC_PANEL_HEIGHT } from '../../types'
import type { PanelWithMeta } from '../../hooks/useReaderData'
import type { StoryWithCreator, Layer } from '../../types'

type PageState = 'user_fold' | 'fold_corner' | 'flipping' | 'read'

export interface FlipBookHandle {
  flipNext: () => void
  flipPrev: () => void
  goToPage: (index: number) => void
  getCurrentPageIndex: () => number
}

interface FlipBookReaderProps {
  story: StoryWithCreator
  panels: PanelWithMeta[]
  isPortrait: boolean
  containerH: number
  isFlipping: boolean
  videoSfxEnabled: boolean
  musicEnabled: boolean
  videoVolume: number
  onPageFlipped: (pageIndex: number, totalPages: number) => void
  onStateChange: (state: PageState) => void
}

// Page sequence layout:
//   [0]          Front cover  (hard)
//   [1 .. N]     Interior pages, one per panel
//   [N + 1]      Blank back cover (hard) — no content; exists so StPageFlip has a hard
//                cover anchor. Flipping to it immediately triggers onReachEnd() → EndPage.
//
// totalPages = panels.length + 2
// interior panel index = pageIndex - 1  (when pageIndex is between 1 and N)

const FlipBookReader = forwardRef<FlipBookHandle, FlipBookReaderProps>(
  function FlipBookReader(
    {
      story,
      panels,
      isPortrait,
      containerH,
      isFlipping,
      videoSfxEnabled,
      musicEnabled,
      videoVolume,
      onPageFlipped,
      onStateChange,
    },
    handle
  ) {
    const bookRef = useRef<any>(null)
    const outerRef = useRef<HTMLDivElement>(null)

    const isRTL = story.reading_direction === 'rtl'

    const [containerW, setContainerW] = useState(0)

    // Track the outer container's width so we can size the spread overlay.
    // IMPORTANT: do NOT call setContainerW synchronously inside the effect
    // body — doing so batches this state update with react-pageflip's internal
    // setPages call in the same React 18 flush. That combined re-render causes
    // react-pageflip's init effect to run before its childRef is populated,
    // permanently skipping page initialization and breaking all flips.
    // The ResizeObserver callback fires asynchronously (after all layout and
    // paint effects), safely after react-pageflip has fully initialized.
    useEffect(() => {
      const el = outerRef.current
      if (!el) return
      const ro = new ResizeObserver(([entry]) => setContainerW(entry.contentRect.width))
      ro.observe(el)
      return () => ro.disconnect()
    }, [])

    useImperativeHandle(handle, () => ({
      flipNext: () => isRTL
        ? bookRef.current?.pageFlip?.()?.flipPrev?.()
        : bookRef.current?.pageFlip?.()?.flipNext?.(),
      flipPrev: () => isRTL
        ? bookRef.current?.pageFlip?.()?.flipNext?.()
        : bookRef.current?.pageFlip?.()?.flipPrev?.(),
      goToPage: (n: number) => bookRef.current?.pageFlip?.()?.flip?.(n),
      getCurrentPageIndex: () => bookRef.current?.pageFlip?.()?.getCurrentPageIndex?.() ?? 0,
    }), [isRTL])

    // pageStyle lives on the story in M2+. Default to 'hardback' until that column lands.
    const pageStyle = ((story as any).page_style as 'paper' | 'hardback' | undefined) ?? 'hardback'

    // Stable common props for all interior pages — avoids FlipPage re-renders
    // when unrelated parent state changes (e.g. isFlipping toggling rapidly).
    const pageProps = useMemo(() => ({
      pageStyle,
      videoSfxEnabled,
      musicEnabled,
      videoVolume,
      isMobile: isPortrait,
    }), [pageStyle, videoSfxEnabled, musicEnabled, videoVolume, isPortrait])

    // For each page, merge spread layers from its spread-pair so both pages
    // of a spread always render the same is_spread_layer content.
    // Spread pairs: even i ↔ i+1, odd i ↔ i-1.
    const interiorPages = useMemo<{ id: string; layers: Layer[] }[]>(
      () => {
        const ordered = panels.map((p, i) => {
          const pairIndex = i % 2 === 0 ? i + 1 : i - 1
          const pairSpreadLayers = (panels[pairIndex]?.layers ?? [])
            .filter((l: Layer) => l.is_spread_layer)
          const ownSpreadIds = new Set(
            p.layers.filter((l: Layer) => l.is_spread_layer).map((l: Layer) => l.id)
          )
          return {
            id: p.panelId,
            layers: [
              ...p.layers,
              ...pairSpreadLayers.filter((l: Layer) => !ownSpreadIds.has(l.id)),
            ],
          }
        })
        // RTL: reverse so navigating toward lower DOM indices reads panels in story order
        return isRTL ? [...ordered].reverse() : ordered
      },
      [panels, isRTL]
    )

    const totalPages = panels.length + 2
    const [currentPageIndex, setCurrentPageIndex] = useState(isRTL ? totalPages - 1 : 0)

    // Spread video layers for the currently visible spread, deduplicated.
    // interiorPages is 0-based; StPageFlip reports the left page index via onFlip.
    const currentSpreadVideoLayers = useMemo(() => {
      if (isPortrait) return []
      if (currentPageIndex === 0 || currentPageIndex >= totalPages - 1) return []
      const interiorIdx = currentPageIndex - 1
      const spreadIdx = Math.floor(interiorIdx / 2)
      const left = interiorPages[spreadIdx * 2]
      const right = interiorPages[spreadIdx * 2 + 1]
      const seen = new Set<string>()
      return [...(left?.layers ?? []), ...(right?.layers ?? [])].filter((l: Layer) => {
        if (!l.is_spread_layer || l.media_type !== 'video' || !l.media_url) return false
        if (seen.has(l.id)) return false
        seen.add(l.id)
        return true
      })
    }, [currentPageIndex, totalPages, interiorPages, isPortrait])

    const handleFlip = (e: { data: number }) => {
      setCurrentPageIndex(e.data)
      onPageFlipped(e.data, totalPages)
    }

    const handleStateChange = (e: { data: PageState }) => {
      onStateChange(e.data)
    }

    const marginY    = 20
    const pageWidth  = isPortrait ? 400                   : BOOK_PAGE_WIDTH
    const pageHeight = isPortrait ? CINEMATIC_PANEL_HEIGHT : BOOK_PAGE_HEIGHT
    const pageMaxW   = isPortrait ? 640
                                  : Math.min(Math.floor((containerH - marginY * 2) * BOOK_PAGE_WIDTH / BOOK_PAGE_HEIGHT), BOOK_PAGE_WIDTH)
    const pageMaxH   = isPortrait ? CINEMATIC_PANEL_HEIGHT : Math.min(containerH - marginY * 2, BOOK_PAGE_HEIGHT)
    // Spread overlay width = actual book width (container width capped at two pages).
    const spreadW    = Math.min(containerW > 0 ? containerW : pageMaxW * 2, pageMaxW * 2)

    return (
      <div
        ref={outerRef}
        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                 position: 'relative', transform: isRTL ? 'scaleX(-1)' : undefined }}
      >
        <HTMLFlipBook
          ref={bookRef}
          width={pageWidth}
          height={pageHeight}
          size="stretch"
          minWidth={280}
          maxWidth={pageMaxW}
          minHeight={360}
          maxHeight={pageMaxH}
          startPage={isRTL ? totalPages - 1 : 0}
          drawShadow={true}
          flippingTime={700}
          usePortrait={isPortrait}
          startZIndex={0}
          autoSize={true}
          maxShadowOpacity={0.6}
          showCover={true}
          mobileScrollSupport={false}
          clickEventForward={true}
          useMouseEvents={!isPortrait}
          swipeDistance={isPortrait ? 9999 : 50}
          showPageCorners={!isPortrait}
          disableFlipByClick={false}
          renderOnlyPageLengthChange={true}
          className=""
          style={{}}
          onFlip={handleFlip}
          onChangeState={handleStateChange}
        >
          {/* Page 0 — front cover (RTL: rendered last in DOM, shown first via startPage=totalPages-1) */}
          <FlipPage
            {...pageProps}
            isCover
            isRTL={isRTL}
            coverUrl={story.cover_url}
            isFreezing={isFlipping}
          />

          {/* Pages 1..N — interior (one per panel, reversed for RTL) */}
          {interiorPages.map((p, i) => (
            <FlipPage
              key={p.id}
              {...pageProps}
              isRTL={isRTL}
              layers={p.layers}
              isFreezing={isFlipping}
              spreadSide={isPortrait ? undefined : (i % 2 === 0 ? (isRTL ? 'right' : 'left') : (isRTL ? 'left' : 'right'))}
            />
          ))}

          {/* Page N+1 — blank back cover (hard); triggers EndPage on flip */}
          <FlipPage
            {...pageProps}
            isBack
            isRTL={isRTL}
            isFreezing={isFlipping}
          />
        </HTMLFlipBook>

        {/* Single overlay video for the current spread — eliminates frame desync.
            Lives as a sibling to HTMLFlipBook so it is NOT react-pageflip's parent;
            the outer container (height: 100%, stable) stays the parent, preventing
            video metadata loads from destabilising autoSize's ResizeObserver. */}
        {currentSpreadVideoLayers.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: spreadW,
            height: pageMaxH,
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 1,
            visibility: isFlipping ? 'hidden' : undefined,
          }}>
            {currentSpreadVideoLayers.map((layer: Layer) => (
              <SpreadVideoOverlayLayer
                key={layer.id}
                layer={layer}
                videoSfxEnabled={videoSfxEnabled}
                videoVolume={videoVolume}
                isFreezing={isFlipping}
              />
            ))}
          </div>
        )}
      </div>
    )
  }
)

FlipBookReader.displayName = 'FlipBookReader'

export default FlipBookReader
