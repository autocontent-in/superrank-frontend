import { useState, useEffect, useRef, useCallback } from 'react'
import { Bot, Send, Sparkles, SquareStop } from 'lucide-react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { rawToEditorBlockContent, editorBlockContentToMarkdownAiOptimized } from '../../../../components/editor/lib/editorStorage'
import AiApi from '../../../../api/AiApi'

const baseUrl = import.meta.env.VITE_APP_BACKEND_API || ''

/** Extract plain text from a node's children. */
function getTextFromChildren(children) {
  if (!Array.isArray(children)) return ''
  return children
    .map((c) => {
      if (c && typeof c === 'object' && 'text' in c) return c.text || ''
      if (c?.children) return getTextFromChildren(c.children)
      return ''
    })
    .join('')
    .trim()
}

/** Collect content for AI response from document structure. */
function extractDocumentKnowledge(raw) {
  const content = raw?.content ?? []
  const images = raw?.images ?? []
  const knowledge = {
    title: '',
    blockquotes: [],
    headings: [],
    paragraphs: [],
    tables: [],
    math: [],
    lists: [],
    graphs: [],
    images,
    blocks: [],
  }

  function walk(nodes, parentType) {
    if (!Array.isArray(nodes)) return
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue
      const type = node.type
      const text = getTextFromChildren(node.children)
      const block = { type, node, text }
      knowledge.blocks.push(block)

      if (type === 'h1' && !knowledge.title) knowledge.title = text
      else if (type === 'blockquote') knowledge.blockquotes.push(text)
      else if (type === 'h2' || type === 'h3') knowledge.headings.push({ level: type, text })
      else if (type === 'paragraph' && text) knowledge.paragraphs.push({ text, node })
      else if (type === 'table' && node.headerCells) {
        knowledge.tables.push({
          headers: node.headerCells,
          rows: node.cells ?? [],
        })
      } else if (type === 'math' && node.latex) knowledge.math.push(node.latex)
      else if (type === 'graph' && (node.expression || node.latex))
        knowledge.graphs.push({ expression: node.expression, latex: node.latex })
      else if (type === 'bulleted-list' || type === 'numbered-list') {
        const items = []
        for (const li of node.children ?? []) {
          const t = getTextFromChildren(li?.children ?? [])
          if (t) items.push(t)
        }
        if (items.length) knowledge.lists.push(items)
      } else if (type === 'columns-container') {
        for (const col of node.children ?? []) {
          walk(col?.children ?? [], 'column')
        }
        return
      }
      if (node.children && type !== 'columns-container') walk(node.children, type)
    }
  }
  walk(content)
  return knowledge
}

/** Format document knowledge as text context for the AI. */
function formatDocumentContext(knowledge) {
  if (!knowledge || !knowledge.blocks?.length) return ''
  const parts = []
  if (knowledge.title) parts.push(`Title: ${knowledge.title}`)
  if (knowledge.blockquotes?.length) {
    parts.push('Blockquotes: ' + knowledge.blockquotes.join(' | '))
  }
  if (knowledge.headings?.length) {
    parts.push('Sections: ' + knowledge.headings.map((h) => h.text).join(', '))
  }
  if (knowledge.paragraphs?.length) {
    const texts = knowledge.paragraphs.map((p) => p.text).filter(Boolean)
    if (texts.length) parts.push('Content:\n' + texts.join('\n\n'))
  }
  if (knowledge.tables?.length) {
    for (const t of knowledge.tables) {
      const headerRow = (t.headers ?? []).join(' | ')
      const rows = (t.rows ?? []).map((r) => (Array.isArray(r) ? r.join(' | ') : String(r)))
      parts.push('Table:\n' + headerRow + '\n' + rows.join('\n'))
    }
  }
  if (knowledge.math?.length) parts.push('Equations: ' + knowledge.math.join(' ; '))
  if (knowledge.lists?.length) {
    for (const items of knowledge.lists) {
      parts.push('List: ' + items.join(', '))
    }
  }
  return parts.join('\n\n')
}

/** Escape HTML to prevent XSS when using dangerouslySetInnerHTML. */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Render LaTeX with KaTeX. Returns safe HTML. */
function renderMath(latex, displayMode) {
  const trimmed = String(latex).trim()
  if (!trimmed) return ''
  try {
    return katex.renderToString(trimmed, { displayMode, throwOnError: false })
  } catch {
    return escapeHtml(displayMode ? `$$${latex}$$` : `$${latex}$`)
  }
}

/**
 * Process AI response text: detect math (LaTeX) and render with KaTeX,
 * support **bold**.
 * Supports: $...$ (inline), $$...$$ (display), \(...\) (inline), \[...\] (display)
 */
function processAiResponse(text) {
  if (!text || typeof text !== 'string') return ''
  let html = text

  // Display math: $$...$$ and \[...\]
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => renderMath(latex, true))
  html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, latex) => renderMath(latex, true))

  // Inline math: $...$ and \(...\) (process $ after $$ to avoid false matches)
  html = html.replace(/\$([^$\n]+?)\$/g, (_, latex) => renderMath(latex, false))
  html = html.replace(/\\\(([\s\S]*?)\\\)/g, (_, latex) => renderMath(latex, false))

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  return html
}

/** Render assistant text with math (LaTeX via KaTeX) and **bold** formatting. */
function AssistantText({ text }) {
  if (!text) return null
  const html = processAiResponse(text)
  return (
    <div className="ai-style text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
  )
}

export function AskAIPanel({ documentId, getDocumentContent }) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [showBorderShine, setShowBorderShine] = useState(true)
  const scrollRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const inputRef = useRef(null)
  const userScrolledUpRef = useRef(false)
  const abortControllerRef = useRef(null)

  const resizeInput = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(44, el.scrollHeight)}px`
  }, [])

  useEffect(() => {
    if (!showBorderShine) return
    const t = setTimeout(() => setShowBorderShine(false), 4200)
    return () => clearTimeout(t)
  }, [showBorderShine])

  useEffect(() => {
    if (!isTyping && userScrolledUpRef.current) return
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleChatScroll = useCallback(() => {
    if (isTyping) return
    const el = scrollContainerRef.current
    if (!el) return
    const { scrollTop, clientHeight, scrollHeight } = el
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80
    if (!isNearBottom) {
      userScrolledUpRef.current = true
    }
  }, [isTyping])


  useEffect(() => {
    resizeInput()
  }, [message, resizeInput])

  useEffect(() => {
    if (!isTyping) {
      inputRef.current?.focus()
    }
  }, [isTyping])

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const text = message.trim()
    if (!text) return

    userScrolledUpRef.current = false
    setMessage('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setIsTyping(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    const docRaw = typeof getDocumentContent === 'function' ? getDocumentContent() : null
    const { value, images } = docRaw ? rawToEditorBlockContent(docRaw) : { value: [], images: [] }
    const documentContent = editorBlockContentToMarkdownAiOptimized(value, images, {
      baseUrl,
      includeImages: false,
      imagePlaceholder: '<<< An image here >>>',
    })

    const userQuery = text

    const payload = {
      data: {
        document_content: documentContent,
        user_query: userQuery,
      },
    }

    try {
      const res = await AiApi.streamPost(`/ai/documents/${documentId}/stream`, payload, {
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.text()
        const errorMsg = `Error: ${res.status} ${res.statusText}${err ? ` - ${err}` : ''}`
        setMessages((m) => [...m, { role: 'assistant', content: errorMsg }])
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let fullContent = ''
      let lastUpdate = 0
      const STREAM_THROTTLE_MS = 120

      const flushToMessages = (content) => {
        setMessages((m) => {
          const copy = [...m]
          const last = copy[copy.length - 1]
          if (last?.role === 'assistant') {
            copy[copy.length - 1] = { ...last, content }
          } else {
            copy.push({ role: 'assistant', content })
          }
          return copy
        })
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        fullContent += chunk

        const now = Date.now()
        if (now - lastUpdate >= STREAM_THROTTLE_MS || fullContent.length < 80) {
          lastUpdate = now
          flushToMessages(fullContent)
        }
      }
      flushToMessages(fullContent)
    } catch (err) {
      if (err?.name === 'AbortError') {
        setMessages((m) => {
          const copy = [...m]
          const last = copy[copy.length - 1]
          if (last?.role === 'assistant' && !last.content) {
            copy[copy.length - 1] = { ...last, content: 'Generation stopped.' }
          } else if (last?.role === 'assistant' && last.content) {
            copy[copy.length - 1] = { ...last, content: last.content + '<br /><br /><br /><p class="font-normal not-italic text-gray-400">[ Stopped ]</p><br />' }
          } else {
            copy.push({ role: 'assistant', content: 'Generation stopped.' })
          }
          return copy
        })
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: `Error: ${err?.message || String(err)}` }])
      }
    } finally {
      abortControllerRef.current = null
      setIsTyping(false)
    }
  }

  const isEmpty = messages.length === 0 && !isTyping
  const lastMsg = messages[messages.length - 1]
  const isStreaming = isTyping && lastMsg?.role === 'assistant' && (lastMsg?.content?.length ?? 0) > 0
  const isThinking = isTyping && !isStreaming

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Scrollable chat area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleChatScroll}
        className="flex-1 min-h-0 overflow-y-auto p-4 pb-2"
      >
        <div className="space-y-4 -mx-1">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 opacity-60"
                style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.15) 50%, rgba(6, 182, 212, 0.2) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}
              >
                <Sparkles className="w-5 h-5" style={{ color: '#8b5cf6' }} />
              </div>
              <p className="text-xs text-slate-400 max-w-[200px]">
                Type your question below to get started
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div
                  className="mt-3 w-7 h-7 rounded-lg shrink-0 flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
                  }}
                >
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] min-w-0 rounded-lg px-3 ${msg.role === 'user'
                    ? 'py-2 bg-indigo-100 text-indigo-900'
                    : 'pt-1.5 pb-2 bg-slate-100 text-slate-800'
                  }`}
              >
                {msg.role === 'user' ? (
                  <p className="text-sm">{msg.content}</p>
                ) : (
                  <AssistantText text={msg.content || (isTyping ? '' : '')} />
                )}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex gap-2 justify-start">
              <div
                className="ask-ai-typing-bot w-7 h-7 rounded-lg shrink-0 flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
                }}
              >
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-1.5">
                <span className="ask-ai-typing-dots flex gap-0.5" aria-label="AI is thinking">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Fixed input area at bottom */}
      <div className="shrink-0 p-4 pt-2">
        {isEmpty && (
          <div
            className="relative rounded-xl p-4 mb-4 overflow-hidden shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.06) 50%, rgba(6, 182, 212, 0.08) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              boxShadow: '0 0 24px -8px rgba(99, 102, 241, 0.2)',
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(139,92,246,0.1),transparent)] pointer-events-none" />
            <div className="relative flex items-start gap-3">
              <div
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                }}
              >
                <Bot className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Ask AI</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ask questions about this document. summarize, explain, or extract information.
                </p>
              </div>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="relative">
          <div
            className={`ask-ai-input-wrapper rounded-xl overflow-visible transition-all duration-200 focus-within:shadow-lg focus-within:shadow-indigo-500/15 flex items-center ${!isTyping && showBorderShine ? 'ask-ai-input-border-shine' : ''} ${isTyping ? 'ask-ai-input-loading' : ''}`}
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.99) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              boxShadow: '0 -2px 12px rgba(0,0,0,0.06), 0 4px 16px -4px rgba(139, 92, 246, 0.2), 0 0 0 1px rgba(99, 102, 241, 0.06)',
            }}
          >
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault()
                  if (!isTyping && message.trim()) handleSubmit(e)
                }
              }}
              placeholder={isThinking ? 'AI is thinking...' : isStreaming ? 'The AI is responding...' : 'Ask about this document...'}
              rows={1}
              disabled={isTyping}
              readOnly={isTyping}
              className="ask-ai-input-textarea flex-1 min-w-0 resize-none overflow-hidden px-4 pr-2 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-0 outline-none focus:ring-0 rounded-l-xl disabled:opacity-70 disabled:cursor-not-allowed"
            />
            <div className={`flex items-center shrink-0 pl-2 pr-3 py-3 ${isTyping ? 'pointer-events-auto' : ''}`}>
              {isTyping ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="p-2 rounded-lg transition-all duration-200 cursor-pointer bg-red-300 hover:bg-red-400 text-red-50"
                  title="Stop generation"
                  aria-label="Stop generation"
                >
                  <SquareStop className="w-4 h-4 fill-current" strokeWidth={2.5} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="p-2 rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: message.trim()
                      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)'
                      : 'rgba(148, 163, 184, 0.3)',
                    color: 'white',
                  }}
                  title="Send"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
