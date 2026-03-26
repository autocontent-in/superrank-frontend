import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Globe, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useSnackbar } from '../../components/ui/SnackbarProvider'
import { SmartModal } from '../../components/ui/SmartModal'
import Api from '../../api/api.jsx'

const WORKFLOW_VIZ_INITIAL = {
  phase: 'idle',
  runId: null,
  input: null,
  agents: [],
  orchestratorStream: null,
}

function getLogoUrl(name) {
  const token = import.meta.env.VITE_LOGO_DEV_PUBLIC_KEY
  if (token && name) return `https://img.logo.dev/name/${encodeURIComponent(name)}?token=${token}`
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name ?? '')}&background=6366f1&color=fff&size=80`
}

function formatNumber(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value ?? '')
  return new Intl.NumberFormat('en-US').format(n)
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
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ease-out ${expanded ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          aria-hidden={expanded}
        >
          <span className="text-sm font-semibold">+{overflow}</span>
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ease-out ${expanded ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          aria-hidden={!expanded}
        >
          <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </span>
      </button>
    </div>
  )
}

/** Inner payload mirrors TinyFishAnalyze stream events (STARTED, STREAMING_URL, PROGRESS, COMPLETE). */
const BROWSER_PREVIEW_INITIAL = {
  phase: 'idle',
  streamingUrl: '',
  statusText: '',
}

function applyBrowserEventData(prev, evt) {
  if (!evt || typeof evt !== 'object') return prev
  const type = evt.type
  if (!type) return prev

  if (type === 'STARTED') {
    return {
      phase: 'starting',
      streamingUrl: '',
      statusText: 'Starting…',
    }
  }
  if (type === 'STREAMING_URL') {
    const url = evt.streaming_url || evt.url || ''
    return {
      ...prev,
      streamingUrl: url,
      phase: 'ready',
      statusText: url ? 'Stream URL received — waiting for progress…' : 'Waiting for stream URL…',
    }
  }
  if (type === 'PROGRESS') {
    const purpose = evt.purpose || ''
    return {
      ...prev,
      phase: 'progress',
      statusText: purpose || 'In progress…',
    }
  }
  if (type === 'COMPLETE') {
    return {
      ...prev,
      phase: 'complete',
      statusText: 'Complete',
    }
  }
  return prev
}

function findRunningAgentRunId(agents) {
  if (!Array.isArray(agents)) return null
  const running = agents.filter((a) => a.status === 'running')
  if (running.length === 0) return null
  return running[running.length - 1].agent_run_id
}

/** Parsed from browser event_data when COMPLETE + COMPLETED + blogs discovery result (no raw JSON UI). */
function blogsSummaryFromBrowserComplete(inner) {
  if (!inner || inner.type !== 'COMPLETE' || inner.status !== 'COMPLETED') return null
  const r = inner.result
  if (!r || typeof r !== 'object') return null
  const hasFlag =
    Object.prototype.hasOwnProperty.call(r, 'blogs_page_found') ||
    Object.prototype.hasOwnProperty.call(r, 'blog_page_found')
  if (!hasFlag) return null

  const rawFound = r.blogs_page_found ?? r.blog_page_found
  const blogs_page_found = rawFound === true || rawFound === 'true'
  const blogs_page_url = String(r.blogs_page_url ?? r.blog_page_url ?? '').trim()
  const blogs = Array.isArray(r.blogs) ? r.blogs : []

  return { blogs_page_found, blogs_page_url, blogs }
}

function formatBlogDate(iso) {
  if (iso == null || iso === '') return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function SavedProfileCard({ title, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function ProfileKVRow({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,148px)_1fr] gap-1 sm:gap-3 text-sm">
      <div className="text-slate-500 shrink-0">{label}</div>
      <div className="text-slate-800 whitespace-pre-wrap wrap-break-word min-w-0">{value}</div>
    </div>
  )
}

function ProfileStringList({ label, items }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <div>
      <div className="text-sm text-slate-500 mb-1">{label}</div>
      <ul className="list-disc pl-5 text-sm text-slate-800 space-y-0.5 m-0">
        {items.map((x, i) => (
          <li key={i}>{String(x)}</li>
        ))}
      </ul>
    </div>
  )
}

function SavedProfileBlogsSection({ blogsList }) {
  if (!blogsList || typeof blogsList !== 'object') return null
  const found = blogsList.blogs_page_found === true || blogsList.blogs_page_found === 'true'
  const pageUrl = String(blogsList.blogs_page_url ?? '').trim()
  const blogs = Array.isArray(blogsList.blogs) ? blogsList.blogs : []

  return (
    <SavedProfileCard title="Blog posts">
      {pageUrl ? (
        <div className="text-sm">
          <span className="text-slate-500">Blogs page URL: </span>
          <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline break-all">
            {pageUrl}
          </a>
        </div>
      ) : null}
      {blogs.length === 0 ? (
        <p className="text-sm text-slate-500 m-0">No blog posts listed.</p>
      ) : (
        <ul className="list-none m-0 p-0 space-y-4">
          {blogs.map((b, i) => {
            const title = b?.title != null ? String(b.title) : '—'
            const link = b?.link != null ? String(b.link).trim() : ''
            const when = formatBlogDate(b?.date ?? b?.datetime)
            const summary = b?.summary != null ? String(b.summary) : ''
            return (
              <li key={`${link || title}-${i}`} className="border-b border-dashed border-slate-200 pb-4 last:border-0 last:pb-0">
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm text-blue-600 hover:text-blue-800 underline break-all"
                  >
                    {title}
                  </a>
                ) : null}
                <div className="mt-1 text-xs text-slate-500">{when}</div>
                {summary ? <p className="mt-2 text-sm text-slate-700 m-0 leading-relaxed">{summary}</p> : null}
              </li>
            )
          })}
        </ul>
      )}
    </SavedProfileCard>
  )
}

function AgentBrowserBlogsSummary({ summary }) {
  if (!summary || typeof summary !== 'object') return null

  if (!summary.blogs_page_found) {
    return (
      <div className="mt-2 ml-6 max-w-xl rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
        The company doesn't have any blogs page
      </div>
    )
  }

  const blogs = summary.blogs || []
  const url = summary.blogs_page_url || ''

  return (
    <div className="mt-2 ml-6 max-w-xl rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 space-y-3">
      <div>
        <span className="text-slate-600">Blog page: </span>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
          >
            {url}
          </a>
        ) : (
          <span className="text-slate-500">—</span>
        )}
      </div>

      {blogs.length === 0 ? (
        <p className="text-xs text-slate-500">No blog posts listed.</p>
      ) : (
        <ul className="space-y-3 list-none m-0 p-0">
          {blogs.map((b, i) => {
            const title = b?.title != null ? String(b.title) : '—'
            const link = b?.link != null ? String(b.link).trim() : ''
            const when = formatBlogDate(b?.datetime ?? b?.date)
            return (
              <li key={`${link || title}-${i}`} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div className="font-medium text-slate-900 text-sm leading-snug">{title}</div>
                <div className="mt-1 text-xs">
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline break-all"
                    >
                      {link}
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">{when}</div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Attach live browser stream to the target agent; clears on inner COMPLETE so agent output can show. */
function applyBrowserStreamToWorkflow(prev, parsed) {
  if (!parsed || parsed.type !== 'browser' || parsed.event !== 'browser_event' || parsed.event_data == null) {
    return prev
  }
  const inner = parsed.event_data
  const agentRunId = parsed.agent_run_id ?? parsed.agent_runId ?? findRunningAgentRunId(prev.agents)
  if (!agentRunId) return prev

  const agents = prev.agents.map((a) => {
    if (a.agent_run_id !== agentRunId) return a
    if (inner?.type === 'STARTED') {
      return { ...a, browserSession: null, browserBlogsSummary: null }
    }
    if (inner?.type === 'COMPLETE') {
      const blogsSummary = blogsSummaryFromBrowserComplete(inner)
      return {
        ...a,
        browserSession: null,
        browserBlogsSummary: blogsSummary ?? null,
      }
    }
    const base = a.browserSession ?? BROWSER_PREVIEW_INITIAL
    const next = applyBrowserEventData(base, inner)
    return { ...a, browserSession: next }
  })

  return { ...prev, agents }
}

function stepTitleFromEvent(evt) {
  if (!evt || typeof evt !== 'object') return 'Event'
  const ev = evt.event ?? ''
  switch (evt.type) {
    case 'workflow':
      return `Workflow · ${ev || 'update'}`
    case 'agent':
      return `${evt.agent_name || evt.agent_id || 'Agent'} · ${ev || 'update'}`
    case 'tool':
      return `${evt.tool_name || evt.tool_id || 'Tool'} · ${ev || 'update'}`
    default:
      return evt.type ? String(evt.type) : 'Event'
  }
}

/** Preview + modal only when the event includes `output` and/or `result`; body is those fields only. */
function formatOutputOrResultField(label, value) {
  if (value === null) return `\nnull`
  if (value === undefined) return `\n`
  if (typeof value === 'string') return `\n${value}`
  try {
    return `\n${JSON.stringify(value, null, 2)}`
  } catch {
    return `\n${String(value)}`
  }
}

function isBlogsDiscoveryPayload(obj) {
  if (!obj || typeof obj !== 'object') return false
  return (
    Object.prototype.hasOwnProperty.call(obj, 'blogs_page_found') ||
    Object.prototype.hasOwnProperty.call(obj, 'blog_page_found')
  )
}

function streamPayloadFromOutputOrResult(evt) {
  if (!evt || typeof evt !== 'object') return null
  const hasOut = Object.prototype.hasOwnProperty.call(evt, 'output')
  const hasRes = Object.prototype.hasOwnProperty.call(evt, 'result')
  if (!hasOut && !hasRes) return null

  const parts = []
  if (hasOut && !isBlogsDiscoveryPayload(evt.output)) {
    parts.push(formatOutputOrResultField('Output', evt.output))
  }
  if (hasRes && !isBlogsDiscoveryPayload(evt.result)) {
    parts.push(formatOutputOrResultField('Result', evt.result))
  }
  const body = parts.join('\n\n').trim()
  if (!body) return null

  return {
    title: stepTitleFromEvent(evt),
    body,
    at: Date.now(),
  }
}

/** Derive UI state from streamed backend events (NDJSON / SSE). */
function applyWorkflowStreamEvent(prev, evt) {
  if (!evt || typeof evt !== 'object') return prev

  if (evt.type === 'workflow') {
    const orch = streamPayloadFromOutputOrResult(evt)
    if (evt.event === 'starting') {
      return {
        phase: 'starting',
        runId: evt.run_id ?? null,
        input: evt.input ?? null,
        agents: [],
        orchestratorStream: orch,
      }
    }
    if (evt.event === 'started') {
      return {
        ...prev,
        phase: 'running',
        orchestratorStream: orch ?? prev.orchestratorStream,
      }
    }
    if (evt.event === 'completed') {
      return {
        ...prev,
        phase: 'completed',
        orchestratorStream: orch ?? prev.orchestratorStream,
      }
    }
    return {
      ...prev,
      orchestratorStream: orch ?? prev.orchestratorStream,
    }
  }

  if (evt.type === 'agent') {
    if (evt.event === 'starting') {
      const payload = streamPayloadFromOutputOrResult(evt)
      if (prev.agents.some((a) => a.agent_run_id === evt.agent_run_id)) {
        return {
          ...prev,
          agents: prev.agents.map((a) =>
            a.agent_run_id === evt.agent_run_id ? { ...a, stream: payload ?? a.stream } : a,
          ),
        }
      }
      const agents = [
        ...prev.agents,
        {
          agent_id: evt.agent_id,
          agent_name: evt.agent_name || evt.agent_id,
          agent_run_id: evt.agent_run_id,
          status: 'running',
          ...(payload ? { stream: payload } : {}),
          tools: [
            {
              id: `run-${evt.agent_run_id}`,
              name: 'Run',
              status: 'running',
              synthetic: true,
            },
          ],
        },
      ]
      return { ...prev, agents }
    }
    if (evt.event === 'completed') {
      const payload = streamPayloadFromOutputOrResult(evt)
      const agents = prev.agents.map((a) =>
        a.agent_run_id === evt.agent_run_id
          ? {
            ...a,
            status: 'done',
            stream: payload ?? a.stream,
            tools: (a.tools || []).map((t) => (t.status === 'running' ? { ...t, status: 'done' } : t)),
          }
          : a,
      )
      return { ...prev, agents }
    }
    const payload = streamPayloadFromOutputOrResult(evt)
    return {
      ...prev,
      agents: prev.agents.map((a) =>
        a.agent_run_id === evt.agent_run_id ? { ...a, stream: payload ?? a.stream } : a,
      ),
    }
  }

  if (evt.type === 'tool') {
    const agentRunId = evt.agent_run_id
    if (!agentRunId) return prev

    if (evt.event === 'starting') {
      const toolId = evt.tool_run_id ?? evt.tool_id ?? `tool-${Date.now()}`
      const toolName = evt.tool_name || evt.tool_id || 'Tool'
      const payload = streamPayloadFromOutputOrResult(evt)
      return {
        ...prev,
        agents: prev.agents.map((a) => {
          if (a.agent_run_id !== agentRunId) return a
          const withoutSynthetic = (a.tools || []).filter((t) => !t.synthetic)
          return {
            ...a,
            tools: [
              ...withoutSynthetic,
              {
                id: toolId,
                name: toolName,
                status: 'running',
                synthetic: false,
                ...(payload ? { stream: payload } : {}),
              },
            ],
          }
        }),
      }
    }

    if (evt.event === 'completed') {
      const toolId = evt.tool_run_id ?? evt.tool_id
      const payload = streamPayloadFromOutputOrResult(evt)
      return {
        ...prev,
        agents: prev.agents.map((a) => {
          if (a.agent_run_id !== agentRunId) return a
          if (!toolId) {
            return {
              ...a,
              tools: (a.tools || []).map((t) =>
                t.status === 'running'
                  ? { ...t, status: 'done', stream: payload ?? t.stream }
                  : t,
              ),
            }
          }
          return {
            ...a,
            tools: (a.tools || []).map((t) =>
              t.id === toolId ? { ...t, status: 'done', stream: payload ?? t.stream } : t,
            ),
          }
        }),
      }
    }

    const payload = streamPayloadFromOutputOrResult(evt)
    return {
      ...prev,
      agents: prev.agents.map((a) => {
        if (a.agent_run_id !== agentRunId) return a
        const toolId = evt.tool_run_id ?? evt.tool_id
        if (!toolId) return a
        return {
          ...a,
          tools: (a.tools || []).map((t) =>
            t.id === toolId ? { ...t, stream: payload ?? t.stream } : t,
          ),
        }
      }),
    }
  }

  const orch = streamPayloadFromOutputOrResult(evt)
  if (!orch) return prev
  return { ...prev, orchestratorStream: orch }
}

function LiveDot({ label }) {
  return (
    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center" aria-label={label} title={label}>
      <span className="absolute inline-flex h-3 w-3 rounded-full bg-gray-400/70 motion-safe:animate-ping" />
      <span className="relative h-2 w-2 rounded-full bg-green-500 ring-2 ring-green-200" />
    </span>
  )
}

function StepIdle() {
  return <span className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-200 bg-white" aria-hidden />
}

function StepCheck({ title }) {
  return <Check className="h-4 w-4 shrink-0 text-green-600" strokeWidth={2.5} aria-hidden title={title} />
}

function StreamingTailLoader({ active }) {
  const [barCount, setBarCount] = useState(4)

  useEffect(() => {
    if (!active) {
      setBarCount(4)
      return
    }
    setBarCount(4)
    const id = window.setInterval(() => {
      setBarCount((n) => (n >= 200 ? 200 : n + 1))
    }, 400)
    return () => window.clearInterval(id)
  }, [active])

  return (
    <>
      <style>
        {`
          @keyframes ac-stack-bar {
            0%, 100% { transform: scaleY(0.35); opacity: 0.4; }
            50% { transform: scaleY(1); opacity: 1; }
          }
          .ac-stack-bar {
            transform-origin: bottom center;
            animation: ac-stack-bar 0.75s ease-in-out infinite;
          }
        `}
      </style>
      <div className="flex min-h-10 items-end gap-px sm:gap-0.5 py-2 pr-2">
        {Array.from({ length: barCount }, (_, i) => (
          <div
            key={i}
            className="ac-stack-bar w-[3px] sm:w-1 rounded-full bg-gray-300 transition-all duration-300"
            style={{
              height: `${8 + (i % 7) * 4}px`,
              animationDelay: `${(i * 0.06).toFixed(2)}s`,
            }}
          />
        ))}
        <div className="ml-3 flex min-w-0 flex-col justify-end pb-0.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-700/90 motion-safe:animate-pulse">
            Running…
          </span>
        </div>
      </div>
    </>
  )
}

/** Preview text and whether the full body is longer (for fade + Show more). */
function getStreamStepPreview(body, maxChars = 200, maxLines = 5) {
  if (body == null || body === '') return { text: '', truncated: false }
  const lines = String(body).split(/\r?\n/)
  if (lines.length > maxLines) {
    return { text: `${lines.slice(0, maxLines).join('\n')}\n…`, truncated: true }
  }
  const joined = lines.join('\n')
  if (joined.length > maxChars) {
    return { text: `${joined.slice(0, maxChars)}…`, truncated: true }
  }
  return { text: joined, truncated: false }
}

function StepOutputPeek({ stream, onOpen, embedded = false }) {
  const body = stream?.body
  if (body == null || String(body).trim() === '') return null

  const preview = getStreamStepPreview(body)
  const subtitle = typeof stream.at === 'number' ? new Date(stream.at).toLocaleTimeString() : ''

  function openModal() {
    onOpen?.({
      title: stream.title,
      subtitle,
      body: String(body),
    })
  }

  const shell = embedded
    ? 'mt-2 rounded-lg border border-slate-200/90 bg-white px-2 py-2 ml-6'
    : 'rounded-xl border border-slate-200 bg-slate-50/90 p-3 shadow-sm'

  return (
    <div className="ml-6 mb-10 max-w-md">
      <div className="relative mt-2">
        <div className="relative max-h-96 overflow-hidden rounded-md border-x border-t border-slate-100 bg-white px-2 py-1.5">
          <div
            className={`leading-relaxed text-slate-700 whitespace-pre-wrap wrap-break-word ${embedded ? 'text-xs' : 'text-sm'
              }`}
          >
            {preview.text}
          </div>
          {preview.truncated ? (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-30 bg-linear-to-t from-white via-white/85 to-transparent"
              aria-hidden
            />
          ) : null}
        </div>
        <button
          type="button"
          onClick={openModal}
          className={`absolute w-full text-left -bottom-4 px-2 py-1.5 text-gray-500 hover:text-gray-700 underline decoration-gray-400 decoration-dashed underline-offset-4 hover:decoration-gray-600 ${embedded ? 'text-xs' : 'text-sm'
            }`}
        >
          {preview.truncated ? 'Show more...' : 'View full'}
        </button>
      </div>
    </div>
  )
}

function browserPreviewShowFrame(phase, streamingUrl) {
  return (phase === 'progress' || phase === 'complete') && Boolean(streamingUrl)
}

function BrowserExpandModalBody({ session }) {
  const { phase, streamingUrl, statusText } = session || {}
  const showFrame = browserPreviewShowFrame(phase, streamingUrl)

  return (
    <div className="flex flex-col min-h-0 w-full">
      <div className="w-full h-100 shrink-0 bg-slate-900">
        {showFrame ? (
          <iframe
            title="browser-stream-expanded (read-only)"
            src={streamingUrl}
            className="w-full h-full border-0 block pointer-events-none select-none"
            allow="autoplay"
            tabIndex={-1}
          />
        ) : (
          <div className="h-full flex items-center justify-center px-4 text-center text-sm font-medium text-slate-200">
            Getting my browser...
          </div>
        )}
      </div>
      {statusText != null && String(statusText).trim() !== '' ? (
        <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap wrap-break-word">
            {statusText}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function BrowserStreamMiniPreview({ phase, streamingUrl, statusText }) {
  const showFrame = browserPreviewShowFrame(phase, streamingUrl)

  return (
    <div className="max-w-md space-y-2">
      <div className="rounded-lg border border-slate-200 bg-slate-900 overflow-hidden shadow-sm h-44 sm:h-52 min-h-44">
        {showFrame ? (
          <iframe
            title="browser-stream (read-only)"
            src={streamingUrl}
            className="w-full h-full border-0 block pointer-events-none select-none"
            allow="autoplay"
            tabIndex={-1}
          />
        ) : (
          <div className="h-full flex items-center justify-center px-4 text-center text-sm font-medium text-slate-200">
            Getting my browser...
          </div>
        )}
      </div>
      {statusText != null && String(statusText).trim() !== '' ? (
        <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap wrap-break-word">
          {statusText}
        </p>
      ) : null}
    </div>
  )
}

function WorkflowAgentPipeline({ phase, runId, input, agents, orchestratorStream, onOpenStream, onExpandBrowser }) {
  const idle = phase === 'idle' && agents.length === 0

  const runActive = phase === 'starting' || phase === 'running'
  const runDone = phase === 'completed'
  const orchestratorLive = runActive && !runDone

  const allAgentsDone = agents.length > 0 && agents.every((a) => a.status === 'done')

  const orchestrationSub =
    input && (input.website || input.business_name || input.company_website || input.company_name)
      ? [input.business_name || input.company_name, input.website || input.company_website].filter(Boolean).join(' · ')
      : runId
        ? `Run ${String(runId).slice(0, 8)}…`
        : ''

  const shellRing =
    runDone
      ? 'border-gray-200 bg-gradient-to-b from-gray-50/35 to-white shadow-[inset_0_1px_0_0_rgba(16,185,129,0.1)]'
      : orchestratorLive
        ? 'border-gray-200/90 bg-gradient-to-b from-gray-50/40 to-white shadow-[inset_0_0_0_1px_rgba(16,185,129,0.08)]'
        : 'border-slate-200 bg-white'

  if (idle) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
        When you run a profile, the <strong className="font-medium text-slate-700">orchestrator</strong> appears first, then{' '}
        <strong className="font-medium text-slate-700">agents</strong> and their <strong className="font-medium text-slate-700">tools</strong>, with a streaming bar
        until the workflow completes.
      </div>
    )
  }

  const spineClass = runDone
    ? 'bg-gradient-to-b from-gray-300 via-gray-200/90 to-slate-200/80'
    : 'bg-gradient-to-b from-gray-400 via-gray-300/75 to-gray-200/50'

  return (
    <div>
      <div className="relative">
        <div className="min-w-0 space-y-0">
          <div className="ml-4 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <div className="mt-0.5 shrink-0">
                  {runDone ? (
                    <StepCheck title="Orchestrator finished" />
                  ) : orchestratorLive ? (
                    <LiveDot label="Orchestrator live" />
                  ) : (
                    <StepIdle />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-800/80">Started</div>
                </div>
              </div>
            </div>
            {orchestratorStream ? (
              <StepOutputPeek stream={orchestratorStream} onOpen={onOpenStream} embedded />
            ) : null}
          </div>

          <div className="relative mt-0 pt-3 pl-5 sm:pl-6">
            <div
              className={`pointer-events-none absolute left-4.5 top-0 bottom-3 w-0.5 rounded-full sm:left-5.5 ${spineClass}`}
              aria-hidden
            />

            <div className="relative">
              {agents.length === 0 && !orchestratorLive ? (
                <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-5 text-center text-sm text-slate-500">
                  No agent steps in this run.
                </div>
              ) : null}

              {agents.length === 0 && orchestratorLive ? (
                <div className="mt-3 rounded-lg border border-dashed border-gray-200/70 bg-gray-50/30 px-3 py-4 text-center text-sm text-gray-900 motion-safe:animate-pulse">
                  Spinning up...
                </div>
              ) : null}

              <div className="mt-3 space-y-10 pl-10">
                {agents.map((a) => (
                  <div
                    key={a.agent_run_id}
                  >
                    <div className="flex items-center gap-2">
                      {a.status === 'done' ? (
                        <StepCheck title="Agent finished" />
                      ) : a.status === 'running' ? (
                        <LiveDot label={`${a.agent_name} running`} />
                      ) : (
                        <StepIdle />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900 truncate" title={a.agent_name}>
                          {a.agent_name}
                        </div>
                      </div>
                    </div>

                    {a.browserSession ? (
                      <div className="mt-2 ml-6 max-w-xl">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="flex space-x-2 items-center text-xs font-medium tracking-wide text-slate-500">
                            <Globe className="w-4 h-4" />
                            <span>Browsing the web...</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => onExpandBrowser?.(a.agent_run_id)}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                          >
                            Expand view
                          </button>
                        </div>
                        <BrowserStreamMiniPreview
                          phase={a.browserSession.phase}
                          streamingUrl={a.browserSession.streamingUrl}
                          statusText={a.browserSession.statusText}
                        />
                      </div>
                    ) : null}

                    {a.browserBlogsSummary ? <AgentBrowserBlogsSummary summary={a.browserBlogsSummary} /> : null}

                    {a.stream && !a.browserSession && !a.browserBlogsSummary ? (
                      <StepOutputPeek stream={a.stream} onOpen={onOpenStream} embedded />
                    ) : null}

                    <div className="mt-2 ml-1 border-l-2 border-gray-200/80 pl-3 space-y-2">
                      {(a.tools || [])
                        .filter((t) => !t.synthetic)
                        .map((t) => {
                          const done = t.status === 'done'
                          return (
                            <div key={t.id} className="min-w-0">
                              <div className="flex items-center gap-2 py-0.5 min-w-0">
                                {done ? <StepCheck title="Tool finished" /> : <StepIdle />}
                                <span className="text-xs text-slate-700 truncate" title={t.name}>
                                  {t.name}
                                </span>
                              </div>
                              {t.stream ? <StepOutputPeek stream={t.stream} onOpen={onOpenStream} embedded /> : null}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                ))}
              </div>

              {orchestratorLive ? (
                <div className="pt-4 pl-16">
                  <StreamingTailLoader active />
                </div>
              ) : runDone ? (
                <div className="mt-10 flex items-center gap-2 text-xs text-gray-800">
                  <Check className="h-4 w-4 shrink-0 text-green-600" strokeWidth={2.5} aria-hidden />
                  <span>DONE</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function tryParseJsonLine(line) {
  const s = line.trim()
  if (!s) return null
  if (s === '[DONE]' || s.toLowerCase() === 'done') return null

  // Support SSE-style `data: {...}` lines
  const maybeData = s.startsWith('data:') ? s.slice(5).trim() : s
  if (!maybeData) return null

  try {
    return JSON.parse(maybeData)
  } catch {
    return null
  }
}

export function BusinessProfile() {
  const { user } = useAuth()
  const { showSnackbar } = useSnackbar()

  const company_name = (user?.default_company?.company_name || user?.default_company?.name || '').trim()
  const company_website = (user?.default_company?.website || user?.default_company?.company_website || '').trim()
  const companyId = user?.default_company?.id ?? user?.default_company?.uuid ?? null

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingBusinessProfile, setIsSavingBusinessProfile] = useState(false)
  const [isLoadingLatestBusinessProfile, setIsLoadingLatestBusinessProfile] = useState(true)
  const [latestBusinessProfile, setLatestBusinessProfile] = useState(null)
  const [showWorkflowUI, setShowWorkflowUI] = useState(false)
  const [showSaveActions, setShowSaveActions] = useState(false)

  const [competitors, setCompetitors] = useState([])
  const [competitorsLoading, setCompetitorsLoading] = useState(false)
  const [competitorsError, setCompetitorsError] = useState(null)

  // Company inputs used to run the workflow. When re-creating, we override these from the latest profile.
  const [activeCompanyName, setActiveCompanyName] = useState(company_name)
  const [activeCompanyWebsite, setActiveCompanyWebsite] = useState(company_website)

  const [workflowViz, setWorkflowViz] = useState(WORKFLOW_VIZ_INITIAL)
  const [modalStep, setModalStep] = useState(null)
  const [browserExpandAgentRunId, setBrowserExpandAgentRunId] = useState(null)
  const [sseRawLogOpen, setSseRawLogOpen] = useState(false)
  const [sseRawLines, setSseRawLines] = useState([])
  const [completedBusinessProfilePayload, setCompletedBusinessProfilePayload] = useState(null)
  const [completedBusinessProfileRunId, setCompletedBusinessProfileRunId] = useState(null)

  const expandedBrowserSession = useMemo(() => {
    if (!browserExpandAgentRunId) return null
    const agent = workflowViz.agents.find((x) => x.agent_run_id === browserExpandAgentRunId)
    return agent?.browserSession ?? null
  }, [browserExpandAgentRunId, workflowViz.agents])

  const abortRef = useRef(null)

  useEffect(() => {
    if (browserExpandAgentRunId && !expandedBrowserSession) {
      setBrowserExpandAgentRunId(null)
    }
  }, [browserExpandAgentRunId, expandedBrowserSession])

  // Keep workflow inputs synced with the selected company when we are not showing the saved profile UI.
  useEffect(() => {
    if (showWorkflowUI) return
    if (isSubmitting) return
    setActiveCompanyName(company_name)
    setActiveCompanyWebsite(company_website)
  }, [company_name, company_website, isSubmitting, showWorkflowUI])

  useEffect(() => {
    let cancelled = false
    async function loadLatest() {
      setIsLoadingLatestBusinessProfile(true)
      try {
        const res = await Api.get('/business-profiles/latest')
        if (cancelled) return
        const payload = res?.data?.data ?? null
        setLatestBusinessProfile(payload)
        setShowWorkflowUI(false)
      } catch (e) {
        if (cancelled) return
        const status = e?.response?.status
        if (status !== 404) {
          showSnackbar({
            message: e?.message || 'Failed to load latest business profile',
            variant: 'error',
            duration: 5000,
          })
        }
        setLatestBusinessProfile(null)
        setShowWorkflowUI(false)
      } finally {
        if (!cancelled) setIsLoadingLatestBusinessProfile(false)
      }
    }
    loadLatest()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // When the workflow hits DONE, reveal the save controls (if we don't have a payload yet, buttons will disable).
    if (workflowViz.phase === 'completed') {
      setShowSaveActions(true)
    } else {
      setShowSaveActions(false)
    }
  }, [workflowViz.phase])

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
        const list = competitorsListFromResponse(res, companyId)
        setCompetitors(list)
      } catch (e) {
        if (cancelled) return
        setCompetitors([])
        setCompetitorsError('Unable to load competitors')
      } finally {
        if (!cancelled) setCompetitorsLoading(false)
      }
    }
    loadCompetitors()
    return () => {
      cancelled = true
    }
  }, [companyId])

  function stop() {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = null
    setIsSubmitting(false)
    setCompletedBusinessProfilePayload(null)
    setCompletedBusinessProfileRunId(null)
    setShowSaveActions(false)
  }

  useEffect(() => {
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createBusinessProfile(overrides = {}) {
    if (isSubmitting) return

    const nameToUse = String(overrides.company_name ?? activeCompanyName ?? '').trim()
    const websiteToUse = String(overrides.company_website ?? activeCompanyWebsite ?? '').trim()

    if (!nameToUse || !websiteToUse) {
      showSnackbar({
        message: 'Add a company name and website first (from your selected company).',
        variant: 'error',
        duration: 4000,
      })
      return
    }

    setShowWorkflowUI(true)

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setModalStep(null)
    setBrowserExpandAgentRunId(null)
    setWorkflowViz(WORKFLOW_VIZ_INITIAL)
    setSseRawLines([])
    setCompletedBusinessProfilePayload(null)
    setCompletedBusinessProfileRunId(null)
    setShowSaveActions(false)
    setIsSubmitting(true)

    try {
      const resp = await fetch('http://localhost:8000/api/v1/create-business-profile', {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            company_name: nameToUse,
            company_website: websiteToUse,
          },
        }),
        signal: abortRef.current.signal,
      })

      if (!resp.ok) {
        const body = await resp.text().catch(() => '')
        throw new Error(`HTTP ${resp.status}${body ? ` — ${body}` : ''}`)
      }

      if (!resp.body) throw new Error('No response body (streaming unsupported?)')

      const decoder = new TextDecoder('utf-8')
      const reader = resp.body.getReader()

      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          setSseRawLines((prev) => [...prev, line])

          const trimmed = line.trim()
          if (!trimmed) continue

          // Try JSON first; fallback to raw line output.
          const parsed = tryParseJsonLine(trimmed)
          if (parsed) {
            if (parsed.type === 'workflow' && parsed.event === 'completed' && parsed.data) {
              setCompletedBusinessProfilePayload(parsed.data)
              setCompletedBusinessProfileRunId(parsed.run_id ?? parsed.data.run_id ?? null)
            }
            setWorkflowViz((p) => {
              const afterWorkflow = applyWorkflowStreamEvent(p, parsed)
              return applyBrowserStreamToWorkflow(afterWorkflow, parsed)
            })
          }
          // Non-JSON lines are ignored for the workflow UI (no output/result payload).
        }
      }

      // Flush last partial line.
      if (buffer.length > 0) {
        setSseRawLines((prev) => [...prev, buffer])
      }
      const last = buffer.trim()
      if (last) {
        const parsed = tryParseJsonLine(last)
        if (parsed) {
          if (parsed.type === 'workflow' && parsed.event === 'completed' && parsed.data) {
            setCompletedBusinessProfilePayload(parsed.data)
            setCompletedBusinessProfileRunId(parsed.run_id ?? parsed.data.run_id ?? null)
          }
          setWorkflowViz((p) => {
            const afterWorkflow = applyWorkflowStreamEvent(p, parsed)
            return applyBrowserStreamToWorkflow(afterWorkflow, parsed)
          })
        }
      }
    } catch (e) {
      if (String(e?.name) === 'AbortError') return
      setSseRawLines((prev) => [
        ...prev,
        `[${new Date().toISOString()}] ERROR: ${e?.message || String(e)}`,
      ])
      showSnackbar({
        message: e?.message || String(e),
        variant: 'error',
        duration: 5000,
      })
    } finally {
      abortRef.current = null
      setIsSubmitting(false)
    }
  }

  async function saveBusinessProfile() {
    if (!completedBusinessProfilePayload) return
    if (isSavingBusinessProfile) return

    setIsSavingBusinessProfile(true)
    try {
      await Api.post('/business-profiles', { data: completedBusinessProfilePayload })
      showSnackbar({
        message: 'Business Profile saved.',
        variant: 'success',
        duration: 3000,
      })
      setLatestBusinessProfile(completedBusinessProfilePayload)
      setActiveCompanyName(String(completedBusinessProfilePayload?.company_name ?? activeCompanyName).trim())
      setActiveCompanyWebsite(String(completedBusinessProfilePayload?.website ?? activeCompanyWebsite).trim())
      setShowWorkflowUI(false)
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.detail ||
        e?.message ||
        'Failed to save Business Profile'
      showSnackbar({ message: msg, variant: 'error', duration: 5000 })
    } finally {
      setIsSavingBusinessProfile(false)
    }
  }

  function cancelSaveActions() {
    if (isSavingBusinessProfile) return

    setCompletedBusinessProfilePayload(null)
    setCompletedBusinessProfileRunId(null)
    setShowSaveActions(false)

    // If we already have a saved profile, return to its view.
    if (latestBusinessProfile) {
      setShowWorkflowUI(false)
    } else {
      setWorkflowViz(WORKFLOW_VIZ_INITIAL)
      setSseRawLines([])
    }
  }

  const latestWebsiteData = latestBusinessProfile?.website_data ?? null
  const latestCompanyName = String(latestBusinessProfile?.company_name ?? '').trim()
  const latestCompanyWebsite = String(latestBusinessProfile?.website ?? '').trim()
  const latestH1 = Array.isArray(latestWebsiteData?.h1) ? latestWebsiteData.h1 : []
  const latestH2 = Array.isArray(latestWebsiteData?.h2) ? latestWebsiteData.h2 : []
  const latestLinks = Array.isArray(latestWebsiteData?.links) ? latestWebsiteData.links : []
  const latestContent = latestWebsiteData?.content ? String(latestWebsiteData.content) : ''
  const latestCompanyInfo = latestBusinessProfile?.company_info ?? null
  const latestProfileId = latestBusinessProfile?.id ?? null
  const latestProfileRunId = latestBusinessProfile?.run_id ?? null
  const latestMessages = Array.isArray(latestBusinessProfile?.messages) ? latestBusinessProfile.messages : []
  const latestCompanyIdentity = latestBusinessProfile?.company_identity ?? null
  const latestDigitalPresence = latestBusinessProfile?.company_digital_presence ?? null
  const latestBlogsList = latestBusinessProfile?.blogs_list ?? null
  const latestStepLogs = Array.isArray(latestBusinessProfile?.step_logs) ? latestBusinessProfile.step_logs : []
  const latestSocialLinks = Array.isArray(latestDigitalPresence?.social_links) ? latestDigitalPresence.social_links : []

  const activeLogoUrl = getLogoUrl(activeCompanyName)
  const activeWebsiteHref = activeCompanyWebsite
    ? activeCompanyWebsite.startsWith('http')
      ? activeCompanyWebsite
      : `https://${activeCompanyWebsite}`
    : ''
  const activeWebsiteDisplay = activeCompanyWebsite
    ? activeCompanyWebsite.replace(/^https?:\/\//, '').replace(/^www\./, '')
    : ''

  function recreateFromLatest() {
    if (!latestBusinessProfile) return
    setActiveCompanyName(latestCompanyName)
    setActiveCompanyWebsite(latestCompanyWebsite)
    createBusinessProfile({ company_name: latestCompanyName, company_website: latestCompanyWebsite })
  }

  return (
    <div className="px-4 pt-6 pb-12 sm:pt-6 sm:pb-16 w-full min-h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        {/* Header (always visible) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 min-w-0">
            <div className="flex items-center gap-4 min-w-0">
              <img
                src={activeLogoUrl}
                alt={`${activeCompanyName || 'company'} logo`}
                className="w-12 h-12 rounded-lg object-cover shrink-0 bg-slate-100 border border-slate-200"
              />
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-slate-800 truncate">{activeCompanyName || '—'}</h1>
                {activeWebsiteDisplay ? (
                  <a
                    href={activeWebsiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-500 hover:text-slate-700 truncate block"
                  >
                    {activeWebsiteDisplay}
                  </a>
                ) : null}
              </div>
            </div>

            <CompetitorAvatarStack competitors={competitors} loading={competitorsLoading} errorMessage={competitorsError} />
          </div>

          <div className="mt-4 flex items-start justify-between flex-wrap">
            <h1 className="text-2xl font-semibold text-slate-900">Business Profile</h1>

            {latestBusinessProfile && !showWorkflowUI ? (
              <button
                type="button"
                onClick={recreateFromLatest}
                disabled={isSubmitting || isSavingBusinessProfile}
                className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 underline decoration-dashed underline-offset-4 text-sm font-semibold decoration-gray-400 hover:decoration-gray-500 disabled:pointer-events-none disabled:opacity-50"
              >
                {isSubmitting ? 'Re-creating…' : 'Re-create business profile'}
              </button>
            ) : null}
          </div>
        </div>

        {/* Body */}
        <div className="mt-5">
          {isLoadingLatestBusinessProfile && !showWorkflowUI ? (
            <div className="flex flex-col items-center justify-center py-10 text-sm text-slate-500">
              Loading latest business profile…
            </div>
          ) : latestBusinessProfile && !showWorkflowUI ? (
            <div className="space-y-5">
              {latestMessages.length > 0 ? (
                <SavedProfileCard title="Messages">
                  <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap wrap-break-word m-0 max-h-40 overflow-auto">
                    {JSON.stringify(latestMessages, null, 2)}
                  </pre>
                </SavedProfileCard>
              ) : null}

              {/* {latestCompanyInfo && typeof latestCompanyInfo === 'object' ? (
                <SavedProfileCard title="Company overview">
                  <ProfileKVRow label="Brand" value={latestCompanyInfo.brand} />
                  <ProfileKVRow label="Domain" value={latestCompanyInfo.domain} />
                  <ProfileKVRow label="Industry" value={latestCompanyInfo.industry} />
                  <ProfileKVRow label="Company type" value={latestCompanyInfo.company_type} />
                  <ProfileKVRow label="Product category" value={latestCompanyInfo.product_category} />
                  <ProfileKVRow label="Services provided" value={latestCompanyInfo.services_provided} />
                  <ProfileKVRow label="Key keywords" value={latestCompanyInfo.key_keywords} />
                  <ProfileStringList label="Known competitors" items={latestCompanyInfo.known_competitors} />
                </SavedProfileCard>
              ) : null} */}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  {latestCompanyIdentity && typeof latestCompanyIdentity === 'object' ? (
                    <SavedProfileCard title="Company identity">
                      <ProfileKVRow label="Legal name" value={latestCompanyIdentity.business_legal_name} />
                      <ProfileKVRow label="Industry" value={latestCompanyIdentity.industry} />
                      <ProfileKVRow label="Founded" value={latestCompanyIdentity.founded_year} />
                      <ProfileKVRow label="Headquarters" value={latestCompanyIdentity.headquarter_location} />
                      <ProfileKVRow label="Offices" value={latestCompanyIdentity.office_locations} />
                      <ProfileKVRow label="Employees" value={latestCompanyIdentity.total_employees_working} />
                      <ProfileKVRow label="Business model" value={latestCompanyIdentity.business_model} />
                      <ProfileKVRow label="Description" value={latestCompanyIdentity.description} />
                      <ProfileKVRow label="Type of business" value={latestCompanyIdentity.type_of_business} />
                      <ProfileKVRow label="Core values" value={latestCompanyIdentity.core_values} />
                    </SavedProfileCard>
                  ) : null}
                </div>
                <div className="space-y-4">
                  {latestSocialLinks.length > 0 ? (
                    <SavedProfileCard title="Social presence">
                      <ul className="list-none m-0 p-0 space-y-3">
                        {latestSocialLinks.map((s, i) => {
                          const name = s?.name != null ? String(s.name) : '—'
                          const link = s?.link != null ? String(s.link).trim() : ''
                          const count = s?.count
                          return (
                            <li key={`${name}-${i}`} className="flex items-center justify-between">
                              {link ? (
                                <a
                                  href={link.startsWith('http') ? link : `https://${link}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-600 hover:text-gray-800 underline decoration-dashed decoration-gray-400 hover:text-color-800 underline-offset-4 break-all inline-block"
                                >
                                  {name}
                                </a>
                              ) : (
                                <p className="text-sm font-medium text-slate-900">{name}</p>
                              )}
                              {count != null && String(count) !== '' ? (
                                <div className="text-sm text-slate-500 mt-0.5">
                                  <span className="font-medium">{formatNumber(count)}</span>
                                  &nbsp;
                                  {name === 'LinkedIn' && <span>connections</span>}
                                  {name === 'Twitter' || name === 'X' && <span>followers</span>}
                                  {name === 'Youtube' && <span>subscribers</span>}
                                  {name === 'Instagram' && <span>followers</span>}
                                  {name === 'Facebook' && <span>followers</span>}

                                </div>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                    </SavedProfileCard>
                  ) : null}
                    <SavedProfileBlogsSection blogsList={latestBlogsList} />

                </div>
              </div>

              {latestStepLogs.length > 0 ? (
                <SavedProfileCard title="Step logs">
                  <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap wrap-break-word m-0 max-h-64 overflow-auto">
                    {JSON.stringify(latestStepLogs, null, 2)}
                  </pre>
                </SavedProfileCard>
              ) : null}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={createBusinessProfile}
                    disabled={isSubmitting || !activeCompanyName || !activeCompanyWebsite}
                    className="rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Creating…' : 'Create my business profile'}
                  </button>
                  <button
                    type="button"
                    onClick={stop}
                    disabled={!isSubmitting}
                    className="rounded-lg bg-white border border-slate-300 text-slate-800 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Stop
                  </button>
                  <button
                    type="button"
                    onClick={() => setSseRawLogOpen(true)}
                    disabled={sseRawLines.length === 0 && !isSubmitting}
                    className="rounded-lg bg-white border border-slate-300 text-slate-800 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Raw SSE log
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <WorkflowAgentPipeline
                  phase={workflowViz.phase}
                  runId={workflowViz.runId}
                  input={workflowViz.input}
                  agents={workflowViz.agents}
                  orchestratorStream={workflowViz.orchestratorStream}
                  onOpenStream={setModalStep}
                  onExpandBrowser={setBrowserExpandAgentRunId}
                />
              </div>

              {workflowViz.phase === 'completed' ? (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  {showSaveActions ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={saveBusinessProfile}
                        disabled={isSavingBusinessProfile || !completedBusinessProfilePayload}
                        className="rounded-lg bg-emerald-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title={completedBusinessProfileRunId ? `Run: ${completedBusinessProfileRunId}` : undefined}
                      >
                        {isSavingBusinessProfile ? 'Saving…' : 'Save Business Profile'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelSaveActions}
                        disabled={isSavingBusinessProfile}
                        className="rounded-lg bg-white border border-slate-300 text-slate-800 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSaveActions(true)}
                      disabled={!completedBusinessProfilePayload || isSavingBusinessProfile}
                      className="text-sm text-blue-700 hover:text-blue-800 underline underline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Click here to save
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <SmartModal
        open={Boolean(modalStep)}
        onClose={() => setModalStep(null)}
        animation="top"
        title={modalStep?.title ?? 'Output'}
        size="md"
        contentClassName="p-4"
        showFooter={false}
      >
        {modalStep ? (
          <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap wrap-break-word leading-relaxed">
            {modalStep.body}
          </div>
        ) : null}
      </SmartModal>

      <SmartModal
        open={Boolean(browserExpandAgentRunId && expandedBrowserSession)}
        onClose={() => setBrowserExpandAgentRunId(null)}
        animation="scale"
        showHeader={false}
        showFooter={false}
        size="lg"
        scrollMode="content"
        radius="lg"
      >
        {expandedBrowserSession ? <BrowserExpandModalBody session={expandedBrowserSession} /> : null}
      </SmartModal>

      <SmartModal
        open={sseRawLogOpen}
        onClose={() => setSseRawLogOpen(false)}
        animation="top"
        title="Raw SSE log"
        subtitle={isSubmitting ? 'Streaming…' : undefined}
        size="xl"
        contentClassName="p-0"
        showFooter={false}
        scrollMode="content"
      >
        <div className="max-h-[min(70vh,32rem)] overflow-auto bg-slate-950 px-4 py-3">
          {sseRawLines.length === 0 ? (
            <p className="text-sm text-slate-500 m-0">Waiting for stream lines…</p>
          ) : (
            <pre className="text-xs font-mono text-emerald-400/95 whitespace-pre-wrap break-all m-0">
              {sseRawLines.join('\n')}
            </pre>
          )}
        </div>
      </SmartModal>
    </div>
  )
}

