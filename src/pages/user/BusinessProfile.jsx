import React, { useEffect, useRef, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useSnackbar } from '../../components/ui/SnackbarProvider'

const WORKFLOW_VIZ_INITIAL = {
  phase: 'idle',
  runId: null,
  input: null,
  agents: [],
}

/** Derive UI state from streamed backend events (NDJSON / SSE). */
function applyWorkflowStreamEvent(prev, evt) {
  if (!evt || typeof evt !== 'object') return prev

  if (evt.type === 'workflow') {
    if (evt.event === 'starting') {
      return {
        phase: 'starting',
        runId: evt.run_id ?? null,
        input: evt.input ?? null,
        agents: [],
      }
    }
    if (evt.event === 'started') {
      return { ...prev, phase: 'running' }
    }
    if (evt.event === 'completed') {
      return { ...prev, phase: 'completed' }
    }
    return prev
  }

  if (evt.type === 'agent') {
    if (evt.event === 'starting') {
      if (prev.agents.some((a) => a.agent_run_id === evt.agent_run_id)) return prev
      const agents = [
        ...prev.agents,
        {
          agent_id: evt.agent_id,
          agent_name: evt.agent_name || evt.agent_id,
          agent_run_id: evt.agent_run_id,
          status: 'running',
        },
      ]
      return { ...prev, agents }
    }
    if (evt.event === 'completed') {
      const agents = prev.agents.map((a) =>
        a.agent_run_id === evt.agent_run_id ? { ...a, status: 'done' } : a
      )
      return { ...prev, agents }
    }
  }

  return prev
}

function LiveOrchestratorRipple({ live, completed }) {
  if (completed) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-50 shadow-[0_0_16px_rgba(16,185,129,0.35)]">
        <Check className="h-5 w-5 text-emerald-600" strokeWidth={2.5} aria-hidden />
      </div>
    )
  }
  if (!live) {
    return <div className="h-11 w-11 shrink-0 rounded-full border-2 border-slate-200 bg-slate-100" aria-hidden />
  }
  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden>
      <span className="absolute inline-flex h-11 w-11 rounded-full bg-emerald-400/60 motion-safe:animate-ping" />
      <span
        className="absolute inline-flex h-9 w-9 rounded-full bg-emerald-400/45 motion-safe:animate-ping"
        style={{ animationDelay: '0.35s' }}
      />
      <span className="relative flex h-3.5 w-3.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)] ring-2 ring-emerald-300/80" />
    </div>
  )
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
      setBarCount((n) => (n >= 22 ? 22 : n + 1))
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
            className="ac-stack-bar w-[3px] sm:w-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.45)] transition-all duration-300"
            style={{
              height: `${8 + (i % 7) * 4}px`,
              animationDelay: `${(i * 0.06).toFixed(2)}s`,
            }}
          />
        ))}
        <div className="ml-3 flex min-w-0 flex-col justify-end pb-0.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-700/90 motion-safe:animate-pulse">
            Streaming…
          </span>
          <span className="text-[10px] text-slate-500">Appends until orchestration completes</span>
        </div>
      </div>
    </>
  )
}

/** Left rail `w-11` (2.75rem); spine x = horizontal padding + half rail. */
const TREE_RAIL_W = 'w-11'
const TREE_GAP = 'gap-3 sm:gap-4'

function TreeRow({ children, rail }) {
  return (
    <div className={`flex min-w-0 items-stretch ${TREE_GAP}`}>
      <div className={`relative flex shrink-0 ${TREE_RAIL_W} items-center justify-center`}>{rail}</div>
      <div className="min-w-0 flex-1 min-h-0">{children}</div>
    </div>
  )
}

function TreeSpine({ tone }) {
  return (
    <div
      className={`pointer-events-none absolute top-12 bottom-3 w-px -translate-x-1/2 bg-linear-to-b left-8.5 sm:left-9.5 ${tone} opacity-90`}
      aria-hidden
    />
  )
}

function TreeJoint() {
  return (
    <span
      className="relative z-10 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white bg-emerald-500 shadow-sm ring-1 ring-emerald-400/50"
      aria-hidden
    />
  )
}

function TreeElbow() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 z-1 h-px w-8.5 -translate-y-1/2 bg-emerald-300/95 sm:w-9.5"
      aria-hidden
    />
  )
}

function TreeRowEntrance({ children, className = '' }) {
  return (
    <div
      className={`opacity-0 animate-[ac-tree-in_0.42s_ease-out_forwards] motion-reduce:animate-none motion-reduce:opacity-100 ${className}`}
    >
      {children}
    </div>
  )
}

function AgentStepCard({ title, subtitle, status }) {
  const done = status === 'done'
  const active = status === 'running' || status === 'starting'

  const shell =
    done
      ? 'border-emerald-300 bg-emerald-50/90 text-emerald-900'
      : active
        ? 'border-sky-400 bg-sky-50/95 text-sky-950 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]'
        : 'border-slate-200 bg-slate-50 text-slate-600'

  return (
    <div
      className={`relative flex w-full min-w-0 max-w-full rounded-xl border px-3 py-2.5 transition-all duration-300 ${shell} ${
        active ? 'motion-safe:animate-pulse' : ''
      }`}
    >
      <div className="flex items-start gap-2 w-full min-w-0">
        <div className="mt-0.5 shrink-0">
          {done ? (
            <Check className="w-4 h-4 text-emerald-600" strokeWidth={2.5} aria-hidden />
          ) : active ? (
            <Loader2 className="w-4 h-4 text-sky-600 animate-spin" aria-hidden />
          ) : (
            <span className="block w-4 h-4 rounded-full border-2 border-slate-300 bg-white" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Agent</div>
          <div className="text-sm font-medium leading-snug truncate" title={title}>
            {title}
          </div>
          {subtitle ? <div className="text-[11px] text-slate-500 mt-0.5 truncate" title={subtitle}>{subtitle}</div> : null}
        </div>
      </div>
    </div>
  )
}

function WorkflowAgentPipeline({ phase, runId, input, agents }) {
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

  const shellRing =
    runDone
      ? 'border-emerald-200 bg-gradient-to-b from-emerald-50/35 to-white shadow-[inset_0_1px_0_0_rgba(16,185,129,0.1)]'
      : orchestratorLive
        ? 'border-emerald-200/90 bg-gradient-to-b from-emerald-50/40 to-white shadow-[inset_0_0_0_1px_rgba(16,185,129,0.08)]'
        : 'border-slate-200 bg-white'

  if (idle) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
        A <strong className="font-medium text-slate-700">tree</strong> will appear: live orchestrator (green ripple), then{' '}
        <strong className="font-medium text-slate-700">agents</strong> one under another, then a streaming loader until the run completes.
      </div>
    )
  }

  const spineTone = runDone ? 'from-emerald-300 via-emerald-200/80 to-slate-200/90' : 'from-emerald-400 via-emerald-300/70 to-slate-200/80'

  return (
    <div className={`rounded-xl border p-1 shadow-sm transition-colors duration-300 ${shellRing}`}>
      <div className="relative rounded-[10px] border border-slate-100/80 bg-white/95 px-3 py-3 sm:px-4">
        <style>
          {`
            @keyframes ac-tree-in {
              from { opacity: 0; transform: translateY(-5px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}
        </style>
        <TreeSpine tone={spineTone} />

        <div className="relative flex min-w-0 flex-col gap-3">
          <TreeRowEntrance>
            <TreeRow
              rail={
                <div className="flex flex-col items-center justify-start pt-0.5">
                  <div className="relative z-10">
                    <LiveOrchestratorRipple live={orchestratorLive} completed={runDone} />
                  </div>
                </div>
              }
            >
              <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-sm transition-shadow duration-300">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80">Orchestrator</div>
                    <div className="text-sm font-semibold text-slate-900">Workflow run</div>
                    {orchestrationSub ? (
                      <div className="mt-1 truncate text-xs text-slate-600" title={orchestrationSub}>
                        {orchestrationSub}
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    {runDone ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800">
                        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                        Done
                      </span>
                    ) : orchestratorLive ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50/90 px-2 py-1 text-[11px] font-medium text-emerald-900">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        {phase === 'starting' ? 'Starting…' : 'Live'}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
                        Idle
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </TreeRow>
          </TreeRowEntrance>

          {agents.length === 0 && !orchestratorLive ? (
            <TreeRowEntrance>
              <TreeRow
                rail={
                  <div className="relative flex w-full items-center justify-center">
                    <TreeJoint />
                    <TreeElbow />
                  </div>
                }
              >
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-5 text-center text-sm text-slate-500">
                  No agent steps in this run.
                </div>
              </TreeRow>
            </TreeRowEntrance>
          ) : null}

          {agents.length === 0 && orchestratorLive ? (
            <TreeRowEntrance>
              <TreeRow
                rail={
                  <div className="relative flex w-full items-center justify-center">
                    <TreeJoint />
                    <TreeElbow />
                  </div>
                }
              >
                <div className="space-y-3">
                  <div className="rounded-lg border border-dashed border-emerald-200/70 bg-emerald-50/30 px-3 py-4 text-center text-sm text-emerald-900 motion-safe:animate-pulse">
                    Waiting for agents…
                  </div>
                  <div className="rounded-lg border border-emerald-100/80 bg-emerald-50/20 px-2 py-1 transition-colors duration-300">
                    <StreamingTailLoader active={orchestratorLive} />
                  </div>
                </div>
              </TreeRow>
            </TreeRowEntrance>
          ) : null}

          {agents.map((a) => (
            <TreeRowEntrance key={a.agent_run_id}>
              <TreeRow
                rail={
                  <div className="relative flex w-full items-center justify-center">
                    <TreeJoint />
                    <TreeElbow />
                  </div>
                }
              >
                <AgentStepCard title={a.agent_name} subtitle={a.agent_id} status={a.status === 'done' ? 'done' : 'running'} />
              </TreeRow>
            </TreeRowEntrance>
          ))}

          {orchestratorLive && agents.length > 0 ? (
            <TreeRowEntrance>
              <TreeRow
                rail={
                  <div className="relative flex w-full items-center justify-center">
                    <TreeJoint />
                    <TreeElbow />
                  </div>
                }
              >
                <div className="rounded-lg border border-emerald-100/80 bg-emerald-50/20 px-2 py-1 transition-colors duration-300">
                  <StreamingTailLoader active={orchestratorLive} />
                </div>
              </TreeRow>
            </TreeRowEntrance>
          ) : runDone ? (
            <TreeRowEntrance>
              <TreeRow
                rail={
                  <div className="relative flex w-full items-center justify-center">
                    <TreeJoint />
                    <TreeElbow />
                  </div>
                }
              >
                <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2.5 text-xs text-emerald-800">
                  <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
                  <span>Orchestration finished — stream settled.</span>
                </div>
              </TreeRow>
            </TreeRowEntrance>
          ) : null}
        </div>

        <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-400">
          <span className="font-medium text-slate-500">Events:</span> orchestrator follows <code className="text-slate-600">workflow</code> start/complete; each{' '}
          <code className="text-slate-600">agent</code> step nests below in order.
        </p>
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

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [output, setOutput] = useState('')
  const [workflowViz, setWorkflowViz] = useState(WORKFLOW_VIZ_INITIAL)

  const abortRef = useRef(null)
  const outputRef = useRef('')
  const pendingRef = useRef('')
  const rafRef = useRef(0)

  function flushPending() {
    if (!pendingRef.current) return
    outputRef.current += pendingRef.current
    pendingRef.current = ''
    setOutput(outputRef.current)
  }

  function scheduleFlush() {
    if (rafRef.current) return
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0
      flushPending()
    })
  }

  function append(line) {
    if (!line) return
    pendingRef.current += line
    scheduleFlush()
  }

  function stop() {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = null
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    flushPending()
    setIsSubmitting(false)
    // append('\n\n[Stopped]')
  }

  useEffect(() => {
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createBusinessProfile() {
    if (isSubmitting) return

    if (!company_name || !company_website) {
      showSnackbar({
        message: 'Add a company name and website first (from your selected company).',
        variant: 'error',
        duration: 4000,
      })
      return
    }

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    outputRef.current = ''
    pendingRef.current = ''
    setOutput('')
    setWorkflowViz(WORKFLOW_VIZ_INITIAL)
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
            company_name,
            company_website,
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
          const trimmed = line.trim()
          if (!trimmed) continue

          // Try JSON first; fallback to raw line output.
          const parsed = tryParseJsonLine(trimmed)
          if (parsed) {
            setWorkflowViz((p) => applyWorkflowStreamEvent(p, parsed))
            append(JSON.stringify(parsed, null, 2) + '\n')
          } else {
            const maybeData = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed
            if (maybeData) append(maybeData + '\n')
          }
        }
      }

      // Flush last partial line.
      const last = buffer.trim()
      if (last) {
        const parsed = tryParseJsonLine(last)
        if (parsed) {
          setWorkflowViz((p) => applyWorkflowStreamEvent(p, parsed))
          append(JSON.stringify(parsed, null, 2) + '\n')
        } else append(last + '\n')
      }

      append('\n\n[Done]\n')
    } catch (e) {
      if (String(e?.name) === 'AbortError') return
      append(`\n\n[Error] ${e?.message || String(e)}\n`)
    } finally {
      flushPending()
      abortRef.current = null
      setIsSubmitting(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-12 sm:pt-6 sm:pb-16 w-full min-h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-[240px]">
            <h2 className="text-xl font-semibold text-slate-900">Business Profile</h2>
            <p className="text-sm text-slate-600 mt-1">
              {company_name ? <span className="font-medium text-slate-800">{company_name}</span> : <span className="text-slate-400">No company selected</span>}
              {company_website ? (
                <span className="block text-xs text-slate-500 mt-1 break-all">Website: {company_website}</span>
              ) : null}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={createBusinessProfile}
              disabled={isSubmitting || !company_name || !company_website}
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
          </div>
        </div>

        {/* <pre className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap wrap-break-word min-h-[140px]">
          {output || (isSubmitting ? '…' : 'Click the button to create your business profile.')}
        </pre> */}

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Workflow status</h3>
          <WorkflowAgentPipeline
            phase={workflowViz.phase}
            runId={workflowViz.runId}
            input={workflowViz.input}
            agents={workflowViz.agents}
          />
        </div>
      </div>
    </div>
  )
}

