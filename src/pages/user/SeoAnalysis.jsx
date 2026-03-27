import { useState, useMemo, Fragment, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, ChevronRight, ChevronUp, CircleCheck, CircleX, Cross, House, Info, Minus, RefreshCcw, Search, TriangleAlert, X } from 'lucide-react'
import AiApi from '../../api/AiApi'
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

const COMPETITOR_STACK_MAX_VISIBLE = 5

const COMPETITOR_STACK_TRANSITION =
  'transition-[margin,width,min-width,max-width,opacity,transform] duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0'

function CompetitorAvatarItem({ competitor, stackIndex, overlap = true }) {
  const [imgFailed, setImgFailed] = useState(false)
  const name = (competitor.company_name || '').trim() || 'Unknown'
  const href = normalizeWebsiteUrl(competitor.company_website)
  const logoSrc = getLogoUrl(name)
  const initials = initialsFromCompanyName(name)

  const hoverMotion = overlap
    ? 'group-hover:-translate-x-2'
    : 'group-hover:scale-105'

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
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={zStyle}
      >
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
        e.currentTarget.style.zIndex = 50
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.zIndex = stackIndex + 1
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

// Circular gauge component
function MetricCard({ label, value, max, descriptor, colorClass, isPercent = false }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0
  const display = isPercent ? `${value}%` : value
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col items-center">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-slate-200"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
          />
          <path
            className={colorClass}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={`${pct} 100`}
            strokeLinecap="round"
            fill="none"
            d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
          />
        </svg>
        <span className="absolute text-lg font-bold text-slate-800">{display}</span>
      </div>
      <p className="text-xs font-medium text-slate-600 mt-2 text-center">{label}</p>
      <p className="text-xs text-slate-500">{descriptor}</p>
      <button type="button" className="mt-1.5 rounded-full w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="Info">
        <Info className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function HalfSizeMetricCard({ label, value, max, descriptor, colorClass, isPercent = false }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0
  const display = isPercent ? `${value}%` : value
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-4 flex space-x-4 items-center h-full min-h-0">
      <div className="relative flex items-center justify-center">
        <svg className="w-16 h-16" viewBox="0 0 36 36">
          <path
            className="text-slate-200"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
          />
          <path
            className={colorClass}
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${pct} 100`}
            strokeLinecap="round"
            fill="none"
            d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
          />
        </svg>
        {/* <span className="absolute text-sm font-bold text-slate-800">{display}</span> */}
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-slate-600 text-center">{label}</p>
        <p className="text-base font-semibold text-slate-600"><span className="text-slate-800">{value}</span> / <span className="text-slate-500">{max}</span></p>
        <p className="text-xs text-slate-500">{descriptor}</p>
      </div>
    </div>
  )
}

function FullSizeMetricCard({ label, value, max, descriptor, colorClass, isPercent = false }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0
  const display = isPercent ? `${value}%` : value
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center flex-1 min-h-0 w-full py-4">
      <p className="text-sm font-medium text-slate-600 text-center">{label}</p>
      <div className="my-4 relative w-30 h-30 flex items-center justify-center shrink-0">
        <svg className="w-30 h-30" viewBox="0 0 36 36">
          <path
            className="text-slate-200"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
          />
          <path
            className={colorClass}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={`${pct} 100`}
            strokeLinecap="round"
            fill="none"
            d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
          />
        </svg>
        <span className="absolute text-4xl font-bold text-slate-800">{display}</span>
      </div>
      <p className="text-xs text-slate-500">{descriptor}</p>
    </div>
  )
}

// --- Technical SEO Audit (new dashboard) ---
const S = {
  pass: { label: 'Pass', bg: '#f0fdf4', text: '#15803d', border: '#86efac', icon: Check, dot: '#22c55e' },
  warn: { label: 'Warning', bg: '#fffbeb', text: '#92400e', border: '#fcd34d', icon: TriangleAlert, dot: '#f59e0b' },
  fail: { label: 'Error', bg: '#fef2f2', text: '#991b1b', border: '#fca5a5', icon: X, dot: '#ef4444' },
  info: { label: 'Info', bg: '#eff6ff', text: '#1e40af', border: '#93c5fd', icon: Info, dot: '#3b82f6' },
}
const CAT_ORDER = ['Meta Information', 'Page Quality', 'Page Structure', 'Links', 'Server Configurations', 'External Factors', 'Elements']
const CHECKS_SIDEBAR_CATS = ['Meta Information', 'Page Quality', 'Page Structure', 'Links', 'Server Configurations', 'External Factors']
const ELEMENTS_SIDEBAR_SECTIONS = [
  { id: 'heading', label: 'Heading structure' },
  { id: 'paragraphs', label: 'Recognized text paragraphs' },
  { id: 'typos', label: 'Typos' },
  { id: 'bold', label: 'Bold and strong tags' },
  { id: 'media', label: 'Media files' },
  { id: 'meta', label: 'Meta tags' },
  { id: 'internal', label: 'Outgoing internal links' },
  { id: 'external', label: 'External links' },
  { id: 'keywords', label: 'Most important keywords' },
]

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0)
const shortPath = (url) => { try { return new URL(url).pathname || '/' } catch { return url } }

function AuditScoreRing({ score, size = 120, stroke = 8 }) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'
  const cx = size / 2
  const cy = size / 2
  return (
    <div className="mx-auto" style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dasharray .8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="text-3xl font-bold text-slate-600">{score}</span>
      </div>
    </div>
  )
}

function CatCard({ cs, onClick, active }) {
  const total = cs.good + cs.warning + cs.error
  return (
    <div
      className="flex h-full flex-col rounded-lg border border-slate-300 bg-white p-3 shadow-xs"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{cs.name}</span>
        <span
          className={`text-xs font-semibold ${cs.pct >= 80 ? 'text-emerald-700' : cs.pct >= 50 ? 'text-amber-700' : 'text-red-700'
            }`}
        >
          {cs.pct}%
        </span>
      </div>
      <div className="mt-auto w-full">
        <div className="my-2 flex h-1.5 overflow-hidden rounded bg-slate-100">
          <div style={{ width: `${pct(cs.good, total)}%`, background: '#22c55e' }} />
          <div style={{ width: `${pct(cs.warning, total)}%`, background: '#f59e0b' }} />
          <div style={{ width: `${pct(cs.error, total)}%`, background: '#ef4444' }} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[0.7rem]">
          {cs.error > 0 && <span className="text-red-600 flex items-center space-x-0.5"><X className="w-3.5 h-3.5" /> <span>{cs.error}</span></span>}
          {cs.warning > 0 && <span className="text-amber-600 flex items-center space-x-0.5"><TriangleAlert className="w-3.5 h-3.5" /> <span>{cs.warning}</span></span>}
          {cs.good > 0 && <span className="text-emerald-600 flex items-center space-x-0.5"><Check className="w-3.5 h-3.5" /> <span>{cs.good}</span></span>}
          <span className="ml-auto text-slate-500">{cs.total} checks</span>
        </div>
      </div>
    </div>
  )
}

function TasksPanel({ tasks }) {
  if (!tasks?.length) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        No issues found — everything looks great!
      </p>
    )
  }
  const errors = tasks.filter((t) => t.importance === 'Error')
  const warns = tasks.filter((t) => t.importance === 'Warning')
  return (
    <div className="overflow-hidden bg-white">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
            <th className="px-4 py-2">To do</th>
            <th className="px-4 py-2">Importance</th>
          </tr>
        </thead>
        <tbody>
          {[...errors, ...warns].map((t, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="px-4 py-2 text-slate-800">{t.title}</td>
              <td className="px-4 py-2">
                <span
                  className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${t.importance === 'Error'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-amber-50 text-amber-700'
                    }`}
                >
                  {t.importance}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OverviewPanel({ overview }) {
  if (!overview) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Overview available in Single page mode only.
      </p>
    )
  }
  const rows = [
    ['Meta title', overview.meta_title],
    ['Meta description', overview.meta_description],
    ['URL', overview.url],
    ['Status code', overview.status_code],
    ['Page status', `${overview.follow ? 'Follow' : 'Nofollow'}, ${overview.indexable ? 'Index' : 'Noindex'}`],
    ['Language', overview.language],
    ['Response time', `${overview.response_time_ms} ms`],
    ['File size', `${overview.file_size_kb} kB`],
    ['Word count', overview.word_count],
  ]
  return (
    <Fragment>
      <div className="mt-2 mb-4 w-full space-y-4">
        <div
          className="flex flex-col"
        >
          <span className="text-slate-500">{rows[0][0]}</span>
          <span className="text-slate-900">{String(rows[0][1] ?? '—')}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-500">{rows[1][0]}</span>
          <span className="text-slate-900">{String(rows[1][1] ?? '—')}</span>
        </div>
        <div className="flex space-x-2 items-center">
          <span className="text-slate-500">{rows[2][0]}: </span>
          <span className="text-slate-900">{String(rows[2][1] ?? '—')}</span>
        </div>

        <hr className="my-10 border-slate-200" />

        <div className="flex">
          <div className="w-1/2 space-y-4">
            <div className="grid grid-cols-[max-content,1fr] items-baseline gap-x-2">
              <span className="text-slate-500">{rows[3][0]}:</span>
              <span className="text-slate-900">{String(rows[3][1] ?? '—')}</span>
            </div>
            <div className="grid grid-cols-[max-content,1fr] items-baseline gap-x-2">
              <span className="text-slate-500">{rows[4][0]}:</span>
              <span className="text-slate-900">{String(rows[4][1] ?? '—')}</span>
            </div>
            <div className="grid grid-cols-[max-content,1fr] items-baseline gap-x-2">
              <span className="text-slate-500">{rows[5][0]}:</span>
              <span className="text-slate-900">{String(rows[5][1] ?? '—')}</span>
            </div>
          </div>
          <div className="w-1/2 space-y-4">
            <div className="grid grid-cols-[max-content,1fr] items-baseline gap-x-2">
              <span className="text-slate-500">{rows[6][0]}:</span>
              <span className="break-all text-slate-900">{String(rows[6][1] ?? '—')}</span>
            </div>
            <div className="grid grid-cols-[max-content,1fr] items-baseline gap-x-2">
              <span className="text-slate-500">{rows[7][0]}:</span>
              <span className="break-all text-slate-900">{String(rows[7][1] ?? '—')}</span>
            </div>
            <div className="grid grid-cols-[max-content,1fr] items-baseline gap-x-2">
              <span className="text-slate-500">{rows[8][0]}:</span>
              <span className="break-all text-slate-900">{String(rows[8][1] ?? '—')}</span>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

function MetaGrid({ items }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {items.map((it, i) => (
        <div
          key={i}
          className={`rounded p-2 text-xs ${it.present ? 'bg-slate-50' : 'bg-red-50'
            }`}
        >
          <span className="mb-1 block text-[0.7rem] font-medium text-slate-500">
            {it.label}
          </span>
          <span className="break-all text-slate-900" title={it.value}>
            {it.value || '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

function KwPills({ items }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {items.map((it, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5"
        >
          <span className="text-slate-700">{it.label}</span>
          <span className="text-slate-500">{it.value}</span>
        </span>
      ))}
    </div>
  )
}

function HeadingTree({ items }) {
  return (
    <div className="space-y-1 text-sm">
      {items.map((it, i) => (
        <div
          key={i}
          className="border-b border-slate-100 py-1 last:border-b-0"
        >
          <span className="mr-2 font-semibold text-blue-500">
            {it.label}
          </span>
          <span className="text-slate-700">{it.value}</span>
        </div>
      ))}
    </div>
  )
}

function LinkTable({ items, showTags }) {
  const [showAll, setShowAll] = useState(false)
  const vis = showAll ? items : items.slice(0, 15)
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50 text-left text-[0.7rem] font-semibold text-slate-500">
            <th className="px-3 py-2">Target URL</th>
            <th className="px-3 py-2">Anchor text</th>
            {showTags && <th className="px-3 py-2">Tags</th>}
          </tr>
        </thead>
        <tbody>
          {vis.map((it, i) => (
            <tr key={i}>
              <td className="max-w-[320px] break-all px-3 py-2">
                <a
                  href={it.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {it.value}
                </a>
              </td>
              <td className="px-3 py-2 text-slate-700">{it.label}</td>
              {showTags && (
                <td className="px-3 py-2">
                  {it.tags && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.7rem] text-slate-600">
                      {it.tags}
                    </span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {items.length > 15 && (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-blue-600 hover:bg-slate-100"
          onClick={(e) => { e.stopPropagation(); setShowAll((s) => !s) }}
        >
          {showAll ? <><ChevronUp className="w-3.5 h-3.5 shrink-0" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5 shrink-0" /> Show {items.length - 15} more</>}
        </button>
      )}
    </div>
  )
}

function HttpHeaderTable({ items }) {
  return (
    <div className="meta-grid">
      {items.map((it, i) => (
        <div key={i} className={`meta-cell ${it.present ? '' : 'meta-cell--missing'}`}>
          <span className="meta-cell-name">{it.label}</span>
          <span className="meta-cell-val" title={it.value || '—'}>{it.value || '—'}</span>
        </div>
      ))}
    </div>
  )
}

function MediaTable({ items }) {
  const [showAll, setShowAll] = useState(false)
  const vis = showAll ? items : items.slice(0, 10)
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50 text-left text-[0.7rem] font-semibold text-slate-500">
            <th className="px-3 py-2">URL</th>
            <th className="px-3 py-2">Alt text</th>
            <th className="px-3 py-2">Title text</th>
          </tr>
        </thead>
        <tbody>
          {vis.map((it, i) => (
            <tr
              key={i}
              className={it.present ? '' : 'bg-red-50'}
            >
              <td className="max-w-[320px] break-all px-3 py-2">
                <a
                  href={it.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {it.label.split('/').pop() || it.label}
                </a>
              </td>
              <td
                className={`px-3 py-2 ${it.present ? 'text-slate-700' : 'text-slate-400 italic'
                  }`}
              >
                {it.value}
              </td>
              <td
                className={`px-3 py-2 ${it.title && it.title !== 'Missing'
                  ? 'text-slate-700'
                  : 'text-slate-400 italic'
                  }`}
              >
                {it.title || 'Missing'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length > 10 && (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-blue-600 hover:bg-slate-100"
          onClick={(e) => { e.stopPropagation(); setShowAll((s) => !s) }}
        >
          {showAll ? <><ChevronUp className="w-3.5 h-3.5 shrink-0" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5 shrink-0" /> Show {items.length - 10} more</>}
        </button>
      )}
    </div>
  )
}

function GenericSubList({ items, check }) {
  const [showAll, setShowAll] = useState(false)
  const vis = showAll ? items : items.slice(0, 10)
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 text-xs">
        <span className="font-semibold text-slate-700">Items</span>
        <span className="ml-auto text-slate-500">{items.length}</span>
      </div>
      {vis.map((it, i) => (
        <div
          key={i}
          className="border-b border-slate-100 px-3 py-2 text-xs last:border-b-0"
        >
          <span className="block break-all text-blue-600">{it.label}</span>
          {it.value && (
            <span className="mt-0.5 block text-slate-600">{it.value}</span>
          )}
        </div>
      ))}
      {items.length > 10 && (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-blue-600 hover:bg-slate-100"
          onClick={(e) => { e.stopPropagation(); setShowAll((s) => !s) }}
        >
          {showAll ? <><ChevronUp className="w-3.5 h-3.5 shrink-0" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5 shrink-0" /> Show {items.length - 10} more</>}
        </button>
      )}
    </div>
  )
}

function ItemsRenderer({ check }) {
  const items = check.items || []
  if (!items.length) return null
  const name = (check.name || '').toLowerCase()
  const subCat = ((check.sub_category || '').toLowerCase())
  if (name === 'meta tags' || subCat === 'meta tags') return <MetaGrid items={items} />
  if (name === 'http response headers' || subCat === 'http header') return <HttpHeaderTable items={items} />
  if (name === 'most important keywords' || subCat === 'most important keywords') return <KwPills items={items} />
  if (name === 'headings' || name === 'heading structure' || subCat === 'headings') return <HeadingTree items={items} />
  if (name === 'h1 heading') return <HeadingTree items={items} />
  if (name === 'internal links') return <LinkTable items={items} showTags />
  if (name === 'external links') return <LinkTable items={items} showTags />
  if (name === 'media files') return <MediaTable items={items} />
  if (name === 'robots.txt') return <GenericSubList items={items} check={check} />
  return <GenericSubList items={items} check={check} />
}

function AffectedList({ pages }) {
  const [showAll, setShowAll] = useState(false)
  const vis = showAll ? pages : pages.slice(0, 10)
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 text-xs">
        <span className="font-semibold text-slate-700">Affected pages</span>
        <span className="ml-auto text-slate-500">{pages.length}</span>
      </div>
      {vis.map((p, i) => (
        <div
          key={i}
          className="border-b border-slate-100 px-3 py-2 text-xs last:border-b-0"
        >
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-all text-blue-600 hover:underline"
            title={p.url}
          >
            {shortPath(p.url)}
          </a>
          {p.detail && (
            <span className="mt-0.5 block text-slate-600">{p.detail}</span>
          )}
        </div>
      ))}
      {pages.length > 10 && (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-blue-600 hover:bg-slate-100"
          onClick={(e) => { e.stopPropagation(); setShowAll((s) => !s) }}
        >
          {showAll ? <><ChevronUp className="w-3.5 h-3.5 shrink-0" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5 shrink-0" /> Show {pages.length - 10} more</>}
        </button>
      )}
    </div>
  )
}

function AuditCheckRow({ check, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false)
  const cfg = S[check.status] || S.info
  const StatusIcon = cfg.icon
  const hasPanel = check.detail || (check.affected_pages?.length) || (check.items?.length)
  return (
    <div
      className="mb-2 overflow-hidden rounded-lg border border-slate-200 bg-white"
      style={{ borderLeft: `3px solid ${cfg.border}` }}
    >
      <div
        className={`flex items-center gap-2 px-4 py-3 ${hasPanel ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''}`}
        onClick={() => hasPanel && setOpen((o) => !o)}
        role={hasPanel ? 'button' : undefined}
        tabIndex={hasPanel ? 0 : undefined}
      >
        {hasPanel ? (
          <span className="shrink-0 text-slate-400" aria-hidden>
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        ) : (
          <span className="w-4 shrink-0" aria-hidden />
        )}
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ background: cfg.bg, color: cfg.text }}
        >
          <StatusIcon className="w-4 h-4" strokeWidth={2.5} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-900">
            {check.name}
          </span>
          {check.value && (
            <span className="block text-xs text-slate-500">
              {check.value}
            </span>
          )}
        </div>
        {check.sub_category && (
          <span className="shrink-0 text-xs text-slate-400">{check.sub_category}</span>
        )}
        <span
          className="inline-flex shrink-0 rounded px-2 py-0.5 text-[0.7rem] font-medium"
          style={{ background: cfg.bg, color: cfg.text }}
        >
          {cfg.label}
        </span>
      </div>
      {open && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
          {check.detail && (
            <div className="mb-3 space-y-1 text-slate-600">
              {check.detail.split(' | ').map((l, i) => (
                <p key={i} className="flex items-center text-sm gap-2">
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden />
                  {l}
                </p>
              ))}
            </div>
          )}
          <ItemsRenderer check={check} />
          {check.affected_pages?.length > 0 && <AffectedList pages={check.affected_pages} />}
        </div>
      )}
    </div>
  )
}

function CategorySection({ name, checks, defaultCollapsed = false }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const good = checks.filter((c) => c.status === 'pass').length
  const warning = checks.filter((c) => c.status === 'warn').length
  const error = checks.filter((c) => c.status === 'fail').length
  const total = checks.length
  const scoreable = good + warning + error
  const p = scoreable ? Math.round((good / scoreable) * 100) : 0
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div
        className="flex cursor-pointer items-center gap-2 bg-slate-50 px-2 py-2 hover:bg-slate-100/80 transition-colors"
        onClick={() => setCollapsed((c) => !c)}
        role="button"
        tabIndex={0}
      >
        <span className="shrink-0 text-slate-400" aria-hidden>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          <span className="font-semibold text-slate-900">{name}</span>
          <div className="flex items-center gap-2 text-xs">
            {error > 0 && <span className="text-red-700 inline-flex items-center gap-0.5"><X className="w-3.5 h-3.5" /> {error}</span>}
            {warning > 0 && <span className="text-amber-700 inline-flex items-center gap-0.5"><TriangleAlert className="w-3.5 h-3.5" /> {warning}</span>}
            {good > 0 && <span className="text-emerald-700 inline-flex items-center gap-0.5"><Check className="w-3.5 h-3.5" /> {good}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-28">
          <div className="flex h-1.5 w-16 shrink-0 overflow-hidden rounded bg-slate-200">
            <div style={{ width: `${Math.round((good / total) * 100)}%`, background: '#22c55e' }} />
            <div style={{ width: `${Math.round((warning / total) * 100)}%`, background: '#f59e0b' }} />
            <div style={{ width: `${Math.round((error / total) * 100)}%`, background: '#ef4444' }} />
          </div>
          <span
            className={`text-xs font-semibold w-7 text-right ${p >= 80 ? 'text-emerald-700' : p >= 50 ? 'text-amber-700' : 'text-red-700'
              }`}
          >
            {p}%
          </span>
        </div>
      </div>
      {!collapsed && (
        <div className="px-2 pb-2 pt-1">
          {checks.map((c, i) => <AuditCheckRow key={i} check={c} />)}
        </div>
      )}
    </div>
  )
}

function ElementsTab({ checks }) {
  const [activeSection, setActiveSection] = useState(null) // null = All
  const [expandedId, setExpandedId] = useState(null) // when on "All", which section is expanded; null = all contracted
  const elemChecks = checks.filter((c) => c.category === 'Elements')
  const headingCheck = checks.find((c) => c.name === 'Headings' || c.name === 'Heading structure')
  const kw = checks.find((c) => c.name === 'Most important keywords')
  const internal = checks.find((c) => c.name === 'Internal links')
  const external = checks.find((c) => c.name === 'External links')
  const media = elemChecks.find((c) => c.name === 'Media files')
  const paras = elemChecks.find((c) => c.name === 'Recognized text paragraphs')
  const typos = elemChecks.find((c) => c.name === 'Typos')
  const bold = checks.find((c) => c.name === 'Bold and strong tags')
  const metaTags = checks.find((c) => c.name === 'Meta tags')

  const sections = useMemo(() => [
    { id: 'heading', label: 'Heading structure', has: !!headingCheck, title: `Heading structure (${headingCheck?.items?.length || 0})`, content: headingCheck && <HeadingTree items={headingCheck.items || []} /> },
    { id: 'paragraphs', label: 'Recognized text paragraphs', has: !!paras, title: `Recognized text paragraphs (${paras?.items?.length || 0})`, content: paras && (
      <div className="space-y-0">
        {(paras.items || []).slice(0, 10).map((it, i) => (
          <div key={i} className="border-b border-slate-100 py-2 last:border-b-0">
            <span className="mr-2 text-xs font-semibold text-slate-500">Block {i + 1}</span>
            <span className="text-xs text-slate-700">{it.value}</span>
          </div>
        ))}
      </div>
    )},
    { id: 'typos', label: 'Typos', has: !!typos, title: 'Typos', content: typos && <p className="rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">{typos.detail}</p> },
    { id: 'bold', label: 'Bold and strong tags', has: !!bold, title: `Bold and strong tags (${bold?.items?.length || 0})`, content: bold && (bold.items?.length ? <GenericSubList items={bold.items} check={bold} /> : <p className="text-slate-500">None detected.</p>) },
    { id: 'media', label: 'Media files', has: !!media, title: `Media files (${media?.items?.length || 0})`, content: media && <MediaTable items={media.items || []} /> },
    { id: 'meta', label: 'Meta tags', has: !!metaTags, title: 'Meta tags', content: metaTags && <MetaGrid items={metaTags.items || []} /> },
    { id: 'internal', label: 'Outgoing internal links', has: !!internal, title: `Outgoing internal links (${internal?.items?.length || 0})`, content: internal && <LinkTable items={internal.items || []} showTags /> },
    { id: 'external', label: 'External links', has: !!external, title: `External links (${external?.items?.length || 0})`, content: external && <LinkTable items={external.items || []} showTags /> },
    { id: 'keywords', label: 'Most important keywords', has: !!kw, title: 'Most important keywords', content: kw && <KwPills items={kw.items || []} /> },
  ], [headingCheck, paras, typos, bold, media, metaTags, internal, external, kw])

  const hasAny = sections.some((s) => s.has)
  const visibleSections = activeSection === null ? sections.filter((s) => s.has) : sections.filter((s) => s.id === activeSection && s.has)
  const isSingleExpanded = activeSection !== null // when a specific sidebar item is selected, that section is always expanded
  const isSectionExpanded = (sectionId) => isSingleExpanded || expandedId === sectionId

  const handleSidebarSelect = (id) => {
    setActiveSection(id)
    setExpandedId(null) // "All" = all contracted; single section = no accordion state
  }

  const toggleExpanded = (sectionId) => {
    setExpandedId((prev) => (prev === sectionId ? null : sectionId))
  }

  const sectionBlock = (s) => {
    const expanded = isSectionExpanded(s.id)
    const showToggle = !isSingleExpanded
    return (
      <div key={s.id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => showToggle && toggleExpanded(s.id)}
          className={`w-full flex items-center gap-2 border-b border-slate-200 bg-slate-50 p-2 text-left transition-colors ${showToggle ? 'cursor-pointer hover:bg-slate-100/80' : 'cursor-default'}`}
        >
          <span className="shrink-0 text-slate-400" aria-hidden>
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
          <h3 className="text-sm font-semibold text-slate-800">{s.title}</h3>
        </button>
        {expanded && (
          <div className="px-4 py-3 text-xs text-slate-700 bg-slate-50/30">{s.content}</div>
        )}
      </div>
    )
  }

  return (
    <div className="flex">
      <aside
        className="w-1/5 shrink-0 border-r border-slate-200 bg-slate-50/50 flex flex-col py-2 sticky top-0 self-start"
        aria-label="Element sections"
      >
        <nav className="flex flex-col">
          <button
            type="button"
            onClick={() => handleSidebarSelect(null)}
            className={`text-left px-4 py-2.5 text-sm font-medium transition-colors ${activeSection === null
              ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            All
          </button>
          {ELEMENTS_SIDEBAR_SECTIONS.map(({ id, label }) => {
            const sec = sections.find((s) => s.id === id)
            const hasData = sec?.has ?? false
            const isActive = activeSection === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => hasData && handleSidebarSelect(id)}
                disabled={!hasData}
                className={`text-left px-4 py-2.5 text-sm font-medium transition-colors truncate ${isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : hasData
                    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-slate-400 cursor-not-allowed'
                }`}
              >
                {label}
              </button>
            )
          })}
        </nav>
      </aside>
      <div className="w-4/5 flex-1 min-w-0 overflow-auto p-4">
        {!hasAny && (
          <p className="rounded-lg border border-slate-200 px-4 py-6 text-sm text-slate-500 text-center">
            No element data available for this audit.
          </p>
        )}
        {hasAny && (
          <div className="space-y-2">
            {visibleSections.map((s) => sectionBlock(s))}
          </div>
        )}
      </div>
    </div>
  )
}

const INV_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'crawled', label: 'Crawled' },
  { key: 'skipped', label: 'Skipped' },
  { key: 'error', label: 'Errors' },
  { key: 'external', label: 'External' },
  { key: 'asset', label: 'Assets' },
]

function crawlCfg(entry) {
  const isErr = entry.http_status >= 400 || entry.http_status === 0
  if (entry.crawl_status === 'crawled') return isErr ? { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444' } : { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' }
  if (entry.crawl_status === 'queued') return { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' }
  const r = entry.skip_reason || ''
  if (r.startsWith('HTTP 4') || r.startsWith('HTTP 5') || r === 'Timeout' || r === 'Connection error') return { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444' }
  return { bg: '#f8fafc', text: '#64748b', dot: '#94a3b8' }
}

function InvRow({ entry }) {
  const cfg = crawlCfg(entry)
  const path = shortPath(entry.url)
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 py-1.5">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cfg.dot }} />
      <a
        href={entry.url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 break-all text-blue-600 hover:underline"
        title={entry.url}
      >
        {path}
      </a>
      <span
        className="rounded px-2 py-0.5 text-[0.7rem] font-medium"
        style={{ background: cfg.bg, color: cfg.text }}
      >
        {entry.crawl_status === 'crawled' ? (entry.http_status >= 400 ? `HTTP ${entry.http_status}` : 'Crawled') : (entry.skip_reason || entry.crawl_status)}
      </span>
      {entry.http_status > 0 && (
        <span className="text-[0.7rem] text-slate-500">
          {entry.http_status}
        </span>
      )}
      {entry.load_ms > 0 && (
        <span className="text-[0.7rem] text-slate-500">
          {entry.load_ms}
          ms
        </span>
      )}
      {entry.found_on && (
        <span
          className="max-w-[150px] truncate text-[0.7rem] text-slate-400"
          title={`Found on: ${entry.found_on}`}
        >
          via {shortPath(entry.found_on)}
        </span>
      )}
    </div>
  )
}

function PageInventory({ urls }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const PER = 50
  const counts = useMemo(() => ({
    all: urls.length,
    crawled: urls.filter((u) => u.crawl_status === 'crawled' && !(u.http_status >= 400)).length,
    skipped: urls.filter((u) => u.crawl_status === 'skipped' && u.skip_reason !== 'External domain' && u.skip_reason !== 'Non-HTML asset').length,
    error: urls.filter((u) => u.http_status >= 400 || u.http_status === 0).length,
    external: urls.filter((u) => u.skip_reason === 'External domain').length,
    asset: urls.filter((u) => u.skip_reason === 'Non-HTML asset').length,
  }), [urls])
  const filtered = useMemo(() => {
    let l = urls
    if (filter === 'crawled') l = l.filter((u) => u.crawl_status === 'crawled' && !(u.http_status >= 400))
    if (filter === 'skipped') l = l.filter((u) => u.crawl_status === 'skipped' && u.skip_reason !== 'External domain' && u.skip_reason !== 'Non-HTML asset')
    if (filter === 'error') l = l.filter((u) => u.http_status >= 400 || u.http_status === 0)
    if (filter === 'external') l = l.filter((u) => u.skip_reason === 'External domain')
    if (filter === 'asset') l = l.filter((u) => u.skip_reason === 'Non-HTML asset')
    if (search.trim()) l = l.filter((u) => u.url.toLowerCase().includes(search.trim().toLowerCase()))
    return l
  }, [urls, filter, search])
  const paged = filtered.slice(page * PER, (page + 1) * PER)
  const totalP = Math.ceil(filtered.length / PER)
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="flex flex-wrap gap-1">
          {INV_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`rounded border px-2 py-1 text-xs ${filter === f.key
                ? 'border-blue-500 bg-blue-500 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-500'
                }`}
              onClick={() => { setFilter(f.key); setPage(0) }}
            >
              {f.label}
              <span className="ml-1 opacity-80">
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
        <input
          className="min-w-[140px] flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
          type="text"
          placeholder="Filter by URL…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
        />
      </div>
      <div className="mb-2 flex flex-wrap gap-3 text-[0.7rem] text-slate-500">
        {[['#22c55e', 'Crawled OK'], ['#94a3b8', 'Skipped'], ['#ef4444', 'Error'], ['#3b82f6', 'Queued']].map(([d, l]) => (
          <span key={l} className="inline-flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: d }}
            />
            {l}
          </span>
        ))}
      </div>
      <div className="max-h-96 overflow-y-auto text-xs">
        {paged.length === 0 && (
          <div className="py-4 text-center text-slate-500">
            No URLs match.
          </div>
        )}
        {paged.map((e, i) => <InvRow key={i} entry={e} />)}
      </div>
      {totalP > 1 && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-600">
          <button
            type="button"
            disabled={page === 0}
            className="rounded border border-slate-200 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span>{page + 1}/{totalP} · {filtered.length} URLs</span>
          <button
            type="button"
            disabled={page + 1 >= totalP}
            className="rounded border border-slate-200 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

function ChecksTab({ checks }) {
  const [activeCat, setActiveCat] = useState(null) // null = "All", otherwise category name
  const byCategory = useMemo(() => {
    const map = {}
    for (const c of checks) {
      if (c.category === 'Elements') continue
      if (!map[c.category]) map[c.category] = []
      map[c.category].push(c)
    }
    return map
  }, [checks])
  const orderedCats = CAT_ORDER.filter((c) => byCategory[c])
  const filtered = activeCat ? (byCategory[activeCat] || []) : null
  return (
    <div className="bg-white flex">
      {/* Sticky sidebar: All + categories */}
      <aside
        className="w-1/5 shrink-0 border-r border-slate-200 bg-slate-50/50 flex flex-col py-2 sticky top-0 self-start"
        aria-label="Check categories"
      >
        <nav className="flex flex-col">
          <button
            type="button"
            onClick={() => setActiveCat(null)}
            className={`text-left px-4 py-2.5 text-sm font-medium transition-colors ${activeCat === null
              ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            All
          </button>
          {CHECKS_SIDEBAR_CATS.map((cat) => {
            const hasData = !!byCategory[cat]
            const isActive = activeCat === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCat(cat)}
                disabled={!hasData}
                className={`text-left px-4 py-2.5 text-sm font-medium transition-colors truncate ${isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : hasData
                    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-slate-400 cursor-not-allowed'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </nav>
      </aside>
      {/* Content: only the selected category or all */}
      <div className="w-4/5 flex-1 min-w-0 overflow-auto px-4 pt-2 pb-6">
        {activeCat === null ? (
          <div className="space-y-2">
            {orderedCats.map((cat) => (
              <CategorySection key={cat} name={cat} checks={byCategory[cat] || []} defaultCollapsed />
            ))}
          </div>
        ) : (
          (filtered || []).map((c, i) => <AuditCheckRow key={i} check={c} />)
        )}
      </div>
    </div>
  )
}

function AuditDashboard({ data, technicalAuditCta }) {
  const isSingle = data.audit_mode === 'single'
  const TABS = isSingle ? ['Checks', 'Elements'] : ['Tasks', 'Checks', 'Page Inventory']
  const [activeTab, setActiveTab] = useState(isSingle ? 'Checks' : 'Tasks')
  const [overviewExpanded, setOverviewExpanded] = useState(true)
  const [tasksExpanded, setTasksExpanded] = useState(true)

  const counts = useMemo(
    () => ({
      pass: data.checks.filter((c) => c.status === 'pass').length,
      warn: data.checks.filter((c) => c.status === 'warn').length,
      fail: data.checks.filter((c) => c.status === 'fail').length,
      info: data.checks.filter((c) => c.status === 'info').length,
    }),
    [data.checks],
  )

  const crawledCount = useMemo(
    () => data.discovered_urls?.filter((u) => u.crawl_status === 'crawled').length ?? 0,
    [data.discovered_urls],
  )
  const skippedCount = useMemo(
    () => data.discovered_urls?.filter((u) => u.crawl_status === 'skipped').length ?? 0,
    [data.discovered_urls],
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold text-slate-900">SEO Audit</h1>
            <p className="text-sm tracking-wide text-slate-500">
              {new Date(data.audited_at).toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
              })}
              &nbsp;·&nbsp;
              {new Date(data.audited_at).toLocaleString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
              {!isSingle && data.discovered_urls?.length != null && (
                <Fragment>
                  &nbsp;·&nbsp;
                  <strong className="text-slate-900">
                    {data.pages_discovered?.toLocaleString()} discovered
                  </strong>
                  &nbsp;·&nbsp;
                  <strong className="text-slate-900">
                    {crawledCount?.toLocaleString()} crawled
                  </strong>
                  &nbsp;·&nbsp;
                  <span className="text-slate-400">
                    {skippedCount?.toLocaleString()} skipped
                  </span>
                </Fragment>
              )}
            </p>
          </div>
          <div className="flex flex-col">
            {technicalAuditCta ? <div className="mb-2 flex justify-end">{technicalAuditCta}</div> : null}
          </div>
        </div>
      </div>

      {/* Score + category cards */}
      <div className="mb-4 flex gap-4">
        <div className="w-1/5 p-4 flex items-center border border-gray-300 rounded-lg gap-3">
          <div className="w-full mx-auto text-center items-center justify-center space-y-2">
            <h2 className="text-sm font-semibold text-slate-600">SEO Score</h2>
            <AuditScoreRing score={data.score} />
            <div className="text-sm tracking-wide text-slate-600 uppercase">
              <span className="uppercase">{data.score >= 80 ? 'Good' : data.score >= 60 ? 'Fair' : 'Poor'}</span>
            </div>
          </div>
        </div>
        <div className="w-4/5 flex flex-col flex-1 space-y-4">
          <div className="w-full flex space-x-4 items-center">
            <div className="flex space-x-1 text-slate-500">
              <span className="text-xs bg-green-600 font-semibold text-white px-2 py-0.5 rounded">HTTP {data.status_code}</span>
              {/* <span>·</span> */}
              <span className="text-xs bg-gray-500 font-semibold text-white px-2 py-0.5 rounded">{data.load_time_ms} ms</span>
            </div>
            <div className="flex items-center space-x-4 text-xs">
              {[['fail', <X className="w-3.5 h-3.5" />, 'Errors'], ['warn', <TriangleAlert className="w-3.5 h-3.5" />, 'Warnings'], ['pass', <Check className="w-3.5 h-3.5" />, 'Passed']].map(
                ([k, icon, lbl]) => (
                  <span
                    key={k}
                    className={
                      k === 'fail flex items-center space-x-0.5'
                        ? 'text-red-700 flex items-center space-x-0.5'
                        : k === 'warn'
                          ? 'text-amber-700 flex items-center space-x-0.5'
                          : k === 'pass'
                            ? 'text-green-600 flex items-center space-x-0.5'
                            : 'text-red-500 flex items-center space-x-0.5'
                    }
                  >
                    {icon} <span className="ml-1">{counts[k] || 0}&nbsp;</span> {lbl}
                  </span>
                ),
              )}
            </div>
            <div className="text-xs text-slate-500">
              {data.checks.filter((c) => c.category !== 'Elements').length} checks
            </div>
          </div>
          <div className="w-full min-w-0 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {(data.category_scores || [])
              .filter((cs) => cs.name !== 'Elements')
              .sort((a, b) => CAT_ORDER.indexOf(a.name) - CAT_ORDER.indexOf(b.name))
              .map((cs) => (
                <CatCard
                  key={cs.name}
                  cs={cs}
                  active={activeTab === 'Checks'}
                  onClick={() => setActiveTab('Checks')}
                />
              ))}
          </div>
        </div>
      </div>

      {/* Overview block for single-page audits (expandable, default expanded) */}
      {isSingle && (
        <div className="w-full my-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div
            className="flex cursor-pointer items-center gap-2 bg-slate-50 px-4 py-3 hover:bg-slate-100/80 transition-colors"
            onClick={() => setOverviewExpanded((e) => !e)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setOverviewExpanded((x) => !x)}
          >
            <span className="shrink-0 text-slate-400" aria-hidden>
              {overviewExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
            <h2 className="text-sm font-semibold text-slate-900">HTML Page Overview</h2>
          </div>
          {overviewExpanded && (
            <>
              <hr className="border-slate-200" />
              <div className="px-4 py-2">
                <OverviewPanel overview={data.overview} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Tasks block for single-page audits (expandable, default expanded) */}
      {isSingle && (
        <div className="w-full my-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div
            className="flex cursor-pointer items-center gap-2 bg-slate-50 px-4 py-3 hover:bg-slate-100/80 transition-colors"
            onClick={() => setTasksExpanded((e) => !e)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setTasksExpanded((x) => !x)}
          >
            <span className="shrink-0 text-slate-400" aria-hidden>
              {tasksExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
            <h2 className="text-sm font-semibold text-slate-900">Task: To Do List by priority</h2>
          </div>
          {tasksExpanded && (
            <>
              <hr className="border-slate-200" />
              <TasksPanel tasks={data.tasks} />
            </>
          )}
        </div>
      )}

      {/* Minimal tabs: line with colored indicator on active (after Task Todo list) */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6" aria-label="Audit sections">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`relative pb-3 pt-1 text-sm font-medium transition-colors ${activeTab === t
                ? 'text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
                }`}
              onClick={() => setActiveTab(t)}
            >
              {t}
              {t === 'Tasks' && data.tasks?.length > 0 && (
                <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-red-700">
                  {data.tasks.length}
                </span>
              )}
              {t === 'Page Inventory' && (
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-slate-600">
                  {(data.discovered_urls?.length ?? 0).toLocaleString()}
                </span>
              )}
              {activeTab === t && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                  aria-hidden
                />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="w-full">
        {!isSingle && activeTab === 'Tasks' && <TasksPanel tasks={data.tasks} />}
        {activeTab === 'Checks' && <ChecksTab checks={data.checks} />}
        {activeTab === 'Elements' && <ElementsTab checks={data.checks} />}
        {activeTab === 'Page Inventory' && <PageInventory urls={data.discovered_urls || []} />}
      </div>
    </div>
  )
}

// Mock data matching the reference UI
const defaultDomain = 'example.com'
const domainAuthority = {
  label: 'Domain authority',
  value: 50,
  max: 100,
  descriptor: 'Medium',
  colorClass: 'text-emerald-500',
}

const keyMetrics = [
  { label: 'Page authority', value: 77, max: 100, descriptor: 'Medium', colorClass: 'text-sky-400' },
  { label: 'Citation Flow', value: 50, max: 100, descriptor: 'Good', colorClass: 'text-sky-400' },
  { label: 'Global Rank', value: 242, max: 500, descriptor: 'Very good', colorClass: 'text-sky-400' },
  { label: 'Spam Score', value: 32, max: 100, descriptor: 'Low', colorClass: 'text-amber-500' },
  { label: 'Trust Flow', value: 90, max: 100, descriptor: 'Excellent', colorClass: 'text-sky-400' },
  { label: 'Bounce Rate', value: 24, max: 100, descriptor: 'Low', colorClass: 'text-amber-500', isPercent: true },
]
const summaryStats = [
  { label: 'Domain Rank', value: '12' },
  { label: 'Organic Traffic', value: '521' },
  { label: 'Keywords', value: '204' },
  { label: 'Backlinks', value: '185' },
  { label: 'Referring Domains', value: '67' },
  { label: 'Broken Pages', value: '1' },
  { label: 'Broken Backlinks', value: '0' },
  { label: 'IPs', value: '89' },
  { label: 'Subnets', value: '105' },
]

/** Resolve stored/latest API payload into the shape expected by AuditDashboard (AI technical audit). */
function technicalAuditFromLatestApiResponse(res) {
  const candidates = [res?.data?.data?.response, res?.data?.data, res?.data]
  for (const c of candidates) {
    if (c && typeof c === 'object' && Array.isArray(c.checks)) return c
  }
  return null
}

export function SeoAnalysis() {
  const { user } = useAuth()
  const company = user?.default_company
  const companyId = company?.id ?? company?.uuid
  const domain = company?.website?.replace(/^https?:\/\//, '').replace(/\/$/, '') || defaultDomain
  const companyName = company?.name || domain
  const websiteDisplay = company?.website || (domain ? `https://${domain}` : '')
  const logoUrl = getLogoUrl(companyName)
  const [rerunning, setRerunning] = useState(false)
  const [technicalAuditData, setTechnicalAuditData] = useState(null)
  const [technicalAuditLoading, setTechnicalAuditLoading] = useState(false)
  const [technicalAuditError, setTechnicalAuditError] = useState(null)
  const [latestAuditLoading, setLatestAuditLoading] = useState(true)
  const [competitors, setCompetitors] = useState([])
  const [competitorsLoading, setCompetitorsLoading] = useState(false)
  const [competitorsError, setCompetitorsError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLatestAuditLoading(true)
    Api.get('/seo-audits/latest')
      .then((res) => {
        if (cancelled) return
        const payload = technicalAuditFromLatestApiResponse(res)
        if (payload) setTechnicalAuditData(payload)
      })
      .catch(() => {
        /* no saved audit or error — keep empty state */
      })
      .finally(() => {
        if (!cancelled) setLatestAuditLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!companyId) {
      setCompetitors([])
      setCompetitorsError(null)
      return
    }
    let cancelled = false
    setCompetitorsLoading(true)
    setCompetitorsError(null)
    Api.get(`/companies/${companyId}/competitors`)
      .then((res) => {
        if (cancelled) return
        const list = competitorsListFromResponse(res, companyId)
        setCompetitors(list)
      })
      .catch(() => {
        if (!cancelled) {
          setCompetitors([])
          setCompetitorsError('Unable to load competitors')
        }
      })
      .finally(() => {
        if (!cancelled) setCompetitorsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyId])

  const handleRerun = () => {
    setRerunning(true)
    setTimeout(() => setRerunning(false), 1500)
  }

  const companyWebsite = websiteDisplay?.startsWith('http') ? websiteDisplay : (domain ? `https://${domain}` : '')
  const runTechnicalAudit = async () => {
    if (!companyWebsite) return
    setTechnicalAuditLoading(true)
    setTechnicalAuditError(null)
    try {
      const { data } = await AiApi.post('/api/v1/technical-seo-audit', { data: { url: companyWebsite } })
      setTechnicalAuditData(data)
      Api.post('/seo-audits', { data: data }).catch(() => {})
    } catch (err) {
      setTechnicalAuditError(err.response?.data?.message || err.message || 'Audit failed')
      setTechnicalAuditData(null)
    } finally {
      setTechnicalAuditLoading(false)
    }
  }

  return (
    <div className="w-full min-h-full overflow-x-hidden overflow-y-auto px-4 pb-12 pt-0 sm:pb-16">
      <div className="sticky top-0 z-20 flex h-14 w-full min-w-0 shrink-0 items-center border-b border-slate-200 bg-white">
        <div className="flex items-center h-9 min-w-0 gap-1.5">
          <Link
            to="/"
            className="flex items-center text-slate-500 hover:text-slate-800 transition-colors shrink-0"
            title="Home"
          >
            <House className="w-4 h-4" />
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-sm font-semibold text-slate-800">SEO Analysis</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl pt-6">
        {/* Title + company info + actions */}
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
                  href={websiteDisplay.startsWith('http') ? websiteDisplay : `https://${websiteDisplay}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-500 hover:text-slate-700 truncate block"
                >
                  {websiteDisplay.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                </a>
              ) : null}
            </div>
          </div>
          <CompetitorAvatarStack
            competitors={competitors}
            loading={competitorsLoading}
            errorMessage={competitorsError}
          />
        </div>

        {/* Key metrics cards */}
        {/* <div className="w-full mb-8 flex space-x-4 items-stretch">
          <div className="w-1/5 flex flex-col min-h-0">
            <FullSizeMetricCard
              label={domainAuthority.label}
              value={domainAuthority.value}
              max={domainAuthority.max}
              descriptor={domainAuthority.descriptor}
              colorClass={domainAuthority.colorClass}
            />
          </div>
          <div className="w-4/5 flex flex-col min-h-0">
            <div className="grid grid-cols-3 gap-4 h-full grid-auto-rows-[1fr]">
              {keyMetrics.map((m) => (
                <HalfSizeMetricCard
                  key={m.label}
                  label={m.label}
                  value={m.value}
                  max={m.max}
                  descriptor={m.descriptor}
                  colorClass={m.colorClass}
                  isPercent={m.isPercent}
                />
              ))}
            </div>
          </div>
        </div> */}

        {/* Summary stats row */}
        {/* <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3 mb-8">
          {summaryStats.map((s) => (
            <div key={s.label} className="rounded-lg bg-white border border-slate-200 shadow-sm px-3 py-3 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className="text-lg font-semibold text-slate-800 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div> */}

        {/* Technical SEO Audit */}
        <div className="mb-8">
          {latestAuditLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-sm text-slate-500">
              Loading latest audit…
            </div>
          ) : !technicalAuditData ? (
            <div className="flex flex-col items-center justify-center py-10">
              <button
                type="button"
                onClick={runTechnicalAudit}
                disabled={!companyWebsite || technicalAuditLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
              >
                <Search className="h-4 w-4" />
                {technicalAuditLoading ? 'Auditing…' : 'Audit Technical SEO'}
              </button>
              {technicalAuditError && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {technicalAuditError}
                </p>
              )}
            </div>
          ) : (
            <Fragment>
              {technicalAuditError && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {technicalAuditError}
                </p>
              )}
              <div className="mt-4">
                <AuditDashboard
                  data={technicalAuditData}
                  technicalAuditCta={
                    <button
                      type="button"
                      onClick={runTechnicalAudit}
                      disabled={!companyWebsite || technicalAuditLoading}
                      className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 underline decoration-dashed underline-offset-4 text-sm font-semibold decoration-gray-400 hover:decoration-gray-500"
                    >
                      {technicalAuditLoading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      <span>{technicalAuditLoading ? 'Checks Running...' : 'Run SEO Checks'}</span>
                    </button>
                  }
                />
              </div>
            </Fragment>
          )}
        </div>
      </div>
    </div>
  )
}
