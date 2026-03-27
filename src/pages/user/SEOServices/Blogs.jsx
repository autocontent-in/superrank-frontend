import { Link } from 'react-router-dom'

export function Blogs() {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/seo-services" className="text-slate-600 transition-colors hover:text-slate-900">
              SEO Services
            </Link>
            <span className="text-slate-400">{'>'}</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Blogs</h1>
        </div>

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
