import React from 'react'
import { captureException } from './telemetry'

interface State {
  error: Error | null
}

interface Props {
  children: React.ReactNode
}

/**
 * Top-level error boundary. Catches unhandled render errors so the user sees
 * a friendly shell instead of a blank page, and forwards the error to
 * telemetry. Per React docs, error boundaries only catch errors in
 * descendant render, lifecycle, and constructor code — async errors in
 * callbacks or effects still need explicit try/catch + captureException.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    captureException(error, { componentStack: info.componentStack })
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  private handleHome = (): void => {
    window.location.href = '/'
  }

  render(): React.ReactNode {
    if (this.state.error) {
      const isDev = import.meta.env.DEV
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0E0608',
          color: '#F5EEE8',
          fontFamily: "'DM Sans', sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}>
          <div style={{
            maxWidth: '440px',
            width: '100%',
            background: 'rgba(245,238,232,0.03)',
            border: '1px solid rgba(245,238,232,0.08)',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: '26px',
              lineHeight: 1.2,
              marginBottom: '14px',
            }}>Something broke</div>
            <div style={{
              fontSize: '13px',
              lineHeight: 1.75,
              color: 'rgba(245,238,232,0.62)',
              marginBottom: '24px',
            }}>
              An unexpected error occurred. We've been notified. Try reloading
              the page — if the problem persists, head home.
            </div>

            {isDev && (
              <pre style={{
                textAlign: 'left',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: 'rgba(245,238,232,0.55)',
                background: 'rgba(245,238,232,0.04)',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '24px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '240px',
                overflow: 'auto',
              }}>{this.state.error.message}{'\n'}{this.state.error.stack}</pre>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: '#C93060',
                  color: '#F5EEE8',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >Reload</button>
              <button
                onClick={this.handleHome}
                style={{
                  background: 'transparent',
                  color: 'rgba(245,238,232,0.65)',
                  border: '1px solid rgba(245,238,232,0.18)',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >Go home</button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
