import React, { useEffect, useRef, useState } from 'react'

function tryParseJsonLine(line) {
  let s = line.trim()
  if (!s) return null

  if (s.startsWith('data:')) s = s.slice(5).trim()
  if (s === '[DONE]' || s.toLowerCase() === 'done') return null

  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

const initialParallelState = {
  runOrder: [],
  runs: {},
  agentToRunId: {},
}

function applyParallelEnvelope(prev, envelope) {
  const agent = envelope?.agent
  const ev = envelope?.event_data
  if (!ev?.type) return prev

  let runId = ev.run_id
  if (!runId && ev.type === 'HEARTBEAT' && typeof agent === 'number') {
    runId = prev.agentToRunId[agent]
  }
  if (!runId) return prev

  let runOrder = prev.runOrder
  if (!runOrder.includes(runId)) {
    runOrder = [...runOrder, runId]
  }

  const agentToRunId =
    ev.type === 'STARTED' && typeof agent === 'number'
      ? { ...prev.agentToRunId, [agent]: runId }
      : prev.agentToRunId

  const prevRun = prev.runs[runId] || {
    runId,
    agent: agent ?? null,
    streamingUrl: '',
    phase: 'idle',
    currentPurpose: '',
    result: null,
    events: [],
  }

  let nextRun = { ...prevRun, agent: agent ?? prevRun.agent }
  const type = ev.type

  if (type === 'STARTED') {
    nextRun = {
      ...nextRun,
      phase: 'starting',
      currentPurpose: '',
      result: null,
      streamingUrl: '',
      events: [],
    }
  } else if (type === 'STREAMING_URL') {
    nextRun = {
      ...nextRun,
      streamingUrl: ev.streaming_url || ev.url || '',
      phase: 'ready',
    }
  } else if (type === 'PROGRESS') {
    nextRun = { ...nextRun, phase: 'progress', currentPurpose: ev.purpose || '' }
  } else if (type === 'COMPLETE') {
    nextRun = { ...nextRun, phase: 'complete', currentPurpose: '', result: ev.result ?? null }
  } else if (type === 'ERROR') {
    nextRun = { ...nextRun, phase: 'error' }
  }

  nextRun = {
    ...nextRun,
    events: [...nextRun.events, { ...ev }],
  }

  return {
    runOrder,
    agentToRunId,
    runs: { ...prev.runs, [runId]: nextRun },
  }
}

function shortRunId(runId) {
  if (!runId || runId.length < 12) return runId || '—'
  return `${runId.slice(0, 8)}…`
}

function RunPanel({ run, isRunning }) {
  const {
    runId,
    agent,
    streamingUrl,
    phase,
    currentPurpose,
    result,
    events,
  } = run

  const addressBarText =
    streamingUrl ||
    (phase === 'starting' || phase === 'progress'
      ? 'Loading…'
      : phase === 'complete'
        ? streamingUrl || 'Complete'
        : '')

  return (
    <div className="border-b border-slate-200 flex flex-col min-h-0 bg-white">
      <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700">
        <span className="font-semibold text-slate-900">Run {shortRunId(runId)}</span>
        {typeof agent === 'number' ? (
          <span className="text-slate-600">
            agent <span className="font-mono">{agent}</span>
          </span>
        ) : null}
        <span className="text-slate-500 font-mono truncate max-w-[min(100%,28rem)]" title={runId}>
          {runId}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[min(50vh,420px)] max-h-[min(70vh,560px)]">
        <div className="border-r border-slate-200 flex flex-col min-w-0 min-h-0">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
            <div className="flex-1 min-w-0 font-mono text-xs text-slate-500 truncate">
              {addressBarText || '—'}
            </div>
          </div>

          <div className="flex-1 bg-slate-900 min-h-[200px] min-w-0">
            {phase === 'error' ? (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-red-300 gap-2 p-4 text-center text-sm">
                Stream error. See event log.
              </div>
            ) : phase === 'progress' || phase === 'complete' ? (
              <iframe
                title={`tinyfish-stream-${runId}`}
                src={streamingUrl}
                className="w-full h-full border-0 min-h-[200px]"
                allow="autoplay"
              />
            ) : (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-200 gap-2 p-4 text-center">
                <div className="font-semibold">
                  {phase === 'starting'
                    ? 'Starting…'
                    : phase === 'idle'
                      ? 'Waiting…'
                      : isRunning
                        ? 'Loading…'
                        : '—'}
                </div>
                <div className="text-xs text-slate-300/90">
                  {phase === 'ready' ? 'Waiting for PROGRESS…' : 'Waiting for STREAMING_URL…'}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col min-w-0 min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-white shrink-0">
            <div className="font-semibold mb-1 text-slate-900 text-sm">Status</div>
            <div className="text-xs text-slate-500">
              Phase: {phase}
              {currentPurpose ? ` · ${currentPurpose}` : ''}
            </div>
          </div>

          <div className="p-4 overflow-auto flex-1 min-h-0">
            {events.length === 0 ? (
              <div className="text-sm text-slate-500">Events for this run appear here.</div>
            ) : (
              events.map((evt, idx) => (
                <div
                  key={`${evt?.type || 'evt'}-${evt?.timestamp || idx}-${idx}`}
                  className="border border-slate-200 rounded-xl p-3 mb-3 bg-white"
                >
                  <div className="font-semibold text-slate-900">{evt.type}</div>
                  {evt.timestamp ? (
                    <div className="text-xs text-slate-500 mt-1">{evt.timestamp}</div>
                  ) : null}

                  {evt.type === 'STREAMING_URL' ? (
                    <div className="mt-2 text-xs break-all text-slate-700">
                      {evt.streaming_url || evt.url}
                    </div>
                  ) : null}

                  {evt.type === 'PROGRESS' ? (
                    <div className="mt-2 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {evt.purpose}
                    </div>
                  ) : null}

                  {evt.type === 'HEARTBEAT' ? (
                    <div className="mt-2 text-xs text-slate-500">Heartbeat</div>
                  ) : null}

                  {evt.type === 'COMPLETE' ? (
                    <div className="mt-2 rounded-lg bg-slate-900 text-slate-200 p-3 overflow-x-auto whitespace-pre-wrap wrap-break-word">
                      <code className="font-mono text-xs">
                        {JSON.stringify(evt.result ?? result, null, 2)}
                      </code>
                    </div>
                  ) : null}

                  {evt.type === 'ERROR' ? (
                    <div className="mt-2 text-sm text-red-700 leading-relaxed whitespace-pre-wrap wrap-break-word">
                      Error: {evt.error}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MultipleTinyFishTest() {
  const [isRunning, setIsRunning] = useState(false)
  const [parallel, setParallel] = useState(initialParallelState)

  const abortRef = useRef(null)

  function stop() {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = null
    setIsRunning(false)
  }

  useEffect(() => {
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function start() {
    if (isRunning) return

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setParallel(initialParallelState)
    setIsRunning(true)

    try {
      const aiBaseUrl = import.meta.env.VITE_APP_AI_API || 'http://localhost:8000'
      const url = `${aiBaseUrl}/tinyfish/test/parallel`

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

      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const parsed = tryParseJsonLine(line)
          if (!parsed?.event_data) continue
          setParallel((prev) => applyParallelEnvelope(prev, parsed))
        }
      }

      const tail = tryParseJsonLine(buffer)
      if (tail?.event_data) {
        setParallel((prev) => applyParallelEnvelope(prev, tail))
      }
    } catch (e) {
      if (String(e?.name) === 'AbortError') return
      const runId = `error-${Date.now()}`
      setParallel((prev) =>
        applyParallelEnvelope(prev, {
          agent: null,
          event_data: {
            type: 'ERROR',
            run_id: runId,
            timestamp: new Date().toISOString(),
            error: e?.message || String(e),
          },
        }),
      )
    } finally {
      setIsRunning(false)
    }
  }

  const { runOrder, runs } = parallel

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col bg-white">
      <div className="p-4 border-b border-slate-200 bg-white flex items-center shrink-0">
        <button
          className="mr-2 rounded-lg bg-slate-900 border border-slate-700 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => start()}
          disabled={isRunning}
        >
          {isRunning ? 'Running…' : 'Start'}
        </button>
        <button
          className="rounded-lg bg-white border border-slate-300 text-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={stop}
          disabled={!isRunning}
        >
          Stop
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {runOrder.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            Click Start to open parallel TinyFish runs. Each <span className="font-mono">run_id</span>{' '}
            gets its own stream preview and event log.
          </div>
        ) : (
          runOrder.map((runId) => (
            <RunPanel key={runId} run={runs[runId]} isRunning={isRunning} />
          ))
        )}
      </div>
    </div>
  )
}
