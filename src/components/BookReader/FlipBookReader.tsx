import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
} from 'react'
// react-pageflip ships partial TS types; the ref is typed `any` in its own declarations.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import HTMLFlipBook from 'react-pageflip'
import FlipPage from './FlipPage'
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
//   [N + 1]      Back cover   (hard)
//
// totalPages = panels.length + 2
// interior panel index = pageIndex - 1  (when pageIndex is between 1 and N)

const FlipBookReader = forwardRef<FlipBookHandle, FlipBookReaderProps>(
  function FlipBookReader(
    {
      story,
      panels,
      isPortrait,
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

    useImperativeHandle(handle, () => ({
      flipNext: () => bookRef.current?.pageFlip?.()?.flipNext?.(),
      flipPrev: () => bookRef.current?.pageFlip?.()?.flipPrev?.(),
      goToPage: (n: number) => bookRef.current?.pageFlip?.()?.flip?.(n),
      getCurrentPageIndex: () => bookRef.current?.pageFlip?.()?.getCurrentPageIndex?.() ?? 0,
    }))

    // pageStyle lives on the story in M2+. Default to 'hardback' until that column lands.
    const pageStyle = ((story as any).page_style as 'paper' | 'hardback' | undefined) ?? 'hardback'
    const backCoverUrl: string | null = story.back_cover_url ?? null

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
      () => panels.map((p, i) => {
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
      }),
      [panels]
    )

    const totalPages = panels.length + 2

    const handleFlip = (e: { data: number }) => {
      onPageFlipped(e.data, totalPages)
    }

    const handleStateChange = (e: { data: PageState }) => {
      onStateChange(e.data)
    }

    const pageWidth  = isPortrait ? 400                   : BOOK_PAGE_WIDTH
    const pageHeight = isPortrait ? CINEMATIC_PANEL_HEIGHT : BOOK_PAGE_HEIGHT
    const pageMaxW   = isPortrait ? 640                   : BOOK_PAGE_WIDTH
    const pageMaxH   = isPortrait ? CINEMATIC_PANEL_HEIGHT : BOOK_PAGE_HEIGHT

    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <HTMLFlipBook
          ref={bookRef}
          width={pageWidth}
          height={pageHeight}
          size="stretch"
          minWidth={280}
          maxWidth={pageMaxW}
          minHeight={360}
          maxHeight={pageMaxH}
          startPage={0}
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
          {/* Page 0 — front cover */}
          <FlipPage
            {...pageProps}
            isCover
            coverUrl={story.cover_url}
            isFreezing={isFlipping}
          />

          {/* Pages 1..N — interior (one per panel) */}
          {/* Even index (0,2,...) = left page of spread; odd (1,3,...) = right page */}
          {interiorPages.map((p, i) => (
            <FlipPage
              key={p.id}
              {...pageProps}
              layers={p.layers}
              isFreezing={isFlipping}
              spreadSide={i % 2 === 0 ? 'left' : 'right'}
            />
          ))}

          {/* Page N+1 — back cover */}
          <FlipPage
            {...pageProps}
            isBack
            coverUrl={backCoverUrl}
            isFreezing={isFlipping}
          />
        </HTMLFlipBook>
      </div>
    )
  }
)

FlipBookReader.displayName = 'FlipBookReader'

export default FlipBookReader
