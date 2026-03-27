import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { House } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Api from '../../api/api.jsx'

function ServiceCard({ title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-[box-shadow,border-color] cursor-pointer"
    >
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-600 leading-relaxed">{description}</div>
    </button>
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
          <span className="text-sm font-semibold text-slate-800">SEO Services</span>
        </div>
      </div>

      <div className="mt-1">
        {loadingLatest ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
            Loading…
          </div>
        ) : !hasBusinessProfile ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-600">
            Create a business profile to unlock SEO services.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

