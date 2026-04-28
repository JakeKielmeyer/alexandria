import React from 'react'

interface GateShellProps {
  children: React.ReactNode
}

export default function GateShell({ children }: GateShellProps): React.JSX.Element {
  return (
    <div className="fluid-shell fluid-shell--gate">
      {/* Background texture */}
      <div className="fluid-shell__texture" aria-hidden="true" />
      <div className="fluid-shell__overlay" aria-hidden="true" />
      {/* Content */}
      <div className="fluid-shell__content">
        {children}
      </div>
    </div>
  )
}
