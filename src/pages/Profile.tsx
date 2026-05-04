import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import GateLogo from '../components/GateLogo'

interface ProfileStory {
  id: string
  title: string
  slug: string
  cover_url: string | null
  content_rating: 'mature' | 'explicit' | null
}

interface ProfileCreator {
  display_name: string | null
  username: string
  bio: string | null
}

export default function Profile(): React.JSX.Element {
  const { username } = useParams<{ username: string }>()
  const [creator, setCreator] = useState<ProfileCreator | null>(null)
  const [stories, setStories] = useState<ProfileStory[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!username) { setNotFound(true); setLoading(false); return }

    async function load(): Promise<void> {
      const { data: userData } = await supabase
        .from('users')
        .select('id, username, display_name, bio')
        .eq('username', username)
        .single()

      if (!userData) { setNotFound(true); setLoading(false); return }

      setCreator({ username: userData.username, display_name: userData.display_name, bio: userData.bio })

      const { data: storiesData } = await supabase
        .from('stories')
        .select('id, title, slug, cover_url, content_rating')
        .eq('user_id', userData.id)
        .eq('is_published', true)
        .order('updated_at', { ascending: false })

      setStories(storiesData ?? [])
      setLoading(false)
    }

    void load()
  }, [username])

  const displayName = creator?.display_name || creator?.username || username

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0E0608' }} aria-hidden="true" />
    )
  }

  if (notFound) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0E0608',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <GateLogo />
          <div style={{
            fontFamily: "'DM Serif Display', serif", fontSize: '26px',
            color: '#F5EEE8', marginTop: '24px', marginBottom: '12px',
          }}>Creator not found</div>
          <div style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: '13px',
            color: 'rgba(245,238,232,0.45)', lineHeight: 1.75,
          }}>This creator doesn't exist or hasn't published anything yet.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0E0608',
      color: '#F5EEE8', fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        maxWidth: 640, margin: '0 auto', padding: '48px 24px 32px',
        textAlign: 'center',
        borderBottom: '1px solid rgba(245,238,232,0.07)',
      }}>
        <div style={{ marginBottom: '20px' }}>
          <GateLogo />
        </div>
        <div style={{
          fontFamily: "'DM Serif Display', serif", fontSize: '32px',
          lineHeight: 1.15, color: '#F5EEE8', marginBottom: '8px',
        }}>{displayName}</div>
        <div style={{
          fontSize: '12px', color: 'rgba(245,238,232,0.35)',
          letterSpacing: '0.06em', marginBottom: creator?.bio ? '16px' : '0',
        }}>@{username}</div>
        {creator?.bio && (
          <div style={{
            fontSize: '13px', color: 'rgba(245,238,232,0.6)',
            lineHeight: 1.75, maxWidth: 420, margin: '0 auto',
          }}>{creator.bio}</div>
        )}
      </div>

      {/* Stories */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px 64px' }}>
        {stories.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 0',
            fontSize: '13px', color: 'rgba(245,238,232,0.3)',
          }}>No published stories yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stories.map((story) => (
              <Link
                key={story.id}
                to={`/u/${username}/s/${story.slug}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  background: 'rgba(245,238,232,0.03)',
                  border: '1px solid rgba(245,238,232,0.07)',
                  borderRadius: '10px', padding: '12px',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = 'rgba(201,48,96,0.35)'
                    el.style.background = 'rgba(201,48,96,0.05)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = 'rgba(245,238,232,0.07)'
                    el.style.background = 'rgba(245,238,232,0.03)'
                  }}
                >
                  {/* Cover thumbnail */}
                  <div style={{
                    width: 52, height: 68, borderRadius: 6,
                    background: 'rgba(245,238,232,0.05)',
                    border: '1px solid rgba(245,238,232,0.08)',
                    flexShrink: 0, overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {story.cover_url ? (
                      <img
                        src={story.cover_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ opacity: 0.2 }}>
                        <rect x="1" y="1" width="16" height="16" rx="2" stroke="#F5EEE8" strokeWidth="1.2"/>
                        <path d="M1 12l4-4 3 3 3-3 5 5" stroke="#F5EEE8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="5.5" cy="5.5" r="1.2" stroke="#F5EEE8" strokeWidth="1.1"/>
                      </svg>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'DM Serif Display', serif",
                      fontSize: '16px', color: '#F5EEE8', lineHeight: 1.3,
                      marginBottom: '5px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{story.title}</div>
                    {story.content_rating && (
                      <span style={{
                        display: 'inline-block',
                        fontSize: '9px', fontWeight: 600,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: '#DC5A8A',
                        background: 'rgba(220,90,138,0.1)',
                        border: '1px solid rgba(220,90,138,0.2)',
                        borderRadius: '3px', padding: '2px 6px',
                      }}>
                        {story.content_rating}
                      </span>
                    )}
                  </div>

                  {/* Arrow */}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.3, flexShrink: 0 }}>
                    <path d="M6 4l4 4-4 4" stroke="#F5EEE8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center', paddingBottom: '32px',
        fontSize: '10px', color: 'rgba(245,238,232,0.18)',
        letterSpacing: '0.06em',
      }}>Alexandria · Visual Storytelling</div>
    </div>
  )
}
