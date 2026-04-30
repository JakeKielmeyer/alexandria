// Inline styles retained on inputs and buttons per coding standards (existing code).
// New structural layout uses auth.css classes only.
import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import GateLogo from '../components/GateLogo'
import '../styles/auth.css'

export default function UpdatePassword(): React.JSX.Element {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [ready, setReady] = useState(false)

  // Supabase parses the recovery token from the URL on load and emits a
  // PASSWORD_RECOVERY event with a temporary session. Wait for that event
  // (or an existing session) before allowing the form to submit; otherwise
  // updateUser will fail with "Auth session missing".
  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled && session) setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setReady(true)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async () => {
    setFormError(null)
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setFormError(error.message)
      } else {
        navigate('/dashboard')
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-root">
      <div className="auth-card">
        <GateLogo />

        <div className="auth-heading">Set new password</div>

        <div className="auth-fields">
          {!ready && (
            <div style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '12px',
              color: 'rgba(245,238,232,0.6)',
              marginBottom: '14px',
              textAlign: 'center',
              lineHeight: 1.5,
            }}>
              Verifying reset link…
            </div>
          )}

          <div className="auth-password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box' as const,
                background: 'rgba(245,238,232,0.06)',
                border: '1px solid rgba(245,238,232,0.1)',
                borderRadius: '8px',
                padding: '14px 16px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                color: '#F5EEE8',
                outline: 'none',
              }}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5M3.3 4.4C1.9 5.5 1 7 1 7s2.7 5 7 5a7 7 0 0 0 3.7-1.1M6 3.1A7 7 0 0 1 15 9s-.6 1.3-1.7 2.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M1 8s2.7-5 7-5 7 5 7 5-2.7 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
                </svg>
              )}
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !ready}
            style={{
              background: submitting || !ready ? 'rgba(201,48,96,0.6)' : '#C93060',
              color: '#F5EEE8',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              fontWeight: 500,
              padding: '15px 0',
              borderRadius: '8px',
              width: '100%',
              marginTop: '12px',
              marginBottom: '10px',
              border: 'none',
              cursor: submitting || !ready ? 'default' : 'pointer',
              display: 'block',
            }}
          >{submitting ? 'Updating…' : 'Update password'}</button>

          {formError && (
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#C93060', marginBottom: '10px', textAlign: 'center' }}>{formError}</div>
          )}
        </div>

        <div className="auth-legal-links">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/dmca">DMCA</Link>
          <Link to="/2257">2257</Link>
        </div>

        <div className="auth-footer-text">Alexandria · Visual Storytelling</div>
      </div>
    </div>
  )
}
