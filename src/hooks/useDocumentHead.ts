import { useEffect } from 'react'

export interface DocumentHeadMeta {
  title: string
  description?: string | null
  image?: string | null
  url?: string | null
  type?: 'website' | 'article'
}

/** Ensure a given <meta> tag exists with the requested key/value, then return a
 *  cleanup function that removes it only if we created it. */
function setMeta(attr: 'name' | 'property', key: string, value: string | null | undefined): () => void {
  if (!value) return () => {}
  const selector = `meta[${attr}="${key}"]`
  const existing = document.head.querySelector<HTMLMetaElement>(selector)
  if (existing) {
    const previous = existing.content
    existing.content = value
    return () => { existing.content = previous }
  }
  const el = document.createElement('meta')
  el.setAttribute(attr, key)
  el.content = value
  document.head.appendChild(el)
  return () => { el.remove() }
}

/**
 * Imperative document-head manager for the client-rendered SPA. Bots that do
 * not execute JS (Discord, Slack, older Twitter) will not see these — serving
 * real crawler previews requires a Cloudflare Pages Function that rewrites
 * HTML, tracked as a post-beta item.
 */
export function useDocumentHead({ title, description, image, url, type = 'website' }: DocumentHeadMeta): void {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title

    const cleanups: Array<() => void> = [
      setMeta('name', 'description', description ?? undefined),
      setMeta('property', 'og:title', title),
      setMeta('property', 'og:description', description ?? undefined),
      setMeta('property', 'og:image', image ?? undefined),
      setMeta('property', 'og:url', url ?? undefined),
      setMeta('property', 'og:type', type),
      setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary'),
      setMeta('name', 'twitter:title', title),
      setMeta('name', 'twitter:description', description ?? undefined),
      setMeta('name', 'twitter:image', image ?? undefined),
    ]

    return () => {
      document.title = previousTitle
      for (const cleanup of cleanups) cleanup()
    }
  }, [title, description, image, url, type])
}
