import { Navigate, Link, useLocation } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { AuthPageShell } from './AuthPageShell'

/**
 * Shown only after successful signup. Congratulates the user and offers a link to log in.
 * If accessed without coming from signup (e.g. direct URL), redirect to signup.
 */
export function SignupSuccess() {
  const location = useLocation()
  const fromSignup = location.state?.fromSignup === true

  if (!fromSignup) {
    return <Navigate to="/signup" replace />
  }

  return (
    <AuthPageShell>
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
          <CheckCircle className="h-8 w-8 text-primary" strokeWidth={2} aria-hidden />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.65rem] sm:leading-snug">
          You&apos;re all set
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          Your account was created. Sign in to continue.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-[background-color,box-shadow] hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20"
        >
          Go to sign in
        </Link>
      </div>
    </AuthPageShell>
  )
}
