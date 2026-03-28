import React, { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Loader2,
  Logs,
  Play,
  Square,
  TrendingUp,
} from 'lucide-react'
import AiApi from '../../api/AiApi'

function tryParseJsonLine(line) {
  let s = line.trim()
  if (!s) return null

  // Support both plain NDJSON and SSE-style `data: {...}`
  if (s.startsWith('data:')) s = s.slice(5).trim()
  if (s === '[DONE]' || s.toLowerCase() === 'done') return null

  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

function formatResultPayload(result) {
  if (result == null) return ''
  if (typeof result === 'string') return result.trim()
  if (typeof result === 'object') {
    try {
      return JSON.stringify(result, null, 2)
    } catch {
      return String(result)
    }
  }
  return String(result)
}

export default function TinyFishAnalyze() {
  const [step, setStep] = useState(1)
  const [userQueryInput, setUserQueryInput] = useState('')
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [llmQueryItems, setLlmQueryItems] = useState([])
  const [isPossible, setIsPossible] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [streamingUrl, setStreamingUrl] = useState('')
  const [phase, setPhase] = useState('idle') // idle | starting | ready | progress | complete | error | stopped
  const [currentPurpose, setCurrentPurpose] = useState('')
  const [result, setResult] = useState(null)
  const [events, setEvents] = useState([]) // streamed status objects
  const [isLogsOpen, setIsLogsOpen] = useState(true)

  const abortRef = useRef(null)

  const aiBaseUrl = import.meta.env.VITE_APP_AI_API || 'http://localhost:8000'

  // Styling is handled via Tailwind utility classes (no raw inline CSS objects).

  function stop() {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = null
    setIsRunning(false)
    setPhase((p) => (p === 'complete' ? p : 'stopped'))
  }

  async function handleGenerateWebAgentQuery() {
    if (isGeneratingPrompt) return
    const query = userQueryInput.trim()
    if (!query) return

    setIsGeneratingPrompt(true)
    try {
      const { data: res } = await AiApi.post('/generate-web-agent-query', { data: { query } })
      // e.g. { "data": { is_possible, llm_query: [{ url, goal }, ...] } } or nested data.data
      const payload = res?.data?.data ?? res?.data ?? res
      const rawLlm = payload?.llm_query
      let items = []
      if (Array.isArray(rawLlm)) {
        items = rawLlm
          .map((row) => ({
            url: String(row?.url ?? '').trim(),
            goal: String(row?.goal ?? '').trim(),
          }))
          .filter((row) => row.url || row.goal)
      } else if (typeof rawLlm === 'string' && rawLlm.trim()) {
        const websites = Array.isArray(payload?.websites)
          ? payload.websites.map((site) => String(site || '').trim()).filter(Boolean)
          : []
        items =
          websites.length > 0
            ? websites.map((url) => ({ url, goal: rawLlm.trim() }))
            : [{ url: '', goal: rawLlm.trim() }]
      }
      setIsPossible(payload?.is_possible !== false)
      setLlmQueryItems(items)
      setStep(2)
    } catch (e) {
      const message = e?.response?.data?.detail?.message || e?.response?.data?.message || e?.message || 'Failed to generate query.'
      setPhase('error')
      pushEvent({
        type: 'ERROR',
        timestamp: new Date().toISOString(),
        error: String(message),
      })
    } finally {
      setIsGeneratingPrompt(false)
    }
  }

  useEffect(() => {
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pushEvent(evt) {
    setEvents((prev) => [...prev, evt])
  }

  function handleStatusEvent(evt) {
    const type = evt?.type
    if (!type) return

    if (type === 'STARTED') {
      setPhase('starting')
      setCurrentPurpose('')
      setResult(null)
      setStreamingUrl('')
    } else if (type === 'STREAMING_URL') {
      const url = evt.streaming_url || evt.url || ''
      setStreamingUrl(url)
      setPhase('ready')
    } else if (type === 'PROGRESS') {
      setPhase('progress')
      setCurrentPurpose(evt.purpose || '')
    } else if (type === 'COMPLETE') {
      setPhase('complete')
      setCurrentPurpose('')
      setResult(evt.result ?? null)
    }

    pushEvent(evt)
  }

  async function start() {
    if (isRunning) return

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    // Reset run state
    setEvents([])
    setStreamingUrl('')
    setPhase('starting')
    setCurrentPurpose('')
    setResult(null)
    setIsRunning(true)

    try {
      const streamBase = String(aiBaseUrl || '').replace(/\/$/, '')
      const url = `${streamBase}/tinyfish/test/stream`

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            llm_query: llmQueryItems,
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

      // The API you shared looks like newline-delimited JSON objects.
      // We also support SSE `data: {...}` lines by stripping a leading `data:`.
      let buffer = ''
      let sawComplete = false

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const evt = tryParseJsonLine(line)
          if (!evt) continue
          handleStatusEvent(evt)
          if (evt.type === 'COMPLETE') {
            sawComplete = true
            break
          }
        }

        if (sawComplete) break
      }

      const lastEvt = tryParseJsonLine(buffer)
      if (!sawComplete && lastEvt) handleStatusEvent(lastEvt)
    } catch (e) {
      if (String(e?.name) === 'AbortError') return
      setPhase('error')
      pushEvent({
        type: 'ERROR',
        timestamp: new Date().toISOString(),
        error: e?.message || String(e),
      })
    } finally {
      setIsRunning(false)
    }
  }

  function formatLogTime(ts) {
    const d = ts ? new Date(ts) : new Date()
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  }

  function eventToLogLine(evt) {
    const type = String(evt?.type || 'EVENT').toUpperCase()
    const ts = evt?.timestamp
    const t = formatLogTime(ts)

    let message = ''
    if (type === 'PROGRESS') message = evt?.purpose || ''
    else if (type === 'STREAMING_URL') message = evt?.streaming_url || evt?.url || ''
    else if (type === 'STARTED') message = 'Started'
    else if (type === 'COMPLETE') message = formatResultPayload(evt?.result) || 'Complete'
    else if (type === 'ERROR') message = `Error: ${evt?.error || ''}`.trim()
    else message = evt?.message || evt?.detail || evt?.purpose || ''

    const safeMessage = String(message || '').trim()
    return `[${t}] [${type}] ${safeMessage}`.trimEnd()
  }

  function eventToPlainMessage(evt) {
    const type = String(evt?.type || '').toUpperCase()
    if (type === 'PROGRESS') return String(evt?.purpose || '').trim()
    if (type === 'COMPLETE') return 'Complete'
    return ''
  }

  const textEvents = events.filter((evt) => {
    const type = String(evt?.type || '').toUpperCase()
    return type === 'PROGRESS' || type === 'COMPLETE'
  })

  const sidebarEvents = events.filter((evt) => {
    const type = String(evt?.type || '').toUpperCase()
    return type === 'STARTED' || type === 'HEARTBEAT' || type === 'PROGRESS' || type === 'COMPLETE'
  })

  function sidebarEventMessage(evt) {
    const type = String(evt?.type || '').toUpperCase()
    if (type === 'PROGRESS') return String(evt?.purpose || '').trim()
    if (type === 'STARTED') return 'Started'
    if (type === 'HEARTBEAT') return String(evt?.message || evt?.detail || 'Heartbeat').trim()
    if (type === 'COMPLETE') return eventToPlainMessage(evt) || 'Complete'
    return ''
  }

  const latestTextEvent = textEvents.length > 0 ? textEvents[textEvents.length - 1] : null
  const latestPlainText = latestTextEvent ? eventToPlainMessage(latestTextEvent) : ''
  const isLive = isRunning || phase === 'starting' || phase === 'progress'
  const latestType = String(latestTextEvent?.type || '').toUpperCase()
  const isComplete = latestType === 'COMPLETE'
  const statusDot = isComplete
    ? { dot: 'bg-orange-500', ping: 'bg-orange-400' }
    : { dot: 'bg-green-500', ping: 'bg-green-400' }

  const addressBarText =
    streamingUrl ||
    (phase === 'starting' || phase === 'progress'
      ? 'Loading…'
      : phase === 'complete'
        ? streamingUrl || 'Complete'
        : '')

  if (step === 1) {
    return (
      <div className="w-full h-full min-h-0 flex-1 bg-slate-50 px-6 py-8">
        <div className="h-full w-full flex items-center justify-center">
          <div className="w-full max-w-4xl flex flex-col gap-3">
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-white">
                <div className="text-xs font-semibold tracking-wide uppercase text-slate-500">Agent Instructions</div>
              </div>

              <div className="relative">
                <textarea
                  value={userQueryInput}
                  onChange={(e) => setUserQueryInput(e.target.value)}
                  placeholder="What should your agent do?"
                  className="w-full h-[280px] md:h-[280px] resize-none bg-white px-6 py-6 pr-24 text-base text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />

                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-slate-200" />

                <div className="absolute bottom-5 right-5">
                  <button
                    type="button"
                    onClick={handleGenerateWebAgentQuery}
                    disabled={isGeneratingPrompt || !userQueryInput.trim()}
                    className="pointer-events-auto inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    {isGeneratingPrompt ? (
                      <>
                        <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden />
                        Please wait...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setUserQueryInput('Current SEO trends in google search engine')}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <TrendingUp className="w-4 h-4 shrink-0 text-slate-500" aria-hidden />
                SEO Tends
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="w-full h-full min-h-0 flex-1 bg-slate-50 px-6 py-8">
        <div className="h-full w-full flex items-center justify-center">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8 flex flex-col gap-6">
            <div>
              <span className="text-xs font-semibold tracking-wide uppercase text-white bg-slate-400 px-2 py-1 rounded-md">Your Query</span>
              <p className="mt-2 text-base text-slate-800 whitespace-pre-wrap">{userQueryInput.trim()}</p>
            </div>

            <hr className="border-dashed border-slate-300" />

            <div>
              <span className="text-xs font-semibold tracking-wide uppercase text-white bg-blue-400 px-2 py-1 rounded-md">AI Response</span>
              <div className="mt-3 flex flex-col gap-4">
                {llmQueryItems.length > 0 ? (
                  llmQueryItems.map((row, idx) => (
                    <div
                      key={`${row.url}-${idx}`}
                      className=""
                    >
                      <p className="mt-1 text-slate-800 whitespace-pre-wrap">{row.goal || '—'}</p>
                      <p className="mt-2 text-orange-600 break-all">{row.url || '—'}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No AI response items returned.</p>
                )}
              </div>
              {!isPossible ? (
                <p className="mt-6 text-sm font-medium text-red-600 bg-red-50 px-2 py-2 border border-red-200 rounded-md">
                  Note: Before you continue, your query might break the AI response
                </p>
              ) : null}
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(3)
                  start()
                }}
                disabled={llmQueryItems.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                Run
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full min-h-0 flex-1 flex bg-white relative">
      {/* When logs are hidden, show toggle at top-right under navbar */}
      {!isLogsOpen ? (
        <div className="absolute top-2 right-3 z-10">
          <button
            className="px-2 py-2 flex items-center space-x-2 rounded-md bg-white text-gray-700 hover:text-gray-900 shadow-xs hover:shadow"
            onClick={() => setIsLogsOpen(true)}
            type="button"
            aria-label="Show logs"
            title="Show logs"
          >
            <Logs className="w-4 h-4" />
            <span className="text-xs font-medium">Show Logs</span>
          </button>
        </div>
      ) : null}
      {/* Middle column: browser */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        {/* Middle browser view */}
        <div className="flex-1 min-h-0 overflow-auto bg-gray-50 px-4 py-4">
          <div className="min-h-full flex items-center justify-center">
            <div className="w-full max-w-[1024px] min-w-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
              {/* Header aligned with Logs header */}
              <div className="px-2 py-2 bg-white border-b border-slate-200 flex items-center gap-2">
                <button
                  className="inline-flex items-center justify-center rounded-md bg-white border border-slate-300 text-slate-800 w-9 h-9 hover:bg-slate-50 disabled:bg-white disabled:border-slate-200 disabled:text-slate-400 disabled:opacity-100 disabled:cursor-not-allowed"
                  onClick={() => start()}
                  disabled={isRunning}
                  type="button"
                  aria-label={isRunning ? 'Running' : 'Start'}
                  title={isRunning ? 'Running' : 'Start'}
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-md bg-white border border-slate-300 text-slate-800 w-9 h-9 hover:bg-slate-50 disabled:bg-white disabled:border-slate-200 disabled:text-slate-400 disabled:opacity-100 disabled:cursor-not-allowed"
                  onClick={stop}
                  disabled={!isRunning}
                  type="button"
                  aria-label="Stop"
                  title="Stop"
                >
                  <Square className="w-4 h-4" />
                </button>

                <div className="ml-1 min-w-0 font-mono text-xs text-slate-500 truncate flex-1">
                  {addressBarText || '—'}
                </div>
              </div>

              <div className="w-full bg-slate-800 flex flex-col">
                {/* Don't show the browser screen until streaming_url */}
                <div className="w-full h-[600px] max-h-[600px]">
                  {phase === 'complete' ? (
                    <div className="h-full flex flex-col items-stretch justify-center text-slate-200 gap-3 p-4 overflow-auto">
                      {result != null ? (
                        <pre className="mx-auto max-w-full text-left text-sm font-mono text-slate-200 whitespace-pre-wrap wrap-break-word">
                          {formatResultPayload(result)}
                        </pre>
                      ) : (
                        <div className="text-center text-sm text-slate-400">No result in COMPLETE event.</div>
                      )}
                    </div>
                  ) : streamingUrl ? (
                    <iframe
                      title="webagent-stream"
                      src={streamingUrl}
                      className="w-full h-full max-w-full max-h-full border-0 outline-none"
                      allow="autoplay"
                    />
                  ) : phase === 'starting' || phase === 'progress' || isRunning ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-3 p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 shrink-0 animate-spin text-slate-200" aria-hidden />
                        <div className="font-semibold">Please wait...</div>
                      </div>
                      <div className="text-xs text-slate-300/90">Loading the browser...</div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-2 p-4 text-center">
                      <div className="font-semibold">Click Start</div>
                      <div className="text-xs text-slate-300/90">Waiting to start…</div>
                    </div>
                  )}
                </div>

                <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3">
                  {latestPlainText ? (
                    <div className="flex items-center space-x-2">
                      <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
                        {isLive && !isComplete ? (
                          <span
                            className={`absolute inline-flex h-full w-full rounded-full ${statusDot.ping} opacity-60 animate-ping`}
                          />
                        ) : null}
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusDot.dot}`} />
                      </span>
                      <div className="text-sm text-gray-600 whitespace-pre-wrap wrap-break-word">{latestPlainText}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">Your agent actions will appear here</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right logs sidebar: animated show/hide */}
      <div
        className="h-full shrink-0 overflow-hidden border-l border-slate-200 bg-white transition-[width] duration-200 ease-in-out"
        style={{ width: isLogsOpen ? 480 : 0 }}
      >
        <aside
          className={`w-[480px] h-full bg-white flex flex-col min-h-0 transition-transform duration-200 ease-in-out ${isLogsOpen ? 'translate-x-0' : 'translate-x-full'}`}
          aria-hidden={!isLogsOpen}
        >
          <div className="pl-4 pr-2 py-2 border-b border-slate-200 bg-white flex items-center">
            <div className="font-semibold text-slate-900">
              Logs <span className="font-normal text-xs text-slate-400">[ {sidebarEvents.length} messages ]</span>
            </div>
            <div className="flex-1" />
            <button
              className="inline-flex items-center justify-center rounded-md bg-gray-100 text-slate-700 hover:bg-slate-50 w-9 h-9"
              onClick={() => setIsLogsOpen(false)}
              type="button"
              aria-label="Hide logs"
              title="Hide logs"
            >
              <Logs className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-auto p-3">
            {sidebarEvents.length === 0 ? (
              <div className="text-sm text-slate-500">Starting will stream status updates here.</div>
            ) : (
              <div className="space-y-1">
                {sidebarEvents.map((evt, idx) => {
                  const type = String(evt?.type || '').toUpperCase()
                  const icon =
                    type === 'PROGRESS' ? (
                      <span className="my-1 inline-block h-2 w-2 rounded-full bg-green-400" />
                    ) : type === 'HEARTBEAT' ? (
                      <Heart className="my-0.5 w-3.5 h-3.5 text-pink-500" />
                    ) : type === 'STARTED' ? (
                      <span className="my-1 inline-block h-2 w-2 rounded-full bg-yellow-400" />
                    ) : type === 'COMPLETE' ? (
                      <span className="my-1 inline-block h-2 w-2 bg-orange-400" />
                    ) : null

                  const t = formatLogTime(evt?.timestamp)
                  const message = sidebarEventMessage(evt)
                  return (
                    <div
                      key={`${evt?.type || 'evt'}-${idx}`}
                      className="flex flex-col text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 whitespace-pre-wrap wrap-break-word gap-2"
                    >
                      <span className="font-mono text-slate-500">{`[${t}] [${type}]`}</span>
                      <div className="flex items-start space-x-2 min-w-0">
                        {icon}
                        {type === 'COMPLETE' ? (
                          <div className="min-w-0 flex-1 space-y-2">
                            <p className="text-slate-800">
                              {evt.status ? String(evt.status) : 'COMPLETE'}
                            </p>
                            {evt.result != null ? (
                              <pre className="font-mono text-[12px] text-slate-700 overflow-x-auto whitespace-pre-wrap wrap-break-word">
                                {formatResultPayload(evt.result)}
                              </pre>
                            ) : null}
                          </div>
                        ) : (
                          <p>{message}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
