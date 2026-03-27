import { Link } from 'react-router-dom'
import { House } from 'lucide-react'

export function Blogs() {
  return (
    <>
      <div className="sticky top-0 z-20 -mx-4 mb-4 flex h-14 items-center border-b border-slate-200 bg-white px-4 sm:-mx-6 sm:px-6">
        <div className="flex items-center h-9 min-w-0 gap-1.5">
          <Link
            to="/"
            className="flex items-center text-slate-500 hover:text-slate-800 transition-colors shrink-0"
            title="Home"
          >
            <House className="w-4 h-4" />
          </Link>
          <span className="text-slate-400">/</span>
          <Link to="/seo-services" className="text-sm font-medium text-slate-600 hover:text-slate-800 shrink-0">
            SEO Services
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-sm font-semibold text-slate-800">Blogs</span>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <Link
          to="/seo-services/blogs/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          + Create
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
        No blogs yet.
      </div>
    </>
  )
}
