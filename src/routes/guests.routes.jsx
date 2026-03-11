import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { GuestLayout } from '../layout/GuestLayout'
import { useAuth } from '../contexts/AuthContext'
import { Login } from '../pages/auth/Login'
import { Signup } from '../pages/auth/Signup'
import { SignupSuccess } from '../pages/auth/SignupSuccess'
import { ForgotPassword } from '../pages/auth/ForgotPassword'

/**
 * Wrapper for guest-only routes (login, signup, forgot-password).
 * If user is logged in and role is customer, redirect to /home.
 * Other roles can be extended later for their respective home routes.
 */
function GuestOnlyOutlet() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading…</p>
      </div>
    )
  }

  if (user) {
    const role = user?.role?.type ?? user?.role
    if (role === 'customer') {
      return <Navigate to="/home" state={{ from: location }} replace />
    }
    // Future: redirect other roles to their home, e.g. admin -> /admin
    return <Navigate to="/home" state={{ from: location }} replace />
  }

  return <Outlet />
}

/**
 * Guest routes: auth pages under GuestLayout, only accessible when not logged in.
 */
export const guestRoutes = [
  {
    path: '/',
    element: <GuestLayout />,
    children: [
      {
        element: <GuestOnlyOutlet />,
        children: [
          { path: 'login', element: <Login /> },
          { path: 'signup', element: <Signup /> },
          { path: 'signup/success', element: <SignupSuccess /> },
          { path: 'forgot-password', element: <ForgotPassword /> },
        ],
      },
    ],
  },
]
