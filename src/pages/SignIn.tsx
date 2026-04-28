// Inline styles retained on inputs and buttons per coding standards (existing code).
// New structural layout uses auth.css classes only.
import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import GateLogo from '../components/GateLogo'
import '../styles/auth.css'

export default function SignIn(): React.JSX.Element {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (searchParams.get('confirmed') === '1') setConfirmed(true)
  }, [searchParams])

  const handleSubmit = async () => {
    setFormError(null)
    setSubmitting(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
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

        <div className="auth-heading">Sign in</div>

        {confirmed && (
          <div style={{
            background: 'rgba(61,170,112,0.12)',
            border: '1px solid rgba(61,170,112,0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '12px',
            color: '#3DAA70',
            textAlign: 'center',
          }}>
            Email confirmed — please sign in to continue.
          </div>
        )}

        <div className="auth-fields">
          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
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
              marginBottom: '12px'
            }}
          />

          {/* Password with toggle */}
          <div className="auth-password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
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

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              background: submitting ? 'rgba(201,48,96,0.6)' : '#C93060',
              color: '#F5EEE8',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              fontWeight: 500,
              padding: '15px 0',
              borderRadius: '8px',
              width: '100%',
              marginBottom: '10px',
              border: 'none',
              cursor: submitting ? 'default' : 'pointer',
              display: 'block'
            }}
          >{submitting ? 'Signing in…' : 'Sign In'}</button>

          {/* Form error */}
          {formError && (
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#C93060', marginBottom: '10px', textAlign: 'center' }}>{formError}</div>
          )}

          {/* Sign up link */}
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '12px',
            color: 'rgba(245,238,232,0.45)',
            textAlign: 'center'
          }}>
            Don't have an account?{' '}
            <span
              onClick={() => navigate('/signup')}
              style={{ color: '#DC5A8A', cursor: 'pointer', textDecoration: 'none' }}
            >Sign up</span>
          </div>
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
