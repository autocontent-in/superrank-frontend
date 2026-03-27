import { useEffect, useState } from 'react'
import { Check, Globe } from 'lucide-react'

function formatBlogDate(iso) {
  if (iso == null || iso === '') return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function AgentBrowserBlogsSummary({ summary }) {
  if (!summary || typeof summary !== 'object') return null

  if (!summary.blogs_page_found) {
    return (
      <div className="mt-2 ml-6 max-w-xl rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
        The company doesn&apos;t have any blogs page
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

function browserPreviewShowFrame(phase, streamingUrl) {
  return (phase === 'progress' || phase === 'complete') && Boolean(streamingUrl)
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

  return (
    <div className="ml-6 mb-10 max-w-md">
      <div className="relative mt-2">
        <div className="relative max-h-96 overflow-hidden rounded-md border-x border-t border-slate-100 bg-white px-2 py-1.5">
          <div
            className={`leading-relaxed text-slate-700 whitespace-pre-wrap wrap-break-word ${embedded ? 'text-xs' : 'text-sm'}`}
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
          className={`absolute w-full text-left -bottom-4 px-2 py-1.5 text-gray-500 hover:text-gray-700 underline decoration-gray-400 decoration-dashed underline-offset-4 hover:decoration-gray-600 ${embedded ? 'text-xs' : 'text-sm'}`}
        >
          {preview.truncated ? 'Show more...' : 'View full'}
        </button>
      </div>
    </div>
  )
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
          @keyframes ac-blog-stack-bar {
            0%, 100% { transform: scaleY(0.35); opacity: 0.4; }
            50% { transform: scaleY(1); opacity: 1; }
          }
          .ac-blog-stack-bar {
            transform-origin: bottom center;
            animation: ac-blog-stack-bar 0.75s ease-in-out infinite;
          }
        `}
      </style>
      <div className="flex min-h-10 items-end gap-px sm:gap-0.5 py-2 pr-2">
        {Array.from({ length: barCount }, (_, i) => (
          <div
            key={i}
            className="ac-blog-stack-bar w-[3px] sm:w-1 rounded-full bg-gray-300 transition-all duration-300"
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

/** Same pipeline visualization as Business Profile workflows. */
export function BlogWorkflowPipeline({
  phase,
  runId,
  input,
  agents,
  orchestratorStream,
  onOpenStream,
  onExpandBrowser,
}) {
  const idle = phase === 'idle' && agents.length === 0

  const runActive = phase === 'starting' || phase === 'running'
  const runDone = phase === 'completed'
  const orchestratorLive = runActive && !runDone

  const orchestrationSub =
    input && (input.website || input.business_name || input.company_website || input.company_name)
      ? [input.business_name || input.company_name, input.website || input.company_website].filter(Boolean).join(' · ')
      : runId
        ? `Run ${String(runId).slice(0, 8)}…`
        : ''

  if (idle) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
        Workflow output will stream here — orchestrator, then agents and tools.
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
                  {orchestrationSub ? (
                    <div className="text-xs text-slate-500 mt-0.5 truncate max-w-md">{orchestrationSub}</div>
                  ) : null}
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
                  <div key={a.agent_run_id}>
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
