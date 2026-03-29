import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Api from '../../../api/api.jsx'

function blogDisplayTitle(b) {
  if (!b || typeof b !== 'object') return 'Blog'
  const t = b.title != null ? String(b.title).trim() : ''
  if (t) return t
  const st = b.selected_topic
  if (st && typeof st === 'object' && st.topic != null) return String(st.topic).trim() || 'Blog'
  return 'Blog'
}

export function BlogView() {
  const { blogId } = useParams()
  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!blogId) {
      setLoading(false)
      setError('Missing blog id')
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    Api.get(`/blogs/${encodeURIComponent(blogId)}`)
      .then((res) => {
        if (cancelled) return
        const d = res?.data?.data ?? res?.data
        setBlog(d && typeof d === 'object' ? d : null)
      })
      .catch(() => {
        if (!cancelled) {
          setBlog(null)
          setError('Unable to load this blog.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [blogId])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center px-4 py-10">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    )
  }

  if (error || !blog) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm text-slate-600">{error || 'Blog not found.'}</p>
        <Link to="/services/blogs" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-800">
          Back to blogs
        </Link>
      </div>
    )
  }

  const title = blogDisplayTitle(blog)
  const html = blog.content != null ? String(blog.content) : ''

  return (
    <div className="w-full max-w-4xl px-4 py-6">
      <Link to="/services/blogs" className="text-sm font-medium text-blue-600 hover:text-blue-800">
        ← Blogs
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">{title}</h1>
      {html ? (
        <div
          className="blog-view-html mt-6 text-slate-800 [&_a]:text-blue-600 [&_a]:underline [&_h1]:text-xl [&_h2]:text-lg [&_img]:max-w-full [&_p]:my-3"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="mt-6 text-sm text-slate-500">No content.</p>
      )}
    </div>
  )
}
