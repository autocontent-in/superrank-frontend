import { Link, useLocation } from 'react-router-dom'

export function Blog() {
  const location = useLocation()
  const ctx = location.state?.blogCreateContext

  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        <Link to="/seo-services" className="text-slate-600 hover:text-slate-900 transition-colors">
          SEO Services
        </Link>
        <span className="text-slate-400">{'>'}</span>
        <Link to="/seo-services/blogs" className="text-slate-600 hover:text-slate-900 transition-colors">
          Blogs
        </Link>
        <span className="text-slate-400">{'>'}</span>
      </div>

      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Create Blog</h1>

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

