/**
 * Shared workflow stream reducers (aligned with Business Profile SSE handling).
 */

export const WORKFLOW_VIZ_INITIAL = {
  phase: 'idle',
  runId: null,
  input: null,
  agents: [],
  orchestratorStream: null,
}

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

export function applyWorkflowStreamEvent(prev, evt) {
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
                t.status === 'running' ? { ...t, status: 'done', stream: payload ?? t.stream } : t,
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

export function applyBrowserStreamToWorkflow(prev, parsed) {
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

export function tryParseJsonLine(line) {
  const s = line.trim()
  if (!s) return null
  if (s === '[DONE]' || s.toLowerCase() === 'done') return null

  const maybeData = s.startsWith('data:') ? s.slice(5).trim() : s
  if (!maybeData) return null

  try {
    return JSON.parse(maybeData)
  } catch {
    return null
  }
}
