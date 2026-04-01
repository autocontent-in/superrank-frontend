import { Outlet, useLocation } from 'react-router-dom'

/**
 * Layout for guest/auth pages (login, signup, forgot password).
 * Login is full-viewport split layout; other routes use centered card + gradient.
 */
export function GuestLayout() {
  const { pathname } = useLocation()
  const isLogin = pathname === '/login'

  if (isLogin) {
    return (
      <div className="min-h-dvh flex flex-col relative overflow-x-hidden bg-white">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Blurred gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-white" />
        <div
          className="absolute -top-1/4 -left-1/4 w-[80%] h-[80%] rounded-full bg-linear-to-br from-blue-100/80 via-sky-100/60 to-indigo-100/50 blur-3xl opacity-90"
          style={{ filter: 'blur(80px)' }}
        />
        <div
          className="absolute top-1/2 -right-1/4 w-[60%] h-[60%] rounded-full bg-linear-to-bl from-slate-100/70 to-blue-50/60 blur-3xl opacity-80"
          style={{ filter: 'blur(80px)' }}
        />
      </div>
      <main className="flex-1 flex flex-col justify-center relative z-10">
        <div className="flex justify-center items-center py-12 px-4">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
