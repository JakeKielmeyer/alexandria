// src/lib/fonts.ts
//
// Curated Google Fonts for text layers, selected for the dark romance /
// horror / grimdark aesthetic. loadFont() injects a <link> tag on first
// call so fonts render immediately in the editor and reader.

export interface GoogleFont {
  label: string
  family: string   // URL-encoded family name for the Google Fonts API
  weights: string  // Semicolon-separated weight list
}

export const GOOGLE_FONTS: GoogleFont[] = [
  // Literary serif
  { label: 'Playfair Display',   family: 'Playfair+Display',   weights: '400;700' },
  { label: 'EB Garamond',        family: 'EB+Garamond',        weights: '400;700' },
  { label: 'Cormorant Garamond', family: 'Cormorant+Garamond', weights: '400;700' },
  { label: 'Crimson Text',       family: 'Crimson+Text',       weights: '400;700' },
  { label: 'Lora',               family: 'Lora',               weights: '400;700' },
  { label: 'Merriweather',       family: 'Merriweather',       weights: '400;700' },
  { label: 'Libre Baskerville',  family: 'Libre+Baskerville',  weights: '400;700' },
  { label: 'GFS Didot',          family: 'GFS+Didot',          weights: '400' },
  // Gothic / display
  { label: 'Cinzel',             family: 'Cinzel',             weights: '400;700' },
  { label: 'Cinzel Decorative',  family: 'Cinzel+Decorative',  weights: '400;700' },
  { label: 'UnifrakturMaguntia', family: 'UnifrakturMaguntia', weights: '400' },
  // Modern sans
  { label: 'DM Sans',            family: 'DM+Sans',            weights: '400;700' },
  { label: 'DM Serif Display',   family: 'DM+Serif+Display',   weights: '400' },
  { label: 'Raleway',            family: 'Raleway',            weights: '400;700' },
  { label: 'Montserrat',         family: 'Montserrat',         weights: '400;700' },
  { label: 'Oswald',             family: 'Oswald',             weights: '400;700' },
  // Script / elegant
  { label: 'Great Vibes',        family: 'Great+Vibes',        weights: '400' },
  { label: 'Tangerine',          family: 'Tangerine',          weights: '400;700' },
  { label: 'Alex Brush',         family: 'Alex+Brush',         weights: '400' },
  { label: 'Pinyon Script',      family: 'Pinyon+Script',      weights: '400' },
  // Atmosphere / rough
  { label: 'Special Elite',      family: 'Special+Elite',      weights: '400' },
  { label: 'Creepster',          family: 'Creepster',          weights: '400' },
  { label: 'Nosifer',            family: 'Nosifer',            weights: '400' },
  { label: 'Abril Fatface',      family: 'Abril+Fatface',      weights: '400' },
]

/**
 * Inject a Google Fonts stylesheet for the given font label. No-ops if the
 * font has already been loaded or is not in the curated list.
 */
export function loadFont(label: string): void {
  const entry = GOOGLE_FONTS.find((f) => f.label === label)
  if (!entry) return
  const id = `gf-${entry.family}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${entry.family}:wght@${entry.weights}&display=swap`
  document.head.appendChild(link)
}

/**
 * Load all fonts listed in a story's font_manifest. Called in the reader on
 * story mount so text layers render with the correct typeface.
 */
export function loadFontManifest(manifest: string[]): void {
  for (const label of manifest) {
    loadFont(label)
  }
}
