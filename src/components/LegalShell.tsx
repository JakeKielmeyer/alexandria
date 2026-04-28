import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/legal.css'

interface LegalShellProps {
  title: string
  effective: string
  children: React.ReactNode
  /** If true, show the "non-legal-advice placeholder" banner at top. */
  placeholder?: boolean
}

export default function LegalShell({ title, effective, children, placeholder = true }: LegalShellProps): React.JSX.Element {
  return (
    <div className="legal-root">
      <div className="legal-container">
        <div className="legal-topbar">
          <Link to="/">← Alexandria</Link>
          <span>Legal</span>
        </div>

        <h1 className="legal-title">{title}</h1>
        <div className="legal-effective">Effective: {effective}</div>

        {placeholder && (
          <div className="legal-placeholder-banner">
            <strong style={{ color: '#DC5A8A' }}>Draft placeholder.</strong>{' '}
            This document is a starting point for counsel review and does not
            constitute legal advice. Final language will be reviewed with
            qualified counsel before exiting private beta.
          </div>
        )}

        <div className="legal-body">{children}</div>

        <div className="legal-footer">
          <div>© Alexandria</div>
          <div className="legal-footer-links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/dmca">DMCA</Link>
            <Link to="/2257">2257</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
