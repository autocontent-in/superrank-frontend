import { Navigate, Link, useLocation } from 'react-router-dom'
import { BookOpen, CheckCircle } from 'lucide-react'

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
    <div className="w-full max-w-[420px]">
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 text-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
            <BookOpen className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <CheckCircle className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          You’re all set! 🎉
          </h1>
          <p className="text-slate-500 mt-1 mb-6">
            Account created. You&apos;re in! 💫
          </p>
          <Link
            to="/login"
            className="inline-block w-full rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
          >
            Let&apos;s go →
          </Link>
        </div>
      </div>
    </div>
  )
}
