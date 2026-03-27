import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { House } from 'lucide-react'
import AiApi from '../../api/AiApi'

export function AiDemo() {
  const [output, setOutput] = useState('')
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const abortControllerRef = useRef(null)

  const handleSubmit = async () => {
    setOutput('')
    setIsStreaming(true)

    abortControllerRef.current = new AbortController()

    try {
      const res = await AiApi.streamPost(
        '/ai/ask/stream',
        { prompt: input },
        { signal: abortControllerRef.current.signal },
      )

      if (!res.ok) {
        const err = await res.text()
        setOutput(`Error: ${res.status} ${res.statusText}${err ? ` - ${err}` : ''}`)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value, { stream: true })

        setOutput((prev) => prev + chunk)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setOutput(`Error: ${err?.message || String(err)}`)
      }
    } finally {
      setIsStreaming(false)
    }
  }

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setOutput((prev) => prev + '\n\n[Stopped]')
    }
  }

  return (
    <div className="w-full min-h-full overflow-y-auto">
      <div className="shrink-0 h-14 px-4 border-b border-slate-200 flex items-center bg-white">
        <div className="flex h-9 min-w-0 items-center gap-1.5">
          <Link
            to="/"
            className="flex shrink-0 items-center text-slate-500 transition-colors hover:text-slate-800"
            title="Home"
          >
            <House className="h-4 w-4" />
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-sm font-semibold text-slate-800">AI Demo</span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-6">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">AI Streaming Demo</h2>
        <p className="mb-4 text-sm text-slate-500">
          Test streaming AI responses. This workflow will be integrated throughout the app.
        </p>

        <textarea
          rows={4}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the AI..."
          disabled={isStreaming}
        />

        <div className="mt-4">
          {!isStreaming ? (
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Ask AI
            </button>
          ) : (
            <button
              type="button"
              onClick={stopStreaming}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Stop
            </button>
          )}
        </div>

        <pre className="mt-6 min-h-[80px] whitespace-pre-wrap wrap-break-word rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {output || (isStreaming ? '…' : '')}
        </pre>
      </div>
    </div>
  )
}
