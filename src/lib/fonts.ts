// src/lib/fonts.ts
//
// Curated Google Fonts for comic book / webtoon creators.
// loadFont() injects a <link> tag on first call so fonts render immediately
// in the editor and reader.

export interface GoogleFont {
  label: string
  family: string   // URL-encoded family name for the Google Fonts CSS2 API
  weights: string  // Semicolon-separated weight list
  category: string // Used for grouping in the font picker dropdown
}

export const GOOGLE_FONTS: GoogleFont[] = [
  // ── Comic / Lettering ────────────────────────────────────────────────────
  { label: 'Bangers',             family: 'Bangers',             weights: '400',     category: 'Comic / Lettering' },
  { label: 'Boogaloo',            family: 'Boogaloo',            weights: '400',     category: 'Comic / Lettering' },
  { label: 'Fredoka One',         family: 'Fredoka+One',         weights: '400',     category: 'Comic / Lettering' },
  { label: 'Russo One',           family: 'Russo+One',           weights: '400',     category: 'Comic / Lettering' },
  { label: 'Anton',               family: 'Anton',               weights: '400',     category: 'Comic / Lettering' },
  { label: 'Permanent Marker',    family: 'Permanent+Marker',    weights: '400',     category: 'Comic / Lettering' },
  { label: 'Kalam',               family: 'Kalam',               weights: '400;700', category: 'Comic / Lettering' },
  { label: 'Patrick Hand',        family: 'Patrick+Hand',        weights: '400',     category: 'Comic / Lettering' },
  { label: 'Gochi Hand',          family: 'Gochi+Hand',          weights: '400',     category: 'Comic / Lettering' },
  { label: 'Amatic SC',           family: 'Amatic+SC',           weights: '400;700', category: 'Comic / Lettering' },
  { label: 'Comic Neue',          family: 'Comic+Neue',          weights: '400;700', category: 'Comic / Lettering' },
  { label: 'Caveat',              family: 'Caveat',              weights: '400;700', category: 'Comic / Lettering' },

  // ── Horror / Occult ──────────────────────────────────────────────────────
  { label: 'Creepster',           family: 'Creepster',           weights: '400',     category: 'Horror / Occult' },
  { label: 'Nosifer',             family: 'Nosifer',             weights: '400',     category: 'Horror / Occult' },
  { label: 'Eater',               family: 'Eater',               weights: '400',     category: 'Horror / Occult' },
  { label: 'Butcherman',          family: 'Butcherman',          weights: '400',     category: 'Horror / Occult' },
  { label: 'Ewert',               family: 'Ewert',               weights: '400',     category: 'Horror / Occult' },
  { label: 'Griffy',              family: 'Griffy',              weights: '400',     category: 'Horror / Occult' },
  { label: 'New Rocker',          family: 'New+Rocker',          weights: '400',     category: 'Horror / Occult' },
  { label: 'Cabin Sketch',        family: 'Cabin+Sketch',        weights: '400;700', category: 'Horror / Occult' },
  { label: 'Henny Penny',         family: 'Henny+Penny',         weights: '400',     category: 'Horror / Occult' },
  { label: 'Metal Mania',         family: 'Metal+Mania',         weights: '400',     category: 'Horror / Occult' },
  { label: 'Jim Nightshade',      family: 'Jim+Nightshade',      weights: '400',     category: 'Horror / Occult' },
  { label: 'Special Elite',       family: 'Special+Elite',       weights: '400',     category: 'Horror / Occult' },

  // ── Fantasy / Medieval ───────────────────────────────────────────────────
  { label: 'Cinzel',              family: 'Cinzel',              weights: '400;700', category: 'Fantasy / Medieval' },
  { label: 'Cinzel Decorative',   family: 'Cinzel+Decorative',   weights: '400;700', category: 'Fantasy / Medieval' },
  { label: 'Uncial Antiqua',      family: 'Uncial+Antiqua',      weights: '400',     category: 'Fantasy / Medieval' },
  { label: 'IM Fell English',     family: 'IM+Fell+English',     weights: '400',     category: 'Fantasy / Medieval' },
  { label: 'Lancelot',            family: 'Lancelot',            weights: '400',     category: 'Fantasy / Medieval' },
  { label: 'Metamorphous',        family: 'Metamorphous',        weights: '400',     category: 'Fantasy / Medieval' },
  { label: 'Caesar Dressing',     family: 'Caesar+Dressing',     weights: '400',     category: 'Fantasy / Medieval' },
  { label: 'Pirata One',          family: 'Pirata+One',          weights: '400',     category: 'Fantasy / Medieval' },
  { label: 'Almendra',            family: 'Almendra',            weights: '400;700', category: 'Fantasy / Medieval' },
  { label: 'Philosopher',         family: 'Philosopher',         weights: '400;700', category: 'Fantasy / Medieval' },
  { label: 'Marcellus',           family: 'Marcellus',           weights: '400',     category: 'Fantasy / Medieval' },
  { label: 'UnifrakturMaguntia',  family: 'UnifrakturMaguntia',  weights: '400',     category: 'Fantasy / Medieval' },

  // ── Gothic / Literary Serif ──────────────────────────────────────────────
  { label: 'Playfair Display',    family: 'Playfair+Display',    weights: '400;700', category: 'Gothic / Serif' },
  { label: 'DM Serif Display',    family: 'DM+Serif+Display',    weights: '400',     category: 'Gothic / Serif' },
  { label: 'Cormorant Garamond',  family: 'Cormorant+Garamond',  weights: '400;700', category: 'Gothic / Serif' },
  { label: 'Cormorant SC',        family: 'Cormorant+SC',        weights: '400;700', category: 'Gothic / Serif' },
  { label: 'Cormorant Infant',    family: 'Cormorant+Infant',    weights: '400;700', category: 'Gothic / Serif' },
  { label: 'EB Garamond',         family: 'EB+Garamond',         weights: '400;700', category: 'Gothic / Serif' },
  { label: 'Crimson Text',        family: 'Crimson+Text',        weights: '400;700', category: 'Gothic / Serif' },
  { label: 'Libre Baskerville',   family: 'Libre+Baskerville',   weights: '400;700', category: 'Gothic / Serif' },
  { label: 'GFS Didot',           family: 'GFS+Didot',           weights: '400',     category: 'Gothic / Serif' },
  { label: 'Spectral',            family: 'Spectral',            weights: '400;700', category: 'Gothic / Serif' },

  // ── Script / Romance ─────────────────────────────────────────────────────
  { label: 'Dancing Script',      family: 'Dancing+Script',      weights: '400;700', category: 'Script / Romance' },
  { label: 'Great Vibes',         family: 'Great+Vibes',         weights: '400',     category: 'Script / Romance' },
  { label: 'Parisienne',          family: 'Parisienne',          weights: '400',     category: 'Script / Romance' },
  { label: 'Sacramento',          family: 'Sacramento',          weights: '400',     category: 'Script / Romance' },
  { label: 'Allura',              family: 'Allura',              weights: '400',     category: 'Script / Romance' },
  { label: 'Pinyon Script',       family: 'Pinyon+Script',       weights: '400',     category: 'Script / Romance' },
  { label: 'Alex Brush',          family: 'Alex+Brush',          weights: '400',     category: 'Script / Romance' },
  { label: 'Petit Formal Script', family: 'Petit+Formal+Script', weights: '400',     category: 'Script / Romance' },
  { label: 'Tangerine',           family: 'Tangerine',           weights: '400;700', category: 'Script / Romance' },
  { label: 'Italianno',           family: 'Italianno',           weights: '400',     category: 'Script / Romance' },
  { label: 'Sevillana',           family: 'Sevillana',           weights: '400',     category: 'Script / Romance' },
  { label: 'Euphoria Script',     family: 'Euphoria+Script',     weights: '400',     category: 'Script / Romance' },
  { label: 'Lovers Quarrel',      family: 'Lovers+Quarrel',      weights: '400',     category: 'Script / Romance' },
  { label: 'Ruthie',              family: 'Ruthie',              weights: '400',     category: 'Script / Romance' },
  { label: 'Herr Von Muellerhoff', family: 'Herr+Von+Muellerhoff', weights: '400',  category: 'Script / Romance' },
  { label: 'Satisfy',             family: 'Satisfy',             weights: '400',     category: 'Script / Romance' },
  { label: 'Kaushan Script',      family: 'Kaushan+Script',      weights: '400',     category: 'Script / Romance' },
  { label: 'Courgette',           family: 'Courgette',           weights: '400',     category: 'Script / Romance' },
  { label: 'Pacifico',            family: 'Pacifico',            weights: '400',     category: 'Script / Romance' },

  // ── Action / Bold ────────────────────────────────────────────────────────
  { label: 'Bebas Neue',          family: 'Bebas+Neue',          weights: '400',     category: 'Action / Bold' },
  { label: 'Black Ops One',       family: 'Black+Ops+One',       weights: '400',     category: 'Action / Bold' },
  { label: 'Passion One',         family: 'Passion+One',         weights: '400;700', category: 'Action / Bold' },
  { label: 'Graduate',            family: 'Graduate',            weights: '400',     category: 'Action / Bold' },
  { label: 'Changa One',          family: 'Changa+One',          weights: '400',     category: 'Action / Bold' },
  { label: 'Abril Fatface',       family: 'Abril+Fatface',       weights: '400',     category: 'Action / Bold' },
  { label: 'Alfa Slab One',       family: 'Alfa+Slab+One',       weights: '400',     category: 'Action / Bold' },
  { label: 'Titan One',           family: 'Titan+One',           weights: '400',     category: 'Action / Bold' },
  { label: 'Righteous',           family: 'Righteous',           weights: '400',     category: 'Action / Bold' },
  { label: 'Lilita One',          family: 'Lilita+One',          weights: '400',     category: 'Action / Bold' },
  { label: 'Lobster',             family: 'Lobster',             weights: '400',     category: 'Action / Bold' },
  { label: 'Lobster Two',         family: 'Lobster+Two',         weights: '400;700', category: 'Action / Bold' },
  { label: 'Bungee',              family: 'Bungee',              weights: '400',     category: 'Action / Bold' },
  { label: 'Bungee Shade',        family: 'Bungee+Shade',        weights: '400',     category: 'Action / Bold' },
  { label: 'Bungee Inline',       family: 'Bungee+Inline',       weights: '400',     category: 'Action / Bold' },
  { label: 'Oswald',              family: 'Oswald',              weights: '400;700', category: 'Action / Bold' },
  { label: 'Squada One',          family: 'Squada+One',          weights: '400',     category: 'Action / Bold' },
  { label: 'Fjalla One',          family: 'Fjalla+One',          weights: '400',     category: 'Action / Bold' },
  { label: 'Barlow Condensed',    family: 'Barlow+Condensed',    weights: '400;700', category: 'Action / Bold' },
  { label: 'Sigmar One',          family: 'Sigmar+One',          weights: '400',     category: 'Action / Bold' },

  // ── Sci-Fi / Futuristic ──────────────────────────────────────────────────
  { label: 'Orbitron',            family: 'Orbitron',            weights: '400;700', category: 'Sci-Fi / Futuristic' },
  { label: 'Rajdhani',            family: 'Rajdhani',            weights: '400;700', category: 'Sci-Fi / Futuristic' },
  { label: 'Exo 2',               family: 'Exo+2',               weights: '400;700', category: 'Sci-Fi / Futuristic' },
  { label: 'Electrolize',         family: 'Electrolize',         weights: '400',     category: 'Sci-Fi / Futuristic' },
  { label: 'Aldrich',             family: 'Aldrich',             weights: '400',     category: 'Sci-Fi / Futuristic' },
  { label: 'Michroma',            family: 'Michroma',            weights: '400',     category: 'Sci-Fi / Futuristic' },
  { label: 'Oxanium',             family: 'Oxanium',             weights: '400;700', category: 'Sci-Fi / Futuristic' },
  { label: 'Iceland',             family: 'Iceland',             weights: '400',     category: 'Sci-Fi / Futuristic' },
  { label: 'Share Tech Mono',     family: 'Share+Tech+Mono',     weights: '400',     category: 'Sci-Fi / Futuristic' },
  { label: 'Major Mono Display',  family: 'Major+Mono+Display',  weights: '400',     category: 'Sci-Fi / Futuristic' },
  { label: 'Chakra Petch',        family: 'Chakra+Petch',        weights: '400;700', category: 'Sci-Fi / Futuristic' },
  { label: 'Monoton',             family: 'Monoton',             weights: '400',     category: 'Sci-Fi / Futuristic' },

  // ── Western / Adventure ──────────────────────────────────────────────────
  { label: 'Rye',                 family: 'Rye',                 weights: '400',     category: 'Western / Adventure' },
  { label: 'Sancreek',            family: 'Sancreek',            weights: '400',     category: 'Western / Adventure' },
  { label: 'Ultra',               family: 'Ultra',               weights: '400',     category: 'Western / Adventure' },

  // ── Pixel / Retro ────────────────────────────────────────────────────────
  { label: 'Press Start 2P',      family: 'Press+Start+2P',      weights: '400',     category: 'Pixel / Retro' },
  { label: 'VT323',               family: 'VT323',               weights: '400',     category: 'Pixel / Retro' },
  { label: 'Silkscreen',          family: 'Silkscreen',          weights: '400;700', category: 'Pixel / Retro' },

  // ── Handwritten / Natural ────────────────────────────────────────────────
  { label: 'Indie Flower',        family: 'Indie+Flower',        weights: '400',     category: 'Handwritten / Natural' },
  { label: 'Rock Salt',           family: 'Rock+Salt',           weights: '400',     category: 'Handwritten / Natural' },
  { label: 'Shadows Into Light',  family: 'Shadows+Into+Light',  weights: '400',     category: 'Handwritten / Natural' },
  { label: 'Covered By Your Grace', family: 'Covered+By+Your+Grace', weights: '400', category: 'Handwritten / Natural' },
  { label: 'Crafty Girls',        family: 'Crafty+Girls',        weights: '400',     category: 'Handwritten / Natural' },
  { label: 'Coming Soon',         family: 'Coming+Soon',         weights: '400',     category: 'Handwritten / Natural' },
  { label: 'Fuzzy Bubbles',       family: 'Fuzzy+Bubbles',       weights: '400;700', category: 'Handwritten / Natural' },
  { label: 'Sriracha',            family: 'Sriracha',            weights: '400',     category: 'Handwritten / Natural' },
  { label: 'Nanum Pen Script',    family: 'Nanum+Pen+Script',    weights: '400',     category: 'Handwritten / Natural' },
  { label: 'Handlee',             family: 'Handlee',             weights: '400',     category: 'Handwritten / Natural' },

  // ── Clean Body Text ──────────────────────────────────────────────────────
  { label: 'DM Sans',             family: 'DM+Sans',             weights: '400;700', category: 'Clean Body Text' },
  { label: 'Lato',                family: 'Lato',                weights: '400;700', category: 'Clean Body Text' },
  { label: 'Nunito',              family: 'Nunito',              weights: '400;700', category: 'Clean Body Text' },
  { label: 'Raleway',             family: 'Raleway',             weights: '400;700', category: 'Clean Body Text' },
  { label: 'Montserrat',          family: 'Montserrat',          weights: '400;700', category: 'Clean Body Text' },
  { label: 'Josefin Sans',        family: 'Josefin+Sans',        weights: '400;700', category: 'Clean Body Text' },
  { label: 'Josefin Slab',        family: 'Josefin+Slab',        weights: '400;700', category: 'Clean Body Text' },
  { label: 'Merriweather',        family: 'Merriweather',        weights: '400;700', category: 'Clean Body Text' },
  { label: 'Lora',                family: 'Lora',                weights: '400;700', category: 'Clean Body Text' },
  { label: 'Zilla Slab',          family: 'Zilla+Slab',          weights: '400;700', category: 'Clean Body Text' },
  { label: 'Arvo',                family: 'Arvo',                weights: '400;700', category: 'Clean Body Text' },
  { label: 'Source Sans Pro',     family: 'Source+Sans+Pro',     weights: '400;700', category: 'Clean Body Text' },
  { label: 'PT Sans',             family: 'PT+Sans',             weights: '400;700', category: 'Clean Body Text' },
]

/**
 * Inject a Google Fonts stylesheet for the given font label. No-ops if the
 * font has already been loaded or is not in the list.
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
