import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import GateShell from './GateShell'

const LOADING_TEXT = 'Loading…'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps): React.JSX.Element {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <GateShell>
        <div style={{ color: 'rgba(245,238,232,0.45)', fontSize: '13px' }}>{LOADING_TEXT}</div>
      </GateShell>
    )
  }

  if (!user) {
    return <Navigate to="/signin" replace />
  }

  return <>{children}</>
}
