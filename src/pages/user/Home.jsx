import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, CheckCircle2, Smartphone, Timer, XCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useSnackbar } from '../../components/ui/SnackbarProvider'
import AiApi from '../../api/AiApi'
import Api from '../../api/api.jsx'

export function Home() {
  const { user } = useAuth()
  const { showSnackbar, updateSnackbar } = useSnackbar()
  const [seoLoading, setSeoLoading] = useState(false)
  const navigate = useNavigate()

  const company = user?.default_company
  const companyId = company?.id ?? company?.uuid
  const websiteRaw = company?.website || company?.company_website || company?.url || company?.company_url || ''
  const domain = String(websiteRaw || '').replace(/^https?:\/\//i, '').replace(/\/$/, '')
  const companyName = (company?.company_name || company?.name || domain || '').trim() || 'Your business'
  const logoUrl = getLogoUrl(companyName)

  const businessType = getFirstCompanyField(company, ['company_type', 'business_type', 'type', 'businessType', 'industry_type'])
  const industry = getFirstCompanyField(company, ['industry', 'industry_name', 'vertical', 'sector'])
  const productsServices =
    getFirstCompanyField(company, ['products_services', 'products_services_left', 'products', 'services', 'productsAndServices']) ||
    getFirstCompanyField(company, ['products_services_left', 'remaining_products_services']) ||
    '—'

  const [competitors, setCompetitors] = useState([])
  const [competitorsLoading, setCompetitorsLoading] = useState(false)
  const [competitorsError, setCompetitorsError] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!companyId) {
      setCompetitors([])
      setCompetitorsError(null)
      return
    }

    setCompetitorsLoading(true)
    setCompetitorsError(null)
    Api.get(`/companies/${companyId}/competitors`)
      .then((res) => {
        if (cancelled) return
        const list = competitorsListFromResponse(res, companyId)
        setCompetitors(list)
      })
      .catch(() => {
        if (cancelled) return
        setCompetitors([])
        setCompetitorsError('Unable to load competitors')
      })
      .finally(() => {
        if (cancelled) return
        setCompetitorsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [companyId])

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
    <div className="px-4 pt-6 pb-12 sm:pt-6 sm:pb-16 w-full min-h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <BentoCard className="p-0 overflow-hidden md:col-span-2 lg:col-span-4">
            <div className="p-6 pb-4">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div className="min-w-0">
                  <div className="text-xs font-bold tracking-widest text-slate-500">BUSINESS PROFILE</div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      <img src={logoUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-slate-900 truncate">{companyName}</div>
                      {domain?.trim() ? <div className="text-xs text-slate-500 truncate">Domain: {domain}</div> : null}
                    </div>
                  </div>
                </div>

                <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  {domain?.trim() ? 'Ready for audit' : 'Add company website'}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5 rounded-2xl bg-linear-to-br from-lime-200/90 to-emerald-200/90 p-5 border border-emerald-100">
                  <div className="min-w-0">
                    <div className="text-xs font-bold tracking-wide text-emerald-900">Business Profile</div>
                    <div className="mt-2 text-sm font-semibold text-emerald-900 truncate">{companyName}</div>

                    <div className="mt-3 space-y-2 text-[12px] text-emerald-900/80">
                      <InfoLine label="Type" value={formatMaybeList(businessType)} />
                      <InfoLine label="Industry" value={formatMaybeList(industry)} />
                      <InfoLine label="Products/Services left" value={formatMaybeList(productsServices)} />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckSeo}
                    disabled={seoLoading || !domain?.trim()}
                    className="mt-5 w-full rounded-xl bg-white/70 text-emerald-950 px-4 py-2.5 text-sm font-semibold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {seoLoading ? 'Analyzing…' : 'ANALYZE THE RESULTS'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="lg:col-span-7">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">Competitors</h3>
                    {competitors?.length ? (
                      <div className="text-[11px] text-slate-500">
                        Showing {Math.min(competitors.length, MAX_COMPETITORS)} / {competitors.length}
                        {competitorOverflow > 0 ? (
                          <span className="ml-2 text-emerald-700 font-semibold">({competitorOverflow}+ more)</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {competitorsLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <div key={i} className="h-24 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" aria-hidden="true" />
                      ))}
                    </div>
                  ) : competitorsError ? (
                    <p className="text-sm text-slate-400">{competitorsError}</p>
                  ) : visibleCompetitors.length ? (
                    <div className="max-h-72 overflow-y-auto pr-1">
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                        {visibleCompetitors.map((c, idx) => (
                          <CompetitorTile
                            key={c.id ?? `${c.company_name || 'competitor'}-${idx}`}
                            competitor={c}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No competitors found.</p>
                  )}
                </div>
              </div>
            </div>
          </BentoCard>

          <BentoCard className="md:col-span-1 lg:col-span-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">URL Status</h3>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                {domain?.trim() ? 'Live audit' : 'Mock data'}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <SegmentDonut segments={bentoData.urlStatus} />
              <div className="space-y-2">
                {bentoData.urlStatus.map((s) => (
                  <LegendItem key={s.label} label={s.label} color={s.color} percent={s.value} />
                ))}
              </div>
            </div>
          </BentoCard>

          <BentoCard className="md:col-span-1 lg:col-span-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Backlink Trends</h3>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {bentoData.backlinkSummary.newCount} new
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  {bentoData.backlinkSummary.lostCount} lost
                </span>
              </div>
            </div>
            <div className="mt-3">
              <BarTrend bars={bentoData.backlinkBars} />
              <div className="mt-2 text-xs text-slate-500">Last 24 days</div>
            </div>
          </BentoCard>

          <BentoCard className="md:col-span-2 lg:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Coverage Overview</h3>
              <div className="text-[11px] text-slate-500 flex items-center gap-3">
                {bentoData.coverageLegend.map((l) => (
                  <span key={l.label} className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {bentoData.tags.map((t) => (
                <div key={t.label} className="flex flex-col items-center gap-2">
                  <DonutGauge value={t.value} color={t.color} />
                  <div className="text-[11px] font-semibold text-slate-600 text-center leading-tight">{t.label}</div>
                </div>
              ))}
            </div>
          </BentoCard>

          <BentoCard className="md:col-span-1 lg:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Mobile Friendly</h3>
                <p className="text-xs text-slate-500 mt-1">Responsive pass rate</p>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-200">
                <Smartphone className="w-5 h-5 text-emerald-600" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-600">{bentoData.mobileFriendly.okLabel}</div>
                  <div className="text-sm font-bold text-slate-900">{bentoData.mobileFriendly.value}%</div>
                </div>
                <div className="mt-3 h-3 bg-slate-100 rounded-full border border-slate-200 overflow-hidden">
                  <div className="h-full bg-emerald-500/90" style={{ width: `${bentoData.mobileFriendly.value}%` }} />
                </div>
                <div className="mt-2 text-[11px] text-slate-500">Optimized for mobile visitors.</div>
              </div>
            </div>
          </BentoCard>

          <BentoCard className="md:col-span-1 lg:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Website Speed</h3>
                <p className="text-xs text-slate-500 mt-1">Performance snapshot</p>
              </div>
              <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-200">
                <Timer className="w-5 h-5 text-sky-600" />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <SpeedRow icon={<Check className="w-3.5 h-3.5" />} label={bentoData.speed.mobile.label} value={bentoData.speed.mobile.value} color="bg-emerald-500/90" />
              <SpeedRow icon={<XCircle className="w-3.5 h-3.5" />} label={bentoData.speed.desktop.label} value={bentoData.speed.desktop.value} color="bg-amber-500/90" />
            </div>
          </BentoCard>

          <BentoCard className="md:col-span-1 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">The Good Findings</h3>
            </div>
            <ul className="mt-3 space-y-2">
              {bentoData.goodFindings.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-200 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  </span>
                  <span className="text-sm font-semibold text-slate-700">{f}</span>
                </li>
              ))}
            </ul>
          </BentoCard>

          <BentoCard className="md:col-span-1 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">The Bad Findings</h3>
            </div>
            <ul className="mt-3 space-y-2">
              {bentoData.badFindings.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-rose-500/10 border border-rose-200 flex items-center justify-center">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  </span>
                  <span className="text-sm font-semibold text-slate-700">{f}</span>
                </li>
              ))}
            </ul>
          </BentoCard>
        </div>
      </div>
    </div>
  )
}

function BentoCard({ children, className = '' }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>
}

function LegendItem({ label, color, percent }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <span className="text-[12px] font-semibold text-slate-700">{label}</span>
      </div>
      <span className="text-[12px] font-bold text-slate-900">{percent}%</span>
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
        className="absolute rounded-full bg-white border border-slate-100"
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
        className="absolute rounded-full bg-white border border-slate-100 flex items-center justify-center"
        style={{ inset: thickness }}
      >
        <div className="text-[12px] font-extrabold text-slate-900">{pct}%</div>
      </div>
    </div>
  )
}

function BarTrend({ bars }) {
  const max = Math.max(...bars, 1)
  return (
    <div className="h-24 flex items-end gap-1 px-1">
      {bars.map((b, idx) => {
        const h = Math.round((b / max) * 100)
        const isOdd = idx % 2 === 1
        return (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            className={`flex-1 rounded-full ${isOdd ? 'bg-emerald-500/80' : 'bg-rose-500/70'}`}
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">{icon}</span>
          <span className="text-xs font-semibold text-slate-700">{label}</span>
        </div>
        <span className="text-xs font-bold text-slate-900">{value}%</span>
      </div>
      <div className="mt-2 h-2.5 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function InfoLine({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-emerald-900/70 font-semibold">{label}:</span>
      <span className="text-emerald-900/90 text-right min-w-0 truncate">{value || '—'}</span>
    </div>
  )
}

function CompetitorTile({ competitor }) {
  const name = (competitor?.company_name || '').trim() || 'Unknown'
  const href = normalizeWebsiteUrl(competitor?.company_website)
  const logoSrc = getLogoUrl(name)

  const content = (
    <div className="h-24 rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
      <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
        <img src={logoSrc} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold text-slate-800 truncate">{name}</div>
        {href ? (
          <div className="text-[10.5px] text-slate-500 truncate">{href.replace(/^https?:\/\//i, '')}</div>
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
