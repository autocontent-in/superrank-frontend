import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, BookOpen, Plus } from 'lucide-react'
import Api from '../../../api/api.jsx'

function blogDisplayTitle(b) {
  if (!b || typeof b !== 'object') return 'Blog'
  const t = b.title != null ? String(b.title).trim() : ''
  if (t) return t
  const st = b.selected_topic
  if (st && typeof st === 'object' && st.topic != null) return String(st.topic).trim() || 'Blog'
  return 'Blog'
}

export function Blogs() {
  const [blogs, setBlogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const refetch = () => {
    setIsLoading(true)
    Api.get('/blogs')
      .then((response) => {
        const data = response?.data?.data
        setBlogs(Array.isArray(data) ? data : [])
      })
      .catch(() => setBlogs([]))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    refetch()
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-full w-full items-center justify-center overflow-y-auto px-4 py-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">Loading blogs…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full w-full overflow-y-auto px-4 py-6">
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <div className="max-w-full">
        {blogs.length === 0 ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4 animate-[fadeIn_0.4s_ease-out_both]">
              <BookOpen className="h-12 w-12 shrink-0 text-slate-300" strokeWidth={1.5} />
              <p className="text-base text-slate-500">No blogs yet.</p>
              <Link
                to="/services/blogs/new"
                className="flex items-center space-x-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Plus className="h-4 w-4 text-gray-500" />
                <span>Create new</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {blogs
              .map((blog) => {
                const id = blog?.id ?? blog?.uuid
                if (id == null) return null
                const title = blogDisplayTitle(blog)
                return (
                  <Link
                    key={String(id)}
                    to={`/services/blogs/${encodeURIComponent(String(id))}`}
                    className="group flex flex-col gap-2 text-center"
                  >
                    <div className="relative flex aspect-square items-center justify-center rounded-lg border border-slate-200 bg-white transition-colors group-hover:border-blue-300 group-hover:bg-blue-50/50">
                      <BookOpen className="pointer-events-none h-10 w-10 shrink-0 text-slate-500" aria-hidden />
                    </div>
                    <span className="-mt-1 line-clamp-2 text-sm font-semibold text-slate-800">{title}</span>
                  </Link>
                )
              })
              .filter(Boolean)}
          </div>
        )}
      </div>
    </div>
  )
}
