// src/components/editor/FontSelect.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { GOOGLE_FONTS, loadFont } from '../../lib/fonts'

interface FontSelectProps {
  value: string
  onChange: (fontLabel: string) => void
}

export default function FontSelect({ value, onChange }: FontSelectProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [fontsLoaded, setFontsLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleOpen = useCallback((): void => {
    if (!fontsLoaded) {
      for (const font of GOOGLE_FONTS) {
        loadFont(font.label)
      }
      setFontsLoaded(true)
    }
    setIsOpen(true)
  }, [fontsLoaded])

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  useEffect(() => {
    loadFont(value)
  }, [value])

  const categories = Array.from(new Set(GOOGLE_FONTS.map((f) => f.category)))

  return (
    <div ref={containerRef} className="font-select">
      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
        className="font-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Font family"
        style={{ fontFamily: `'${value}', sans-serif` }}
      >
        <span className="font-select-trigger-label">{value}</span>
        <svg
          width="9"
          height="5"
          viewBox="0 0 9 5"
          fill="none"
          aria-hidden="true"
          style={{ flexShrink: 0, opacity: 0.6 }}
        >
          <path
            d={isOpen ? 'M1 4.5l3.5-3.5 3.5 3.5' : 'M1 0.5l3.5 3.5 3.5-3.5'}
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div role="listbox" aria-label="Font family" className="font-select-dropdown">
          {categories.map((cat) => (
            <React.Fragment key={cat}>
              <div className="font-select-category">{cat}</div>
              {GOOGLE_FONTS.filter((f) => f.category === cat).map((font) => (
                <div
                  key={font.label}
                  role="option"
                  aria-selected={font.label === value}
                  className={font.label === value ? 'font-option font-option--active' : 'font-option'}
                  style={{ fontFamily: `'${font.label}', sans-serif` }}
                  onMouseDown={() => {
                    onChange(font.label)
                    setIsOpen(false)
                  }}
                >
                  {font.label}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
