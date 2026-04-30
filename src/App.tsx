import React, { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/authStore'
import AuthGuard from './components/AuthGuard'
import Decline from './pages/Decline'
import NotFound from './pages/NotFound'

// Route-level code splitting. Keeps the initial reader chunk from loading
// editor + dashboard code, and vice versa.
const Reader = lazy(() => import('./pages/Reader'))
const EndPage = lazy(() => import('./pages/EndPage'))
const SignUp = lazy(() => import('./pages/SignUp'))
const SignIn = lazy(() => import('./pages/SignIn'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const UpdatePassword = lazy(() => import('./pages/UpdatePassword'))
const Editor = lazy(() => import('./pages/Editor'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Terms = lazy(() => import('./pages/legal/Terms'))
const Privacy = lazy(() => import('./pages/legal/Privacy'))
const DMCA = lazy(() => import('./pages/legal/DMCA'))
const Notice2257 = lazy(() => import('./pages/legal/Notice2257'))

function RouteFallback(): React.JSX.Element {
  // Intentionally minimal — just a matching background so there's no white flash.
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0E0608',
    }} aria-hidden="true" />
  )
}

function HomeRedirect(): React.JSX.Element {
  const { user, loading } = useAuthStore()
  if (loading) return <></>
  return <Navigate to={user ? '/dashboard' : '/signin'} replace />
}

function App(): React.JSX.Element {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/u/:username/s/:slug" element={<Reader />} />
        <Route path="/u/:username/s/:slug/end" element={<EndPage />} />
        <Route path="/decline" element={<Decline />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/dmca" element={<DMCA />} />
        <Route path="/2257" element={<Notice2257 />} />
        <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
        <Route path="/editor/:storyId" element={<AuthGuard><Editor /></AuthGuard>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default App
