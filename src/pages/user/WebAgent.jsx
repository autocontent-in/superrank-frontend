import React, { useEffect, useRef, useState } from 'react'
import { Heart, Logs, Play, Square } from 'lucide-react'

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

export default function TinyFishAnalyze() {
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
      const url = 'http://localhost:8000/tinyfish/test/stream'

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: '' }),
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
    else if (type === 'COMPLETE') message = 'Complete'
    else if (type === 'ERROR') message = `Error: ${evt?.error || ''}`.trim()
    else message = evt?.message || evt?.detail || evt?.purpose || ''

    const safeMessage = String(message || '').trim()
    return `[${t}] [${type}] ${safeMessage}`.trimEnd()
  }

  function eventToPlainMessage(evt) {
    const type = String(evt?.type || '').toUpperCase()
    if (type === 'PROGRESS') return String(evt?.purpose || '').trim()
    if (type === 'COMPLETE') {
      const completed = evt?.result ?? result
      if (typeof completed === 'string') return completed.trim()
      return 'Complete'
    }
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
        <div className="flex-1 min-h-0 overflow-auto bg-slate-100 px-4 py-4">
          <div className="min-h-full flex items-center justify-center">
            <div className="w-full max-w-[1024px] min-w-0 flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
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

            <div className="bg-slate-900 flex flex-col">
              {/* Don't show the browser screen until streaming_url */}
              <div className="w-full h-[600px] max-h-[600px] max-w-[1024px]">
                {phase === 'complete' ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-2 p-4 text-center">
                    <div className="font-semibold">Streaming is complete.</div>
                  </div>
                ) : streamingUrl ? (
                  <iframe
                    title="webagent-stream"
                    src={streamingUrl}
                    className="w-full h-full border-0"
                    allow="autoplay"
                  />
                ) : phase === 'starting' || phase === 'progress' || isRunning ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-2 p-4 text-center">
                    <div className="font-semibold">Browser View is loading</div>
                    <div className="text-xs text-slate-300/90">Waiting for STREAMING_URL…</div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-2 p-4 text-center">
                    <div className="font-semibold">Click Start</div>
                    <div className="text-xs text-slate-300/90">Waiting to start…</div>
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t bg-gray-50 px-3 py-3">
                {latestPlainText ? (
                  <div className="flex items-center space-x-2">
                    <span className="relative mt-0.5 inline-flex h-2.5 w-2.5 shrink-0">
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
                      <div className="flex items-start space-x-2">
                        {icon}
                        <p>{message}</p>
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
