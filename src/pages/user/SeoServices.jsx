import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Api from '../../api/api.jsx'

function getLogoUrl(name) {
  const token = import.meta.env.VITE_LOGO_DEV_PUBLIC_KEY
  if (token && name) return `https://img.logo.dev/name/${encodeURIComponent(name)}?token=${token}`
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name ?? '')}&background=6366f1&color=fff&size=80`
}

function normalizeWebsiteUrl(raw) {
  if (!raw || typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t || t === '-') return null
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t}`
}

function initialsFromCompanyName(name) {
  const s = (name || '').trim()
  if (!s) return '?'
  const words = s.split(/[\s._-]+/).filter(Boolean)
  if (words.length >= 2) {
    const a = words[0].match(/[a-zA-Z0-9]/)
    const b = words[1].match(/[a-zA-Z0-9]/)
    const pair = `${a ? a[0] : ''}${b ? b[0] : ''}`.toUpperCase()
    if (pair) return pair
  }
  const alnum = s.replace(/[^a-zA-Z0-9]/g, '')
  if (alnum.length >= 2) return alnum.slice(0, 2).toUpperCase()
  return s.slice(0, 2).toUpperCase()
}

function competitorsListFromResponse(res, companyId) {
  const d = res?.data?.data
  if (!d) return []
  if (Array.isArray(d)) {
    const match = companyId != null ? d.find((row) => String(row?.id) === String(companyId)) : null
    const row = match ?? d[0]
    return Array.isArray(row?.competitors) ? row.competitors : []
  }
  if (typeof d === 'object' && Array.isArray(d.competitors)) return d.competitors
  return []
}

const COMPETITOR_STACK_MAX_VISIBLE = 5
const COMPETITOR_STACK_TRANSITION =
  'transition-[margin,width,min-width,max-width,opacity,transform] duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0'

function CompetitorAvatarItem({ competitor, stackIndex, overlap = true }) {
  const [imgFailed, setImgFailed] = useState(false)
  const name = (competitor.company_name || '').trim() || 'Unknown'
  const href = normalizeWebsiteUrl(competitor.company_website)
  const logoSrc = getLogoUrl(name)
  const initials = initialsFromCompanyName(name)

  const hoverMotion = overlap ? 'group-hover:-translate-x-2' : 'group-hover:scale-105'

  const avatar = (
    <div
      className={`relative h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm transition-transform duration-200 ease-out ${hoverMotion}`}
    >
      {!imgFailed ? (
        <img src={logoSrc} alt="" className="h-full w-full object-cover" onError={() => setImgFailed(true)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-orange-500 px-0.5 text-center text-[10px] font-semibold leading-tight text-white">
          {initials}
        </div>
      )}
    </div>
  )

  const tooltip = (
    <span className="pointer-events-none absolute top-[calc(100%+40px)] left-1/2 z-60 -translate-x-2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
      {name}
    </span>
  )

  const className = `group relative ${overlap && stackIndex > 0 ? '-ml-4' : ''} outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-full`
  const zStyle = overlap ? { zIndex: stackIndex + 1 } : undefined

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={zStyle}>
        {avatar}
        {tooltip}
      </a>
    )
  }
  return (
    <div className={className} style={zStyle}>
      {avatar}
      {tooltip}
    </div>
  )
}

function CompetitorAvatarStack({ competitors, loading, errorMessage }) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setExpanded(false)
  }, [competitors])

  if (loading) {
    return (
      <div className="flex items-center pl-1" aria-busy="true" aria-label="Loading competitors">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-10 w-10 shrink-0 rounded-full border-2 border-white bg-slate-200 animate-pulse ${i > 0 ? '-ml-3' : ''}`}
            style={{ zIndex: i + 1 }}
          />
        ))}
      </div>
    )
  }
  if (errorMessage) return <p className="text-sm text-slate-400">{errorMessage}</p>
  if (!competitors?.length) return null

  const overflow = Math.max(0, competitors.length - COMPETITOR_STACK_MAX_VISIBLE)

  if (overflow === 0) {
    return (
      <div className="flex items-center pl-1">
        {competitors.map((c, i) => (
          <CompetitorAvatarItem key={c.id ?? `${c.company_name}-${i}`} competitor={c} stackIndex={i} overlap />
        ))}
      </div>
    )
  }

  return (
    <div className={`flex max-w-md items-center justify-end pl-1 sm:max-w-lg ${expanded ? 'flex-wrap gap-0' : 'flex-nowrap gap-0'} motion-reduce:transition-none`}>
      {competitors.map((c, i) => {
        const inCollapsedStack = i < COMPETITOR_STACK_MAX_VISIBLE
        return (
          <div
            key={c.id ?? `${c.company_name}-${i}`}
            className={[
              'shrink-0 rounded-full',
              COMPETITOR_STACK_TRANSITION,
              expanded
                ? 'ml-0 w-10 min-w-10 max-w-10 overflow-visible opacity-100 scale-100'
                : inCollapsedStack
                  ? `min-w-10 max-w-10 w-10 overflow-visible opacity-100 scale-100 ${i > 0 ? '-ml-4' : ''}`
                  : 'ml-0 max-h-10 min-h-10 min-w-0 max-w-0 w-0 overflow-hidden opacity-0 scale-90 pointer-events-none',
            ].join(' ')}
            style={{ zIndex: expanded ? undefined : inCollapsedStack ? i + 1 : 0 }}
          >
            <CompetitorAvatarItem competitor={c} stackIndex={0} overlap={false} />
          </div>
        )
      })}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={[
          'relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-slate-200 text-slate-700 shadow-sm',
          'transition-[margin,opacity,background-color] duration-300 ease-out hover:bg-slate-300 motion-reduce:transition-none motion-reduce:duration-0',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
          expanded ? 'ml-0' : '-ml-4',
        ].join(' ')}
        style={{ zIndex: expanded ? competitors.length + 2 : COMPETITOR_STACK_MAX_VISIBLE + 1 }}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse competitors list' : `Show ${overflow} more competitors`}
      >
        <span
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ease-out ${expanded ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
          aria-hidden={expanded}
        >
          <span className="text-sm font-semibold">+{overflow}</span>
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ease-out ${expanded ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          aria-hidden={!expanded}
        >
          <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </span>
      </button>
    </div>
  )
}

function ServiceCard({ title, description }) {
  return (
    <button
      type="button"
      className="w-full text-left rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-[box-shadow,border-color] cursor-pointer"
    >
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-600 leading-relaxed">{description}</div>
    </button>
  )
}

export function SeoServices() {
  const { user } = useAuth()
  const company = user?.default_company
  const companyId = company?.id ?? company?.uuid ?? null
  const companyName = (company?.company_name || company?.name || '').trim() || '—'
  const website = (company?.website || company?.company_website || '').trim()
  const websiteHref = website ? (website.startsWith('http') ? website : `https://${website}`) : ''
  const websiteDisplay = website ? website.replace(/^https?:\/\//, '').replace(/^www\./, '') : ''
  const logoUrl = getLogoUrl(companyName)

  const [competitors, setCompetitors] = useState([])
  const [competitorsLoading, setCompetitorsLoading] = useState(false)
  const [competitorsError, setCompetitorsError] = useState(null)

  const [latestBusinessProfile, setLatestBusinessProfile] = useState(null)
  const [loadingLatest, setLoadingLatest] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadCompetitors() {
      if (!companyId) {
        setCompetitors([])
        setCompetitorsError(null)
        setCompetitorsLoading(false)
        return
      }
      setCompetitorsLoading(true)
      setCompetitorsError(null)
      try {
        const res = await Api.get(`/companies/${companyId}/competitors`)
        if (cancelled) return
        setCompetitors(competitorsListFromResponse(res, companyId))
      } catch {
        if (!cancelled) {
          setCompetitors([])
          setCompetitorsError('Unable to load competitors')
        }
      } finally {
        if (!cancelled) setCompetitorsLoading(false)
      }
    }
    loadCompetitors()
    return () => {
      cancelled = true
    }
  }, [companyId])

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
    <div className="px-4 pt-6 pb-12 sm:pt-6 sm:pb-16 w-full min-h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={logoUrl}
              alt={`${companyName} logo`}
              className="w-12 h-12 rounded-lg object-cover shrink-0 bg-slate-100 border border-slate-200"
            />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-slate-800 truncate">{companyName}</h1>
              {websiteDisplay ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-500 hover:text-slate-700 truncate block"
                >
                  {websiteDisplay}
                </a>
              ) : null}
            </div>
          </div>
          <CompetitorAvatarStack competitors={competitors} loading={competitorsLoading} errorMessage={competitorsError} />
        </div>

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
                title="Create a Blog"
                description="Write a well reserached blog with trending topic, rank on search engines for your niche"
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
      </div>
    </div>
  )
}

