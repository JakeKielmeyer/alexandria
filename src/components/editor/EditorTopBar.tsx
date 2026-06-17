import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEditorStore } from '../../store/editorStore'
import type { EditorMode } from '../../store/editorStore'

const MODES: { id: EditorMode; label: string }[] = [
  { id: 'design', label: 'Design' },
]

interface EditorTopBarProps {
  onPreview?: () => Promise<void>
}

// NOTE: This component is keyed off `story?.id` by its parent
// (src/pages/Editor.tsx) so that switching stories remounts the
// component with a fresh `titleValue` initialized from the new story's
// title. That avoids a useEffect that syncs prop → state, which tripped
// react-hooks/set-state-in-effect.
export default function EditorTopBar({ onPreview }: EditorTopBarProps): React.JSX.Element {
  const { story, saveStatus, editorMode, setEditorMode, updateStory, setSaveStatus, gridVisible, toggleGrid } = useEditorStore()
  const navigate = useNavigate()
  const [titleValue, setTitleValue] = useState(story?.title ?? '')

  const handleLogoClick = (): void => {
    if (saveStatus === 'unsaved') {
      const confirmed = window.confirm('Leave editor? Unsaved changes will be lost.')
      if (!confirmed) return
    }
    navigate('/dashboard')
  }

  const saveStatusLabel: Record<typeof saveStatus, string> = {
    saved: 'Saved',
    saving: 'Saving…',
    unsaved: 'Unsaved',
    error: 'Error saving',
  }

  const saveStatusColor: Record<typeof saveStatus, string> = {
    saved: 'var(--text-faint)',
    saving: 'var(--text-muted)',
    unsaved: 'var(--rose-accent)',
    error: '#e53e3e',
  }

  const handleTitleBlur = (): void => {
    if (!story || titleValue === story.title) return
    updateStory({ title: titleValue })
    setSaveStatus('unsaved')
  }

  return (
    <header className="editor-topbar">
      {/* Logo */}
      <button
        onClick={handleLogoClick}
        aria-label="Back to dashboard"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}
      >
        <svg width="20" height="30" viewBox="0 0 20 40" fill="none" aria-hidden="true">
          <rect x="1" y="27" width="18" height="13" rx="1" fill="#C93060"/>
          <rect x="3.5" y="17" width="13" height="11" rx="1" fill="#DC5A8A"/>
          <rect x="6" y="9" width="8" height="9" rx="1" fill="#E87FAA"/>
          <rect x="8" y="3" width="4" height="7" rx="1" fill="#F5EEE8" opacity="0.9"/>
          <polygon points="10,0 8.5,3 11.5,3" fill="#F5EEE8"/>
          <circle cx="10" cy="0.8" r="1.2" fill="#DC5A8A"/>
        </svg>
      </button>

      {/* Title + save status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        <input
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onBlur={handleTitleBlur}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 500,
            minWidth: 0,
            flex: 1,
            maxWidth: '280px',
            outline: 'none',
            padding: '4px 6px',
            borderRadius: '4px',
          }}
          aria-label="Story title"
        />
        <span style={{ fontSize: '15px', color: saveStatusColor[saveStatus], flexShrink: 0 }}>
          {saveStatusLabel[saveStatus]}
        </span>
      </div>

      {/* Mode tabs — centered */}
      <nav style={{ display: 'flex', gap: '4px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} aria-label="Editor mode">
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setEditorMode(id)}
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
              fontWeight: 500,
              color: editorMode === id ? 'var(--rose-accent)' : 'var(--text-muted)',
              padding: '6px 14px',
              minHeight: '44px',
              background: 'none',
              border: 'none',
              borderBottom: editorMode === id ? '2px solid var(--rose-accent)' : '2px solid transparent',
              borderRadius: 0,
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            aria-pressed={editorMode === id}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
        <button
          onClick={toggleGrid}
          aria-pressed={gridVisible}
          aria-label="Toggle alignment grid"
          title="Toggle alignment grid (G)"
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            color: gridVisible ? 'var(--rose-accent)' : 'var(--text-muted)',
            padding: '6px 10px',
            minHeight: '44px',
            background: gridVisible ? 'var(--btn-rose-bg)' : 'var(--btn-ghost-bg)',
            border: `1px solid ${gridVisible ? 'var(--btn-rose-brd)' : 'var(--btn-ghost-brd)'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M4 1v10M8 1v10M1 4h10M1 8h10" stroke="currentColor" strokeWidth="1"/>
          </svg>
          Grid
        </button>
        <button
          onClick={() => {
            if (!story) return
            if (onPreview) {
              void onPreview()
            } else {
              navigate(`/u/${story.username}/s/${story.slug}?preview=1`)
            }
          }}
          disabled={!story}
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            color: story ? 'var(--text-secondary)' : 'var(--text-muted)',
            padding: '6px 14px',
            minHeight: '44px',
            background: 'var(--btn-ghost-bg)',
            border: '1px solid var(--btn-ghost-brd)',
            borderRadius: '6px',
            opacity: story ? 1 : 0.4,
            cursor: story ? 'pointer' : 'not-allowed',
          }}
          aria-label="Preview story"
          title="Preview story in reader"
        >
          Preview
        </button>
        <button
          onClick={() => setEditorMode('publish')}
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 500,
            color: 'var(--rose-accent)',
            padding: '6px 14px',
            minHeight: '44px',
            background: 'var(--btn-rose-bg)',
            border: '1px solid var(--btn-rose-brd)',
            borderRadius: '6px',
            cursor: 'pointer',
            outline: editorMode === 'publish' ? '2px solid var(--rose-accent)' : 'none',
            outlineOffset: '2px',
          }}
          aria-pressed={editorMode === 'publish'}
        >
          Publish
        </button>
      </div>
    </header>
  )
}
