import { Link } from 'react-router-dom'
import { AuthPageShell } from './AuthPageShell'

export function ForgotPassword() {
  const inputBase =
    'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 hover:border-slate-300'

  return (
    <AuthPageShell>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.65rem] sm:leading-snug">
          Forgot password?
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          No backend yet — this is a placeholder. Use the link below to go back to sign in.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            className={`${inputBase} cursor-not-allowed opacity-60`}
            readOnly
            aria-readonly
          />
        </div>
        <button
          type="button"
          className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-[background-color,box-shadow] hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          disabled
        >
          Send reset link (coming soon)
        </button>
      </div>

      <p className="mt-8 text-center text-sm text-slate-600">
        <Link
          to="/login"
          className="font-semibold text-primary underline-offset-2 hover:text-primary-hover hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </AuthPageShell>
  )
}
