import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, CheckCircle2, Smartphone, Timer, X, XCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useSnackbar } from '../../components/ui/SnackbarProvider'
import AiApi from '../../api/AiApi'
import Api from '../../api/api.jsx'

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

  const className =
    `group relative ${overlap && stackIndex > 0 ? '-ml-4' : ''} outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-full`

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
    <div
      className={className}
      style={zStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.zIndex = '50'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.zIndex = String(stackIndex + 1)
      }}
    >
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

  if (errorMessage) {
    return <p className="text-sm text-slate-400">{errorMessage}</p>
  }

  if (!competitors?.length) {
    return null
  }

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
    <div
      className={`flex max-w-md items-center justify-end pl-1 sm:max-w-lg ${expanded ? 'flex-wrap gap-0' : 'flex-nowrap gap-0'} motion-reduce:transition-none`}
    >
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

export function Home() {
  const { user } = useAuth()
  const { showSnackbar, updateSnackbar } = useSnackbar()
  const [seoLoading, setSeoLoading] = useState(false)
  const navigate = useNavigate()

  const company = user?.default_company
  const companyId = company?.id ?? company?.uuid

  const [latestBusinessProfile, setLatestBusinessProfile] = useState(null)
  const [homeDataLoading, setHomeDataLoading] = useState(true)
  const [competitors, setCompetitors] = useState([])
  const [competitorsError, setCompetitorsError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setHomeDataLoading(true)
      setCompetitorsError(null)

      const profilePromise = Api.get('/business-profiles/latest')
      const compPromise = companyId ? Api.get(`/companies/${companyId}/competitors`) : Promise.resolve(null)

      const [bpRes, compRes] = await Promise.allSettled([profilePromise, compPromise])
      if (cancelled) return

      if (bpRes.status === 'fulfilled') {
        const raw = bpRes.value?.data?.data
        setLatestBusinessProfile(raw && typeof raw === 'object' ? raw : null)
      } else {
        setLatestBusinessProfile(null)
      }

      if (companyId) {
        if (compRes.status === 'fulfilled' && compRes.value) {
          const list = competitorsListFromResponse(compRes.value, companyId)
          setCompetitors(list)
        } else if (compRes.status === 'rejected') {
          setCompetitors([])
          setCompetitorsError('Unable to load competitors')
        } else {
          setCompetitors([])
        }
      } else {
        setCompetitors([])
        setCompetitorsError(null)
      }

      if (!cancelled) setHomeDataLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [companyId])

  const { companyName, domain, businessType, industry, productsServices, websiteDisplay } = useMemo(
    () => deriveHomeBusinessDisplay(latestBusinessProfile, company),
    [latestBusinessProfile, company],
  )
  const logoUrl = getLogoUrl(companyName)
  const websiteLinkHref = websiteDisplay?.startsWith('http') ? websiteDisplay : websiteDisplay ? `https://${websiteDisplay}` : ''
  const websiteLinkLabel = websiteDisplay ? websiteDisplay.replace(/^https?:\/\//, '').replace(/^www\./, '') : ''

  const handleCheckSeo = async () => {
    if (!domain?.trim()) {
      showSnackbar({ message: 'No company website set. Add a company with a website first.', variant: 'error', duration: 4000 })
      return
    }
    setSeoLoading(true)
    const toastId = showSnackbar({ message: 'Running SEO audit...', loading: true, duration: 0 })
    try {
      const { data } = await AiApi.post('/api/v1/seo-audit', { data: { domain: domain.trim() } })
      Api.post('/seo-audit/store', { data: { response: data } }).catch(() => {})
      updateSnackbar(toastId, { message: 'SEO audit completed.', variant: 'success', loading: false, duration: 3000 })
      navigate('/website-audit')
    } catch (err) {
      const message = err.response?.data?.detail?.message ?? err.response?.data?.message ?? 'SEO audit failed.'
      updateSnackbar(toastId, { message, variant: 'error', loading: false, duration: 4000 })
    } finally {
      setSeoLoading(false)
    }
  }

  // Bento-style mock data to match the reference dashboard layout.
  const bentoData = useMemo(
    () => ({
      accountTimeline: ['APR 2019', 'MAY 2019', 'JUN 2019', 'JUL 2018'],
      accountMetrics: [
        { label: 'PAGES CRAWLED', value: 500, max: 800 },
        { label: 'PAGES INDEXED', value: 550, max: 800 },
        { label: 'PAGES WITH ORGANIC TRAFFIC', value: 470, max: 800 },
        { label: 'PAGES WITH BACKLINKS', value: 300, max: 800 },
      ],
      urlStatus: [
        { label: 'Live', value: 62, color: '#22c55e' },
        { label: 'Redirected', value: 12, color: '#fbbf24' },
        { label: 'Duplicate', value: 16, color: '#f59e0b' },
        { label: 'Broken', value: 10, color: '#ef4444' },
      ],
      backlinkBars: [6, 8, 5, 9, 7, 10, 8, 7, 9, 11, 10],
      backlinkSummary: { newCount: 75, lostCount: 24 },
      tags: [
        { label: 'Title Tags', value: 48, color: '#22c55e' },
        { label: 'Descriptions', value: 56, color: '#f59e0b' },
        { label: 'H1 Tags', value: 96, color: '#22c55e' },
        { label: 'H2 Tags', value: 23, color: '#ef4444' },
        { label: 'Canonical Tags', value: 78, color: '#22c55e' },
        { label: 'Alt Tags', value: 90, color: '#0ea5e9' },
        { label: 'Hreflang Tags', value: 100, color: '#22c55e' },
        { label: 'Body Content', value: 8, color: '#ef4444' },
      ],
      coverageLegend: [
        { label: 'Duplicate', color: '#ef4444' },
        { label: 'Missing', color: '#fbbf24' },
        { label: 'Resolved', color: '#22c55e' },
      ],
      mobileFriendly: { value: 85, okLabel: 'Mobile friendly' },
      speed: {
        mobile: { value: 85, label: 'Mobile score' },
        desktop: { value: 46, label: 'Desktop score' },
      },
      goodFindings: ['URL Structure', 'XML Sitemap', 'Hreflang Tags'],
      badFindings: ['Thin Content', 'Duplicate Content', 'JavaScript/CSS'],
    }),
    [],
  )

  const MAX_COMPETITORS = 20
  const visibleCompetitors = (competitors || []).slice(0, MAX_COMPETITORS)
  const competitorOverflow = Math.max(0, (competitors || []).length - MAX_COMPETITORS)

  return (
    <div className="w-full min-h-full overflow-x-hidden overflow-y-auto bg-white px-4 pb-12 pt-0 sm:px-6 sm:pb-16 lg:px-8">
      <div className="mx-auto max-w-6xl pt-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {homeDataLoading ? (
              <>
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-slate-200" aria-hidden="true" />
                <div className="min-w-0 space-y-2">
                  <div className="h-6 w-44 max-w-full animate-pulse rounded-md bg-slate-200" />
                  <div className="h-4 w-56 max-w-full animate-pulse rounded-md bg-slate-100" />
                </div>
              </>
            ) : (
              <>
                <img
                  src={logoUrl}
                  alt={`${companyName} logo`}
                  className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover"
                />
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-semibold text-slate-800">{companyName}</h1>
                  {websiteLinkHref ? (
                    <a
                      href={websiteLinkHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 block truncate text-sm text-slate-500 hover:text-slate-700"
                    >
                      {websiteLinkLabel}
                    </a>
                  ) : null}
                </div>
              </>
            )}
          </div>
          <CompetitorAvatarStack competitors={competitors} loading={homeDataLoading} errorMessage={competitorsError} />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 lg:items-stretch">
          <BentoCard unpadded className="overflow-hidden md:col-span-2 lg:col-span-4">
            <div className="p-5 sm:p-6 lg:p-4">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 lg:items-start">
                <div className="lg:col-span-5">
                  <div className="rounded-md border border-emerald-200/80 bg-linear-to-br from-lime-50 to-emerald-50 p-4 sm:p-6">
                    {homeDataLoading ? (
                      <div className="animate-pulse space-y-3" aria-busy="true" aria-label="Loading business profile">
                        <div className="space-y-2">
                          <div className="h-3 w-full rounded-md bg-emerald-900/15" />
                          <div className="h-3 w-full rounded-md bg-emerald-900/15" />
                        </div>
                        <div className="mt-4 h-3 w-36 rounded-md bg-emerald-900/20" />
                        <div className="space-y-2 pt-1">
                          <div className="h-3 w-full rounded-md bg-emerald-900/12" />
                          <div className="h-3 w-5/6 rounded-md bg-emerald-900/12" />
                        </div>
                        <div className="mt-4 h-10 w-full rounded-md bg-white/50" />
                      </div>
                    ) : (
                      <>
                        <div className="text-[12px] text-emerald-900/80">
                          <InfoLine label="Type" value={formatMaybeList(businessType)} />
                          <InfoLine label="Industry" value={formatMaybeList(industry)} />
                        </div>

                          <div className="mt-2 pt-2 border-t border-emerald-200">
                          <h3 className="text-[12px] font-semibold tracking-wide text-emerald-900/65">Products & Services</h3>
                          <p className="mt-2 text-[12px] font-medium leading-relaxed text-emerald-950/90">
                            {formatMaybeList(productsServices)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleCheckSeo}
                          disabled={seoLoading || !domain?.trim()}
                          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-emerald-300/60 bg-white/90 px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {seoLoading ? 'Analyzing…' : 'ANALYZE THE RESULTS'}
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="min-h-0 lg:col-span-7">
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <h2 className="text-sm font-semibold text-slate-900">Competitors</h2>
                  </div>

                  {homeDataLoading ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <div
                          key={i}
                          className="h-22 animate-pulse rounded-md border border-slate-200 bg-slate-50"
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  ) : competitorsError ? (
                    <p className="rounded-md border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">{competitorsError}</p>
                  ) : visibleCompetitors.length ? (
                    <div className="max-h-72 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch]">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                        {visibleCompetitors.map((c, idx) => (
                          <CompetitorTile
                            key={c.id ?? `${c.company_name || 'competitor'}-${idx}`}
                            competitor={c}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
                      No competitors found.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </BentoCard>

          <BentoCard className="flex h-full flex-col md:col-span-1 lg:col-span-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h3 className="text-sm font-semibold leading-tight text-slate-900">URL status</h3>
              <span className="inline-flex w-fit shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
                {domain?.trim() ? 'Live audit' : 'Sample data'}
              </span>
            </div>
            <div className="mt-5 flex flex-1 flex-col items-stretch gap-5 sm:flex-row sm:items-center">
              <div className="flex shrink-0 justify-center sm:justify-start">
                <SegmentDonut segments={bentoData.urlStatus} />
              </div>
              <div className="min-w-0 flex-1 space-y-2.5">
                {bentoData.urlStatus.map((s) => (
                  <LegendItem key={s.label} label={s.label} color={s.color} percent={s.value} />
                ))}
              </div>
            </div>
          </BentoCard>

          <BentoCard className="flex h-full flex-col md:col-span-1 lg:col-span-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <h3 className="text-sm font-semibold leading-tight text-slate-900">Backlink trends</h3>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-sm bg-emerald-500" />
                  {bentoData.backlinkSummary.newCount} new
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-sm bg-rose-500" />
                  {bentoData.backlinkSummary.lostCount} lost
                </span>
              </div>
            </div>
            <div className="mt-5 flex-1">
              <BarTrend bars={bentoData.backlinkBars} />
              <p className="mt-3 text-xs text-slate-500">Last 24 days</p>
            </div>
          </BentoCard>

          <BentoCard className="md:col-span-2 lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Coverage overview</h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
                {bentoData.coverageLegend.map((l) => (
                  <span key={l.label} className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-5">
              {bentoData.tags.map((t) => (
                <div key={t.label} className="flex flex-col items-center gap-2.5">
                  <DonutGauge value={t.value} color={t.color} />
                  <div className="text-center text-[11px] font-medium leading-snug text-slate-600">{t.label}</div>
                </div>
              ))}
            </div>
          </BentoCard>

          <BentoCard className="md:col-span-1 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">Mobile friendly</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Responsive pass rate</p>
              </div>
              <div className="shrink-0 rounded-md border border-emerald-200 bg-emerald-500/10 p-2">
                <Smartphone className="h-5 w-5 text-emerald-600" />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-emerald-500/10">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-medium text-slate-600">{bentoData.mobileFriendly.okLabel}</div>
                  <div className="text-sm font-semibold tabular-nums text-slate-900">{bentoData.mobileFriendly.value}%</div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                  <div className="h-full bg-emerald-500/90" style={{ width: `${bentoData.mobileFriendly.value}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">Optimized for mobile visitors.</p>
              </div>
            </div>
          </BentoCard>

          <BentoCard className="md:col-span-1 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">Website speed</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Performance snapshot</p>
              </div>
              <div className="shrink-0 rounded-md border border-sky-200 bg-sky-500/10 p-2">
                <Timer className="h-5 w-5 text-sky-600" />
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <SpeedRow icon={<Check className="h-3.5 w-3.5" />} label={bentoData.speed.mobile.label} value={bentoData.speed.mobile.value} color="bg-emerald-500/90" />
              <SpeedRow icon={<XCircle className="h-3.5 w-3.5" />} label={bentoData.speed.desktop.label} value={bentoData.speed.desktop.value} color="bg-amber-500/90" />
            </div>
          </BentoCard>

          <BentoCard className="md:col-span-1 lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900">Strengths</h3>
            <ul className="mt-4 space-y-3">
              {bentoData.goodFindings.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-emerald-500/10">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  </span>
                  <span className="text-sm font-medium leading-snug text-slate-700">{f}</span>
                </li>
              ))}
            </ul>
          </BentoCard>

          <BentoCard className="md:col-span-1 lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900">Needs attention</h3>
            <ul className="mt-4 space-y-3">
              {bentoData.badFindings.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-rose-200 bg-rose-500/10">
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  </span>
                  <span className="text-sm font-medium leading-snug text-slate-700">{f}</span>
                </li>
              ))}
            </ul>
          </BentoCard>
        </div>
      </div>
    </div>
  )
}

function BentoCard({ children, className = '', unpadded = false }) {
  return (
    <section
      className={`rounded-md border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] ${unpadded ? '' : 'p-5 sm:p-6'} ${className}`}
    >
      {children}
    </section>
  )
}

function LegendItem({ label, color, percent }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />
        <span className="truncate font-medium text-slate-700">{label}</span>
      </div>
      <span className="shrink-0 font-semibold tabular-nums text-slate-900">{percent}%</span>
    </div>
  )
}

function SegmentDonut({ segments, size = 96, thickness = 12 }) {
  const safeSegments = segments.filter((s) => typeof s?.value === 'number' && s.value > 0)
  const total = safeSegments.reduce((acc, s) => acc + s.value, 0) || 1
  let current = 0
  const gradient = safeSegments
    .map((s) => {
      const start = (current / total) * 100
      current += s.value
      const end = (current / total) * 100
      return `${s.color} ${start}% ${end}%`
    })
    .join(', ')

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          backgroundImage: `conic-gradient(${gradient})`,
        }}
      />
      <div
        className="absolute rounded-full border border-slate-100 bg-white"
        style={{
          inset: thickness,
        }}
      />
    </div>
  )
}

function DonutGauge({ value, color, size = 76, thickness = 10 }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  const bg = '#e2e8f0'
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          backgroundImage: `conic-gradient(${color} ${pct}%, ${bg} 0)`,
        }}
      />
      <div
        className="absolute flex items-center justify-center rounded-full border border-slate-100 bg-white"
        style={{ inset: thickness }}
      >
        <div className="text-xs font-semibold tabular-nums text-slate-900">{pct}%</div>
      </div>
    </div>
  )
}

function BarTrend({ bars }) {
  const max = Math.max(...bars, 1)
  return (
    <div className="flex h-24 items-end gap-1 px-0.5">
      {bars.map((b, idx) => {
        const h = Math.round((b / max) * 100)
        const isOdd = idx % 2 === 1
        return (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            className={`min-h-[8%] flex-1 rounded-sm ${isOdd ? 'bg-emerald-500/85' : 'bg-rose-500/75'}`}
            style={{ height: `${Math.max(8, h)}%` }}
          />
        )
      })}
    </div>
  )
}

function SpeedRow({ icon, label, value, color }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50">{icon}</span>
          <span className="truncate text-xs font-medium text-slate-700">{label}</span>
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-900">{value}%</span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function InfoLine({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-emerald-200 py-2 last:border-0 last:pb-0 first:pt-0">
      <span className="shrink-0 text-[12px] font-medium text-emerald-900/65">{label}</span>
      <span className="min-w-0 text-right text-[12px] font-medium text-emerald-950/90">{value || '—'}</span>
    </div>
  )
}

function CompetitorTile({ competitor }) {
  const name = (competitor?.company_name || '').trim() || 'Unknown'
  const href = normalizeWebsiteUrl(competitor?.company_website)
  const logoSrc = getLogoUrl(name)

  const content = (
    <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-2 transition-colors hover:border-slate-300 hover:bg-slate-50/80">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md">
        <img src={logoSrc} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[12px] font-semibold text-slate-800">{name}</div>
        {href ? (
          <div className="truncate text-[10.5px] text-slate-500">{href.replace(/^https?:\/\//i, '')}</div>
        ) : (
          <div className="text-[10.5px] text-slate-400">No site</div>
        )}
      </div>
    </div>
  )

  if (!href) return content

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block" aria-label={`Open competitor ${name}`}>
      {content}
    </a>
  )
}

function normalizeWebsiteUrl(raw) {
  if (!raw || typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t || t === '-') return null
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t}`
}

function getLogoUrl(name) {
  const token = import.meta.env.VITE_LOGO_DEV_PUBLIC_KEY
  if (token && name) return `https://img.logo.dev/name/${encodeURIComponent(name)}?token=${token}`
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name ?? '')}&background=6366f1&color=fff&size=80`
}

function getFirstCompanyField(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined
  for (const k of keys) {
    const v = obj?.[k]
    if (v == null) continue
    if (typeof v === 'string' && !v.trim()) continue
    if (Array.isArray(v) && v.length === 0) continue
    return v
  }
  return undefined
}

function formatMaybeList(value) {
  if (value == null) return '—'
  if (Array.isArray(value)) return value.filter(Boolean).join(', ')
  const s = String(value).trim()
  if (!s) return '—'
  return s
}

/** Merge GET /business-profiles/latest with default company (same shape as BusinessProfile / NewBlog). */
function deriveHomeBusinessDisplay(bp, company) {
  const ci = bp?.company_info && typeof bp.company_info === 'object' ? bp.company_info : null

  const fromBpWebsite = bp?.website != null ? String(bp.website).trim() : ''
  const websiteRaw =
    fromBpWebsite ||
    company?.website ||
    company?.company_website ||
    company?.url ||
    company?.company_url ||
    ''
  const domain = String(websiteRaw || '').replace(/^https?:\/\//i, '').replace(/\/$/, '')

  const fromBpName = bp?.company_name != null ? String(bp.company_name).trim() : ''
  const companyName =
    fromBpName ||
    String(company?.company_name || company?.name || domain || '')
      .trim()
      .replace(/\s+/g, ' ') || 'Your business'

  const businessType =
    (ci?.company_type != null && String(ci.company_type).trim()) ||
    getFirstCompanyField(company, ['company_type', 'business_type', 'type', 'businessType', 'industry_type'])

  const industry =
    (ci?.industry != null && String(ci.industry).trim()) ||
    getFirstCompanyField(company, ['industry', 'industry_name', 'vertical', 'sector'])

  const pc = ci?.product_category != null ? String(ci.product_category).trim() : ''
  const sp = ci?.services_provided != null ? String(ci.services_provided).trim() : ''
  const kw = ci?.key_keywords != null ? String(ci.key_keywords).trim() : ''
  const productsFromBp = [pc, sp].filter(Boolean).join(' · ') || (kw ? kw : '')
  const productsServices =
    productsFromBp ||
    getFirstCompanyField(company, ['products_services', 'products_services_left', 'products', 'services', 'productsAndServices']) ||
    getFirstCompanyField(company, ['products_services_left', 'remaining_products_services']) ||
    '—'

  const rawTrimmed = String(websiteRaw || '').trim()
  let websiteDisplay = ''
  if (rawTrimmed) {
    websiteDisplay = /^https?:\/\//i.test(rawTrimmed) ? rawTrimmed : `https://${rawTrimmed.replace(/^\/\//, '')}`
  } else if (domain) {
    websiteDisplay = `https://${domain}`
  }

  return { companyName, domain, businessType, industry, productsServices, websiteDisplay }
}

/** Normalize GET /companies/:id/competitors — `data` may be one object or a list of company rows. */
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
