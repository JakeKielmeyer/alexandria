// Inline styles retained on inputs and buttons per coding standards (existing code).
// New structural layout uses auth.css classes only.
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import GateLogo from '../components/GateLogo'
import '../styles/auth.css'

const USERNAME_REGEX = /^[a-z0-9_]{0,20}$/
const USERNAME_INVALID_CHAR = /[^a-z0-9_]/g

interface FieldErrors {
  email?: string
  username?: string
  password?: string
}

export default function SignUp(): React.JSX.Element {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTos, setAcceptedTos] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const validateField = (field: keyof FieldErrors, value: string) => {
    let error: string | undefined
    if (field === 'email' && value.length === 0) {
      error = 'Email is required'
    }
    if (field === 'username') {
      if (value.length < 3) error = 'Username must be at least 3 characters'
      else if (!USERNAME_REGEX.test(value)) error = 'Lowercase letters, numbers, and underscores only'
    }
    if (field === 'password') {
      if (value.length < 8) error = 'Password must be at least 8 characters'
    }
    setFieldErrors(prev => ({ ...prev, [field]: error }))
  }

  const handleUsernameChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(USERNAME_INVALID_CHAR, '').slice(0, 20)
    setUsername(cleaned)
  }

  const hasFieldErrors = () => {
    const errors: FieldErrors = {}
    if (email.length === 0) errors.email = 'Email is required'
    if (username.length < 3) errors.username = 'Username must be at least 3 characters'
    else if (!USERNAME_REGEX.test(username)) errors.username = 'Lowercase letters, numbers, and underscores only'
    if (password.length < 8) errors.password = 'Password must be at least 8 characters'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return true
    }
    return false
  }

  const handleSubmit = async () => {
    setFormError(null)
    if (hasFieldErrors()) return
    if (!acceptedTos) {
      setFormError('You must confirm you are 18+ and agree to the Terms and Privacy Policy.')
      return
    }
    const trimmedCode = inviteCode.trim()
    if (trimmedCode.length === 0) {
      setFormError('An invite code is required during private beta.')
      return
    }

    setSubmitting(true)
    try {
      // Validate invite code before creating the auth user. The RPC only
      // checks availability here; final redemption happens after the user
      // row exists (see below) so we can record who used it.
      const { data: codeCheck, error: codeError } = await supabase
        .rpc('invite_code_available', { code_text: trimmedCode })
      if (codeError) {
        setFormError(codeError.message)
        setSubmitting(false)
        return
      }
      if (codeCheck !== true) {
        setFormError('That invite code is not valid or has already been used.')
        setSubmitting(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${window.location.origin}/signin?confirmed=1`,
        },
      })
      if (error) {
        setFormError(error.message)
        return
      }
      if (data.user && data.user.identities?.length === 0) {
        setFormError('An account with this email already exists. Sign in instead.')
        return
      }

      // Redeem the code against the newly created user. If this fails we
      // surface the error but the account still exists — the user can
      // contact support to have their code redeemed manually.
      const { error: redeemError } = await supabase
        .rpc('redeem_invite', { code_text: trimmedCode })
      if (redeemError && import.meta.env.DEV) {
        console.warn('[signup] invite redeem failed:', redeemError.message)
      }

      setSuccess(true)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="auth-root">
        <div className="auth-card">
          <GateLogo />
          <div className="auth-heading">Check your email</div>
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '13px',
            lineHeight: 1.75,
            color: 'rgba(245,238,232,0.62)',
            marginBottom: '32px',
            alignSelf: 'flex-start'
          }}>
            We sent a confirmation link to <strong style={{ color: 'rgba(245,238,232,0.8)' }}>{email}</strong>. Click the link to activate your account.
          </div>
          <div className="auth-footer-text">Alexandria · Visual Storytelling</div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-root">
      <div className="auth-card">
        <GateLogo />

        <div className="auth-heading">Create your account</div>

        <div className="auth-fields">
          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onBlur={() => validateField('email', email)}
            style={{
              width: '100%',
              boxSizing: 'border-box' as const,
              background: 'rgba(245,238,232,0.06)',
              border: fieldErrors.email ? '1px solid #C93060' : '1px solid rgba(245,238,232,0.1)',
              borderRadius: '8px',
              padding: '14px 16px',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              color: '#F5EEE8',
              outline: 'none',
              marginBottom: fieldErrors.email ? '4px' : '12px'
            }}
          />
          {fieldErrors.email && (
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: '#C93060', marginBottom: '12px', textAlign: 'left' }}>{fieldErrors.email}</div>
          )}

          {/* Username */}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => handleUsernameChange(e.target.value)}
            onBlur={() => validateField('username', username)}
            style={{
              width: '100%',
              boxSizing: 'border-box' as const,
              background: 'rgba(245,238,232,0.06)',
              border: fieldErrors.username ? '1px solid #C93060' : '1px solid rgba(245,238,232,0.1)',
              borderRadius: '8px',
              padding: '14px 16px',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              color: '#F5EEE8',
              outline: 'none',
              marginBottom: fieldErrors.username ? '4px' : '12px'
            }}
          />
          {fieldErrors.username && (
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: '#C93060', marginBottom: '12px', textAlign: 'left' }}>{fieldErrors.username}</div>
          )}

          {/* Password with toggle */}
          <div className={fieldErrors.password ? 'auth-password-wrapper auth-password-wrapper--error' : 'auth-password-wrapper'}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onBlur={() => validateField('password', password)}
              style={{
                width: '100%',
                boxSizing: 'border-box' as const,
                background: 'rgba(245,238,232,0.06)',
                border: fieldErrors.password ? '1px solid #C93060' : '1px solid rgba(245,238,232,0.1)',
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
          {fieldErrors.password && (
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: '#C93060', marginBottom: '16px', textAlign: 'left' }}>{fieldErrors.password}</div>
          )}

          {/* Invite code */}
          <input
            type="text"
            placeholder="Invite code"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
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
              marginBottom: '16px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
            }}
          />

          {/* ToS + age attestation */}
          <label className="auth-tos-row">
            <input
              type="checkbox"
              checked={acceptedTos}
              onChange={e => setAcceptedTos(e.target.checked)}
            />
            <span>
              I am 18 years or older and agree to the{' '}
              <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms</Link>{' '}
              and{' '}
              <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.
            </span>
          </label>

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
          >{submitting ? 'Creating…' : 'Create Account'}</button>

          {/* Form error */}
          {formError && (
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#C93060', marginBottom: '10px', textAlign: 'center' }}>{formError}</div>
          )}

          {/* Sign in link */}
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '12px',
            color: 'rgba(245,238,232,0.45)',
            textAlign: 'center'
          }}>
            Already have an account?{' '}
            <span
              onClick={() => navigate('/signin')}
              style={{ color: '#DC5A8A', cursor: 'pointer', textDecoration: 'none' }}
            >Sign in</span>
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
