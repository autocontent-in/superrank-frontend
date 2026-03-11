import { Link } from 'react-router-dom'

export function Error404() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <p className="text-8xl font-bold text-slate-200 select-none">404</p>
      <h1 className="text-xl font-semibold text-slate-800 mt-2">Oops, page ghosted you 👻</h1>
      <p className="text-slate-600 text-sm mt-1 text-center max-w-sm">
        This page dipped. Maybe it never existed. No cap.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
      >
        Take me home
      </Link>
    </div>
  )
}
