import React, { useEffect, useRef, useState } from 'react'
import { Check, Play } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useSnackbar } from '../../components/ui/SnackbarProvider'
import { SmartModal } from '../../components/ui/SmartModal'

const WORKFLOW_VIZ_INITIAL = {
  phase: 'idle',
  runId: null,
  input: null,
  agents: [],
  orchestratorStream: null,
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

function streamPayloadFromOutputOrResult(evt) {
  if (!evt || typeof evt !== 'object') return null
  const hasOut = Object.prototype.hasOwnProperty.call(evt, 'output')
  const hasRes = Object.prototype.hasOwnProperty.call(evt, 'result')
  if (!hasOut && !hasRes) return null

  const parts = []
  if (hasOut) parts.push(formatOutputOrResultField('Output', evt.output))
  if (hasRes) parts.push(formatOutputOrResultField('Result', evt.result))
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
            className={`leading-relaxed text-slate-700 whitespace-pre-wrap wrap-break-word ${
              embedded ? 'text-xs' : 'text-sm'
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
        className={`absolute w-full text-left -bottom-4 px-2 py-1.5 text-gray-500 hover:text-gray-700 underline decoration-gray-400 decoration-dashed underline-offset-4 hover:decoration-gray-600 ${
          embedded ? 'text-xs' : 'text-sm'
        }`}
      >
        {preview.truncated ? 'Show more...' : 'View full'}
      </button>
      </div>
    </div>
  )
}

function WorkflowAgentPipeline({ phase, runId, input, agents, orchestratorStream, onOpenStream }) {
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

                    {a.stream ? <StepOutputPeek stream={a.stream} onOpen={onOpenStream} embedded /> : null}

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

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [workflowViz, setWorkflowViz] = useState(WORKFLOW_VIZ_INITIAL)
  const [modalStep, setModalStep] = useState(null)

  const abortRef = useRef(null)

  function stop() {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = null
    setIsSubmitting(false)
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

    setModalStep(null)
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
          }
          // Non-JSON lines are ignored for the workflow UI (no output/result payload).
        }
      }

      // Flush last partial line.
      const last = buffer.trim()
      if (last) {
        const parsed = tryParseJsonLine(last)
        if (parsed) {
          setWorkflowViz((p) => applyWorkflowStreamEvent(p, parsed))
        }
      }
    } catch (e) {
      if (String(e?.name) === 'AbortError') return
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

        <div className="mt-5">
          <WorkflowAgentPipeline
            phase={workflowViz.phase}
            runId={workflowViz.runId}
            input={workflowViz.input}
            agents={workflowViz.agents}
            orchestratorStream={workflowViz.orchestratorStream}
            onOpenStream={setModalStep}
          />
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
    </div>
  )
}

