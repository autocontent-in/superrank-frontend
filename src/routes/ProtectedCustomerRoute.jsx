import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Wraps customer routes (pages/user). Renders children only when user is logged in.
 * If not logged in, redirects to /login.
 * If onboarding not complete (is_onboarding_complete === 0), redirects to /onboarding until done.
 * Preserves intended location in state for post-login redirect.
 */
export function ProtectedCustomerRoute() {
  const { user, loading, isOnboardingComplete } = useAuth()
  const location = useLocation()
  const pathname = location.pathname

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isOnboardingComplete && pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  if (isOnboardingComplete && pathname === '/onboarding') {
    return <Navigate to="/home" replace />
  }

  return <Outlet />
}
