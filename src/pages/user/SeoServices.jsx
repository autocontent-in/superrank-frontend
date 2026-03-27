import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { House } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Api from '../../api/api.jsx'

function ServiceCard({ title, description, onClick }) {
  const titleClassName =
    'cursor-pointer self-start text-left text-base font-semibold text-slate-900 underline decoration-dashed underline-offset-4 decoration-slate-300 transition-colors hover:text-slate-700 hover:decoration-slate-400'

  return (
    <div className="flex h-full w-full flex-col rounded-lg border border-slate-200 bg-white p-5 text-left">
      {onClick ? (
        <button type="button" onClick={onClick} className={titleClassName}>
          {title}
        </button>
      ) : (
        <div className={titleClassName}>{title}</div>
      )}
      <div className="mt-1 text-sm text-slate-600 leading-relaxed">{description}</div>
    </div>
  )
}

export function SeoServices() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const company = user?.default_company
  const companyId = company?.id ?? company?.uuid ?? null

  const [latestBusinessProfile, setLatestBusinessProfile] = useState(null)
  const [loadingLatest, setLoadingLatest] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadLatestProfile() {
      setLoadingLatest(true)
      try {
        const res = await Api.get('/business-profiles/latest')
        if (cancelled) return
        setLatestBusinessProfile(res?.data?.data ?? null)
      } catch (e) {
        if (cancelled) return
        const status = e?.response?.status
        if (status === 404) setLatestBusinessProfile(null)
        else setLatestBusinessProfile(null)
      } finally {
        if (!cancelled) setLoadingLatest(false)
      }
    }
    loadLatestProfile()
    return () => {
      cancelled = true
    }
  }, [])

  const hasBusinessProfile = Boolean(latestBusinessProfile)

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
          <span className="text-sm font-semibold text-slate-800">SEO Services</span>
        </div>
      </div>

      <div className="mx-auto mt-1 w-full max-w-7xl">
        {loadingLatest ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
            Loading…
          </div>
        ) : !hasBusinessProfile ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-600">
            Create a business profile to unlock SEO services.
          </div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ServiceCard
              title="Blogs"
              description="Write a well reserached blog with trending topic, rank on search engines for your niche"
              onClick={() => navigate('/seo-services/blogs')}
            />
            <ServiceCard
              title="Monthly Content Topics"
              description="Clear the chaos with AI. Get your relevant topics"
            />
            <ServiceCard
              title="Content Refresh"
              description="Improve search engine performance by updating your stale content and stay relevant without diving into something new"
            />
          </div>
        )}
      </div>
    </>
  )
}

