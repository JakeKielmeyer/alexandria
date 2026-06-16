import React, { useState, useEffect } from 'react'
import type { ReadingMode } from '../../types'

interface ReadingModeModalProps {
  open: boolean
  creating: boolean
  onConfirm: (mode: ReadingMode) => void
}

const MODE_OPTIONS: { value: ReadingMode; label: string; desc: string }[] = [
  { value: 'book',      label: 'Book',                desc: '400 × 600px per page, 3D page turn' },
  { value: 'cinematic', label: 'Webtoon — Cinematic', desc: '400 × 640px panels with transitions' },
  { value: 'scroll',    label: 'Webtoon — Classic',   desc: 'Variable height, continuous scroll' },
]

export default function ReadingModeModal({ open, creating, onConfirm }: ReadingModeModalProps): React.JSX.Element | null {
  const [selected, setSelected] = useState<ReadingMode | null>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') e.preventDefault()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  if (!open) return null

  return (
    <div className="db-modal-overlay">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reading-mode-modal-title"
        className="db-modal-card"
      >
        <h2 id="reading-mode-modal-title" className="db-modal-title">
          Choose a reading mode
        </h2>

        <div className="db-mode-options">
          {MODE_OPTIONS.map(({ value, label, desc }) => (
            <button
              key={value}
              className={`db-mode-option${selected === value ? ' db-mode-option--selected' : ''}`}
              onClick={() => setSelected(value)}
              aria-pressed={selected === value}
              type="button"
            >
              <span className="db-mode-option-label">{label}</span>
              <span className="db-mode-option-desc">{desc}</span>
            </button>
          ))}
        </div>

        <p className="db-modal-disclaimer">
          You can change your reading mode at any time in Publish Settings.
        </p>

        <div className="db-modal-footer">
          <button
            className="db-modal-confirm"
            disabled={selected === null || creating}
            onClick={() => { if (selected) onConfirm(selected) }}
            type="button"
          >
            {creating ? 'Creating…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
