import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { House } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { SmartModal } from '../../components/ui/SmartModal'

function tryParseSseJsonLine(line) {
  const s = line.trim()
  if (!s) return null

  // Support SSE-style `data: {...}` lines.
  const maybeData = s.startsWith('data:') ? s.slice(5).trim() : s
  if (!maybeData) return null
  if (maybeData === '[DONE]' || maybeData.toLowerCase() === 'done') return null

  try {
    return JSON.parse(maybeData)
  } catch {
    return null
  }
}

export function MultiAgentTest() {
  const { user } = useAuth()
  const [url, setUrl] = useState('')
  const [messages, setMessages] = useState([]) // { agent, message, at }
  const [outputsByAgent, setOutputsByAgent] = useState({}) // { [agent]: Array<{tool, kind, text, at}> }
  const [lastToolAgent, setLastToolAgent] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [outputsModalOpen, setOutputsModalOpen] = useState(false)
  const [activeAgent, setActiveAgent] = useState(null)
  const abortRef = useRef(null)
  const lastConversationAgentRef = useRef(null)

  const companyUrl = (
    user?.default_company?.website ||
    user?.default_company?.company_website ||
    user?.default_company?.url ||
    user?.default_company?.company_url ||
    ''
  ).trim()

  // Auto-fill the input from the selected company URL.
  // Only overwrite when the user hasn't typed a custom URL yet.
  useEffect(() => {
    if (!companyUrl) return
    setUrl((prev) => (prev.trim() ? prev : companyUrl))
  }, [companyUrl])

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

  const outputTextFromEvent = (evt) => {
    // Prefer known fields so the modal shows "final result" as plain text.
    if (evt?.type === 'tool_complete' && evt?.data) {
      if (typeof evt.data.summary === 'string') return evt.data.summary
      if (typeof evt.data.corrected === 'string') return evt.data.corrected
      if (typeof evt.data.preview === 'string') return evt.data.preview
      if (typeof evt.data.word_count !== 'undefined') return String(evt.data.word_count)
      return JSON.stringify(evt.data, null, 2)
    }

    // `tool_complete` uses `data`, `tool_result` uses `output`.
    const output = evt?.output
    if (output !== undefined) {
      if (typeof output === 'string') return output
      return JSON.stringify(output, null, 2)
    }

    const data = evt?.data
    if (data !== undefined) {
      if (typeof data === 'string') return data
      return JSON.stringify(data, null, 2)
    }

    return JSON.stringify(evt, null, 2)
  }

  async function runAgents() {
    if (isRunning) return
    if (!url.trim()) return

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setMessages([])
    setOutputsByAgent({})
    setLastToolAgent(null)
    setActiveAgent(null)
    setOutputsModalOpen(false)
    lastConversationAgentRef.current = null
    setIsRunning(true)

    try {
      const res = await fetch('http://localhost:8000/api/v1/book-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}${body ? ` — ${body}` : ''}`)
      }

      if (!res.body) throw new Error('No response body (streaming unsupported?)')

      const decoder = new TextDecoder()
      const reader = res.body.getReader()

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const evt = tryParseSseJsonLine(line)
          if (!evt) continue

          if (evt.type === 'conversation' && evt.agent && typeof evt.message === 'string') {
            lastConversationAgentRef.current = evt.agent
            setMessages((prev) => [
              ...prev,
              {
                agent: evt.agent,
                message: evt.message,
                at: new Date().toISOString(),
              },
            ])
            continue
          }

          // Capture tool outputs and attribute them to the most recent conversation agent.
          if (evt.type === 'tool_result' || evt.type === 'tool_complete') {
            const agent = lastConversationAgentRef.current || 'System'
            const tool = evt.tool || 'tool'
            const kind = evt.type
            const text = outputTextFromEvent(evt)
            setLastToolAgent(agent)

            setOutputsByAgent((prev) => {
              const existing = prev[agent] || []
              return {
                ...prev,
                [agent]: [
                  ...existing,
                  {
                    tool,
                    kind,
                    text,
                    at: new Date().toISOString(),
                  },
                ],
              }
            })
          }
        }
      }

      // Flush the last partial line, if any.
      const last = buffer.trim()
      if (last) {
        const evt = tryParseSseJsonLine(last)
        if (evt?.type === 'conversation' && evt.agent && typeof evt.message === 'string') {
          lastConversationAgentRef.current = evt.agent
          setMessages((prev) => [
            ...prev,
            { agent: evt.agent, message: evt.message, at: new Date().toISOString() },
          ])
        } else if (evt && (evt.type === 'tool_result' || evt.type === 'tool_complete')) {
          const agent = lastConversationAgentRef.current || 'System'
          const text = outputTextFromEvent(evt)
          setLastToolAgent(agent)
          setOutputsByAgent((prev) => {
            const existing = prev[agent] || []
            return {
              ...prev,
              [agent]: [
                ...existing,
                {
                  tool: evt.tool || 'tool',
                  kind: evt.type,
                  text,
                  at: new Date().toISOString(),
                },
              ],
            }
          })
        }
      }
    } catch (e) {
      if (String(e?.name) !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          { agent: 'System', message: e?.message || String(e), at: new Date().toISOString() },
        ])
      }
    } finally {
      abortRef.current = null
      setIsRunning(false)
    }
  }

  function stop() {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = null
    setIsRunning(false)
    setMessages((prev) => [
      ...prev,
      { agent: 'System', message: 'Stopped by user', at: new Date().toISOString() },
    ])
  }

  const activeAgentOutputs = activeAgent ? outputsByAgent[activeAgent] || [] : []

  const openOutputsForAgent = (agent) => {
    setActiveAgent(agent)
    setOutputsModalOpen(true)
  }

  return (
    <div className="w-full min-h-full overflow-y-auto">
      <div className="sticky top-0 z-20 flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-6">
        <div className="flex h-9 min-w-0 items-center gap-1.5">
          <Link
            to="/"
            className="flex shrink-0 items-center text-slate-500 transition-colors hover:text-slate-800"
            title="Home"
          >
            <House className="h-4 w-4" />
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-sm font-semibold text-slate-800">AI Team</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl p-6">
        <h2 className="mb-1 text-xl font-semibold text-slate-900">AI Team - Multi agents collaboration</h2>
        <p className="text-sm text-slate-600 mb-6">
          Runs your orchestration endpoint and appends streamed events as they arrive.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Enter URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isRunning}
          />

          <button
            type="button"
            onClick={runAgents}
            disabled={isRunning || !url.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Running…' : 'Start Agents'}
          </button>

          <button
            type="button"
            onClick={stop}
            disabled={!isRunning}
            className="rounded-lg bg-white border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Stop
          </button>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">Conversation</div>
            <div className="text-xs text-slate-500">{messages.length} messages</div>
          </div>

          {lastToolAgent && (outputsByAgent[lastToolAgent]?.length || 0) > 0 ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate">Latest output</div>
                <div className="text-[11px] text-slate-500 truncate">Produced by {lastToolAgent}</div>
              </div>
              <button
                type="button"
                onClick={() => openOutputsForAgent(lastToolAgent)}
                className="shrink-0 rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-800"
              >
                View output
              </button>
            </div>
          ) : null}

          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 max-h-[60vh] overflow-auto">
            {messages.length === 0 ? (
              <div className="text-sm text-slate-500">Start agents to see the conversation here.</div>
            ) : (
              <div className="space-y-3">
                {messages.map((m, i) => (
                  <div key={`${m.agent}-${i}`} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openOutputsForAgent(m.agent)}
                        className="text-xs font-semibold text-slate-800 hover:underline"
                        title={`Show outputs for ${m.agent}`}
                      >
                        {m.agent}
                      </button>
                      <span className="text-[11px] text-slate-400">{new Date(m.at).toLocaleTimeString()}</span>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 whitespace-pre-wrap">
                      {m.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <SmartModal
        open={outputsModalOpen}
        onClose={() => setOutputsModalOpen(false)}
        title={activeAgent ? `Outputs · ${activeAgent}` : 'Outputs'}
        subtitle="Tool outputs captured and attributed to the most recent conversation agent."
        size="xl"
      >
        {activeAgent ? (
          activeAgentOutputs.length === 0 ? (
            <div className="text-sm text-slate-500">No tool outputs recorded for this agent.</div>
          ) : (
            <div className="space-y-3">
              {activeAgentOutputs.map((o, idx) => (
                <div key={`${o.kind}-${o.tool}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-700">
                      {o.kind === 'tool_complete' ? 'Tool complete' : 'Tool result'} · {o.tool}
                    </div>
                    <div className="text-[11px] text-slate-400">{new Date(o.at).toLocaleTimeString()}</div>
                  </div>
                  <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-slate-50 p-3 text-xs whitespace-pre-wrap break-all border border-slate-100">
                    {o.text}
                  </pre>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="text-sm text-slate-500">Select an agent to view outputs.</div>
        )}
      </SmartModal>
    </div>
  )
}

