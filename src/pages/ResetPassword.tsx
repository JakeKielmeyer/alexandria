// Inline styles retained on inputs and buttons per coding standards (existing code).
// New structural layout uses auth.css classes only.
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import GateLogo from '../components/GateLogo'
import '../styles/auth.css'

export default function ResetPassword(): React.JSX.Element {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    setFormError(null)
    if (email.trim().length === 0) {
      setFormError('Email is required')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/update-password`,
      })
      if (error) {
        setFormError(error.message)
      } else {
        setSent(true)
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

        <div className="auth-heading">Reset password</div>

        {sent ? (
          <div style={{
            background: 'rgba(61,170,112,0.12)',
            border: '1px solid rgba(61,170,112,0.3)',
            borderRadius: '8px',
            padding: '14px 16px',
            marginBottom: '16px',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '13px',
            color: '#3DAA70',
            textAlign: 'center',
            lineHeight: 1.5,
          }}>
            Check your email for a password reset link.
            <div style={{ marginTop: 8, fontSize: '11px', color: 'rgba(245,238,232,0.45)' }}>
              The link expires after one hour.
            </div>
          </div>
        ) : (
          <div className="auth-fields">
            <div style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '12px',
              color: 'rgba(245,238,232,0.6)',
              marginBottom: '14px',
              textAlign: 'center',
              lineHeight: 1.5,
            }}>
              Enter your email and we'll send you a link to set a new password.
            </div>

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
                marginBottom: '12px',
              }}
            />

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
                display: 'block',
              }}
            >{submitting ? 'Sending…' : 'Send reset link'}</button>

            {formError && (
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#C93060', marginBottom: '10px', textAlign: 'center' }}>{formError}</div>
            )}

            <div style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '12px',
              color: 'rgba(245,238,232,0.45)',
              textAlign: 'center',
            }}>
              Remembered it?{' '}
              <span
                onClick={() => navigate('/signin')}
                style={{ color: '#DC5A8A', cursor: 'pointer', textDecoration: 'none' }}
              >Sign in</span>
            </div>
          </div>
        )}

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
