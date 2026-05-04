import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import '../styles/dashboard.css'

interface DashboardStory {
  id: string
  title: string
  slug: string
  is_published: boolean
  cover_url: string | null
  content_rating: 'mature' | 'explicit'
  panel_count: number
  read_count: number
  created_at: string
  updated_at: string
}

const SLUG_ADJECTIVES = ['crimson', 'silent', 'hollow', 'ashen', 'veiled', 'bitter', 'sunken', 'pale']
const SLUG_NOUNS = ['vale', 'throne', 'ember', 'grave', 'thorn', 'veil', 'shore', 'shard']

function generateSlug(): string {
  const adj = SLUG_ADJECTIVES[Math.floor(Math.random() * SLUG_ADJECTIVES.length)]
  const noun = SLUG_NOUNS[Math.floor(Math.random() * SLUG_NOUNS.length)]
  const suffix = Math.random().toString(16).slice(2, 6)
  return `${adj}-${noun}-${suffix}`
}

export default function Dashboard(): React.JSX.Element {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()

  const [stories, setStories] = useState<DashboardStory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)

  const fetchStories = useCallback(async (): Promise<void> => {
    if (!user) return
    try {
      const { data, error: fetchError } = await supabase
        .from('stories')
        .select('id, title, slug, is_published, cover_url, content_rating, read_count, created_at, updated_at, panels(count)')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (fetchError) throw fetchError

      interface StoryRow {
        id: string
        title: string
        slug: string
        is_published: boolean
        cover_url: string | null
        content_rating: 'mature' | 'explicit'
        read_count: number
        created_at: string
        updated_at: string
        panels: { count: number }[] | null
      }
      const rows = (data ?? []) as unknown as StoryRow[]
      setStories(
        rows.map((story) => ({
          id: story.id,
          title: story.title,
          slug: story.slug,
          is_published: story.is_published,
          cover_url: story.cover_url,
          content_rating: story.content_rating,
          panel_count: story.panels?.[0]?.count ?? 0,
          read_count: story.read_count ?? 0,
          created_at: story.created_at,
          updated_at: story.updated_at,
        }))
      )

      const { data: profileData } = await supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single()
      setUsername(profileData?.username ?? null)
    } catch {
      setError('Could not load stories. Please refresh.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void fetchStories()
  }, [fetchStories])

  useEffect(() => {
    if (deletingId === null) return
    const timer = setTimeout(() => setDeletingId(null), 3000)
    return () => clearTimeout(timer)
  }, [deletingId])

  const handleNewStory = async (): Promise<void> => {
    if (!user) return
    setCreating(true)
    setCreateError(null)
    try {
      const slug = generateSlug()
      const { data, error: insertError } = await supabase
        .from('stories')
        .insert({
          title: 'Untitled Story',
          slug,
          user_id: user.id,
          is_published: false,
          content_rating: 'mature',
        })
        .select('id')
        .single()
      if (insertError || !data) throw insertError

      const storyId = (data as { id: string }).id

      const { error: chunkError } = await supabase
        .from('chunks')
        .insert({
          story_id: storyId,
          chapter_number: 1,
          chapter_title: null,
          position: 0,
        })
      if (chunkError) throw chunkError

      navigate(`/editor/${storyId}`)
    } catch {
      setCreateError('Could not create story. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleTogglePublish = async (story: DashboardStory): Promise<void> => {
    if (togglingId !== null) return
    setTogglingId(story.id)
    try {
      const { error: updateError } = await supabase
        .from('stories')
        .update({ is_published: !story.is_published })
        .eq('id', story.id)
      if (updateError) throw updateError
      setStories((prev) =>
        prev.map((s) => s.id === story.id ? { ...s, is_published: !s.is_published } : s)
      )
    } catch {
      setError('Could not update story. Please try again.')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDeleteClick = async (storyId: string): Promise<void> => {
    if (deletingId === storyId) {
      try {
        const { error: deleteError } = await supabase
          .from('stories')
          .delete()
          .eq('id', storyId)
        if (deleteError) throw deleteError
        setStories((prev) => prev.filter((s) => s.id !== storyId))
      } catch {
        setError('Could not delete story. Please try again.')
      } finally {
        setDeletingId(null)
      }
    } else {
      setDeletingId(storyId)
    }
  }

  const handleCopy = (story: DashboardStory): void => {
    const url = `${window.location.origin}/u/${username}/s/${story.slug}`
    void navigator.clipboard.writeText(url)
    setCopiedId(story.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSignOut = async (): Promise<void> => {
    await signOut()
    navigate('/signin')
  }

  if (loading) {
    return (
      <div className="dashboard-root" data-theme="dark">
        <div className="dashboard-state-full">Loading…</div>
      </div>
    )
  }

  return (
    <div className="dashboard-root" data-theme="dark">
      <nav className="dashboard-nav">
        <div className="dashboard-nav-logo">
          <svg width="10" height="20" viewBox="0 0 20 40" fill="none" aria-hidden="true">
            <rect x="1" y="27" width="18" height="13" rx="1" fill="#C93060"/>
            <rect x="3.5" y="17" width="13" height="11" rx="1" fill="#DC5A8A"/>
            <rect x="6" y="9" width="8" height="9" rx="1" fill="#E87FAA"/>
            <rect x="8" y="3" width="4" height="7" rx="1" fill="#F5EEE8" opacity="0.9"/>
            <polygon points="10,0 8.5,3 11.5,3" fill="#F5EEE8"/>
            <circle cx="10" cy="0.8" r="1.2" fill="#DC5A8A"/>
          </svg>
          <span className="dashboard-nav-wordmark">ALEXANDRIA</span>
        </div>
        <div className="dashboard-nav-right">
          {username && <span className="dashboard-nav-username">@{username}</span>}
          <button className="dashboard-nav-btn" onClick={() => void handleSignOut()}>
            Sign out
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1 className="dashboard-heading">Your Stories</h1>
          <div>
            {createError && (
              <div className="dashboard-error" style={{ marginBottom: '8px' }}>{createError}</div>
            )}
            <button
              className="dashboard-new-btn"
              onClick={() => void handleNewStory()}
              disabled={creating}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {creating ? 'Creating…' : 'New Story'}
            </button>
          </div>
        </div>

        {error && <div className="dashboard-error">{error}</div>}

        {stories.length === 0 ? (
          <div className="dashboard-empty">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true" style={{ opacity: 0.2, color: 'var(--db-text-primary)' }}>
              <rect x="6" y="4" width="28" height="32" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 12h16M12 18h16M12 24h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <div className="dashboard-empty-title">No stories yet</div>
            <div className="dashboard-empty-sub">Create your first story and start building your world.</div>
          </div>
        ) : (
          <div className="story-grid">
            {stories.map((story) => (
              <article key={story.id} className="story-card">
                <div className="story-card-top">
                  <div className="story-cover">
                    {story.cover_url ? (
                      <img src={story.cover_url} alt="" />
                    ) : (
                      <div className="story-cover-placeholder">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <rect x="2" y="2" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M2 16l6-6 5 5 4-4 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="story-meta">
                    <div className="story-meta-top">
                      <span className="story-title-text">{story.title}</span>
                      <span className={`story-badge ${story.is_published ? 'story-badge-live' : 'story-badge-draft'}`}>
                        {story.is_published ? 'Live' : 'Draft'}
                      </span>
                    </div>

                    <div className="story-stat-row">
                      <span className="story-stat">
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                          <rect x="1" y="1" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1"/>
                          <path d="M1 7l2.5-2.5 2 2 1.5-1.5 3 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {story.panel_count} {story.panel_count === 1 ? 'panel' : 'panels'}
                      </span>
                      <span className="story-stat">
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                          <path d="M1 5.5C1 3 3 1 5.5 1S10 3 10 5.5 8 10 5.5 10 1 8 1 5.5z" stroke="currentColor" strokeWidth="1"/>
                          <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor"/>
                        </svg>
                        {story.read_count} {story.read_count === 1 ? 'read' : 'reads'}
                      </span>
                    </div>

                    <div className="story-url-row">
                      <span className="story-url-text">/u/{username}/s/{story.slug}</span>
                      <button
                        className={`story-url-copy-btn${copiedId === story.id ? ' copied' : ''}`}
                        onClick={() => handleCopy(story)}
                        aria-label="Copy share URL"
                      >
                        {copiedId === story.id ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="story-card-bottom">
                  <div className="publish-toggle-row">
                    <button
                      className="publish-toggle"
                      role="switch"
                      aria-checked={story.is_published}
                      onClick={() => void handleTogglePublish(story)}
                      disabled={togglingId === story.id}
                      aria-label={story.is_published ? 'Unpublish story' : 'Publish story'}
                    >
                      <span className="publish-toggle-thumb" />
                    </button>
                    <span className="publish-toggle-label">
                      {story.is_published ? 'Live' : 'Draft'}
                    </span>
                  </div>

                  <div className="card-actions">
                    <button
                      className="card-action-btn card-action-edit"
                      onClick={() => navigate(`/editor/${story.id}`)}
                      aria-label="Edit story"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <path d="M7 1.5l1.5 1.5L3 8.5l-2 .5.5-2L7 1.5z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Edit
                    </button>
                    <button
                      className={`card-action-btn card-action-delete${deletingId === story.id ? ' confirming' : ''}`}
                      onClick={() => void handleDeleteClick(story.id)}
                      aria-label={deletingId === story.id ? 'Confirm delete' : 'Delete story'}
                    >
                      {deletingId === story.id ? 'Sure?' : 'Delete'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
