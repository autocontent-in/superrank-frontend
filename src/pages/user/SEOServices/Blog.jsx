import { Link, useLocation } from 'react-router-dom'
import { House } from 'lucide-react'

export function Blog() {
  const location = useLocation()
  const ctx = location.state?.blogCreateContext

  return (
    <>
      <div className="sticky top-0 z-20 mb-4 flex h-14 w-full min-w-0 shrink-0 items-center border-b border-slate-200 bg-white">
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
          <Link to="/seo-services/blogs" className="text-sm font-medium text-slate-600 hover:text-slate-800 shrink-0">
            Blogs
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-sm font-semibold text-slate-800 truncate">Create Blog</span>
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-slate-900">Create Blog</h1>

      {ctx ? (
        <p className="mt-2 text-sm text-slate-600">
          Context from your business profile and competitors is ready for the editor (coming soon).
        </p>
      ) : null}

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
        Blog editor coming soon.
      </div>
    </>
  )
}

