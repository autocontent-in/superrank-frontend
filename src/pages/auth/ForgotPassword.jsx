import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'

export function ForgotPassword() {
  const inputBase =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

  return (
    <div className="w-full max-w-[420px]">
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
            <BookOpen className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Forgot password?
          </h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            No backend yet — this is a placeholder. Use the link below to go back.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              className={`${inputBase} opacity-60 cursor-not-allowed`}
              readOnly
              aria-readonly
            />
          </div>
          <button
            type="button"
            className="w-full rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold opacity-60 cursor-not-allowed"
            disabled
          >
            Send reset link (coming soon)
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        <Link
          to="/login"
          className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          ← Back to log in
        </Link>
      </p>
    </div>
  )
}
