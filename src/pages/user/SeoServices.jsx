import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
      <div className="flex items-start justify-between gap-4 flex-wrap mt-4">
        <h1 className="text-2xl font-semibold text-slate-900">SEO Services</h1>
      </div>

      <div className="mt-5">
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

