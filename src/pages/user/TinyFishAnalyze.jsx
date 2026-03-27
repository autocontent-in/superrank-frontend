import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { House } from 'lucide-react'

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

  const addressBarText =
    streamingUrl ||
    (phase === 'starting' || phase === 'progress'
      ? 'Loading…'
      : phase === 'complete'
        ? streamingUrl || 'Complete'
        : '')

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col bg-white">
      <div className="sticky top-0 z-20 flex h-14 items-center border-b border-slate-200 bg-white px-6">
        <div className="flex items-center h-9 min-w-0 gap-1.5">
          <Link
            to="/"
            className="flex items-center text-slate-500 hover:text-slate-800 transition-colors shrink-0"
            title="Home"
          >
            <House className="w-4 h-4" />
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-sm font-semibold text-slate-800">Web Agent</span>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2">
      <div className="border-r border-slate-200 flex flex-col min-w-0 min-h-0 h-full">
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <div className="flex-1 min-w-0 font-mono text-xs text-slate-500 truncate">
            {addressBarText || '—'}
          </div>
        </div>

        <div className="flex-1 bg-slate-900 min-h-0">
          {phase === 'progress' || phase === 'complete' ? (
            <iframe
              title="tinyfish-stream"
              src={streamingUrl}
              className="w-full h-full border-0"
              allow="autoplay"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-2 p-4 text-center">
              <div className="font-semibold">
                {phase === 'starting'
                  ? 'Starting…'
                  : phase === 'idle'
                    ? 'Click Start'
                    : isRunning
                      ? 'Loading…'
                      : 'Click Start'}
              </div>
              <div className="text-xs text-slate-300/90">
                {phase === 'ready' ? 'Waiting for PROGRESS…' : 'Waiting for STREAMING_URL…'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col min-w-0 min-h-0 h-full">
        <div className="p-4 border-b border-slate-200 bg-white flex items-center">
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

        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <div className="font-semibold mb-1 text-slate-900">Actions & Statuses</div>
          <div className="text-xs text-slate-500">
            Phase: {phase}
            {currentPurpose ? ` · ${currentPurpose}` : ''}
          </div>
        </div>

        <div className="p-4 overflow-auto flex-1 min-h-0">
          {events.length === 0 ? (
            <div className="text-sm text-slate-500">Starting will stream status updates here.</div>
          ) : (
            events.map((evt, idx) => (
              <div key={`${evt?.type || 'evt'}-${idx}`} className="border border-slate-200 rounded-xl p-3 mb-3 bg-white">
                <div className="font-semibold text-slate-900">{evt.type}</div>
                {evt.timestamp ? <div className="text-xs text-slate-500 mt-1">{evt.timestamp}</div> : null}

                {evt.type === 'STREAMING_URL' ? (
                  <div className="mt-2 text-xs break-all text-slate-700">{evt.streaming_url || evt.url}</div>
                ) : null}

                {evt.type === 'PROGRESS' ? (
                  <div className="mt-2 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{evt.purpose}</div>
                ) : null}

                {evt.type === 'COMPLETE' ? (
                  <div className="mt-2 rounded-lg bg-slate-900 text-slate-200 p-3 overflow-x-auto whitespace-pre-wrap wrap-break-word">
                    <code className="font-mono text-xs">{JSON.stringify(evt.result ?? result, null, 2)}</code>
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

