import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSnackbar } from '../../components/ui/SnackbarProvider'

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
    append('\n\n[Stopped]')
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
        if (parsed) append(JSON.stringify(parsed, null, 2) + '\n')
        else append(last + '\n')
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

        <pre className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap wrap-break-word min-h-[140px]">
          {output || (isSubmitting ? '…' : 'Click the button to create your business profile.')}
        </pre>
      </div>
    </div>
  )
}

