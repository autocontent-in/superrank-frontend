import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, Pencil } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useSnackbar } from '../../../components/ui/SnackbarProvider'
import Api from '../../../api/api.jsx'
import { SmartModal } from '../../../components/ui/SmartModal'
import { BlogWorkflowPipeline } from './BlogWorkflowPipeline.jsx'
import {
  WORKFLOW_VIZ_INITIAL,
  applyBrowserStreamToWorkflow,
  applyWorkflowStreamEvent,
  tryParseJsonLine,
} from './workflowStreamCore.js'

function getLogoUrl(name) {
  const token = import.meta.env.VITE_LOGO_DEV_PUBLIC_KEY
  if (token && name) return `https://img.logo.dev/name/${encodeURIComponent(name)}?token=${token}`
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name ?? '')}&background=6366f1&color=fff&size=80`
}

function competitorsRowFromResponse(res, companyId) {
  const d = res?.data?.data
  if (!d) return null
  if (Array.isArray(d)) {
    const match = companyId != null ? d.find((row) => String(row?.id) === String(companyId)) : null
    return match ?? d[0] ?? null
  }
  if (typeof d === 'object') return d
  return null
}

function emptyForm() {
  return {
    company_name: '',
    company_website: '',
    meta_description: '',
    page_content_summary: '',
    headings: '',
    industry: '',
    company_type: '',
    product_category: '',
    services_provided: '',
    key_keywords: '',
    business_model: '',
    company_description: '',
    core_values: '',
    blogs_page_url: '',
  }
}

function newCompetitorId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}-${Math.random()}`
}

function buildStep2Payload(form, competitors) {
  return {
    company_name: form.company_name,
    company_website: form.company_website,
    website_metadata: {
      meta: form.meta_description,
      content: form.page_content_summary,
      headings: form.headings,
    },
    company_info: {
      industry: form.industry,
      company_type: form.company_type,
      product_category: form.product_category,
      services_provided: form.services_provided,
      key_keywords: form.key_keywords,
    },
    company_identity: {
      business_model: form.business_model,
      description: form.company_description,
      core_values: form.core_values,
    },
    blogs_list: {
      blogs_page_url: form.blogs_page_url,
    },
    competitors: competitors.map((c) => ({
      company_name: c.company_name,
      company_website: c.company_website,
    })),
  }
}

function normalizeTopicSuggestion(b) {
  if (!b || typeof b !== 'object') return { blog_title: '', reason: '' }
  return {
    blog_title: String(b.blog_title ?? b.title ?? '').trim(),
    reason: String(b.reason ?? b.why ?? b.summary ?? '').trim(),
  }
}

function extractBlogsFromWorkflowCompleted(parsed) {
  if (!parsed || parsed.type !== 'workflow' || parsed.event !== 'completed') return null
  const d = parsed.data
  if (!d || typeof d !== 'object') return null
  if (Array.isArray(d.blogs)) return d.blogs
  if (Array.isArray(d.blog_topics)) return d.blog_topics
  if (d.result && typeof d.result === 'object' && Array.isArray(d.result.blogs)) return d.result.blogs
  return null
}

function extractBlogResultFromCreateCompleted(parsed) {
  if (!parsed || parsed.type !== 'workflow' || parsed.event !== 'completed') return null
  const d = parsed.data
  if (d == null) return null
  return d
}

async function consumeAiEventStream(endpoint, body, { signal, onRawLine, onParsed }) {
  const baseURL = (import.meta.env.VITE_APP_AI_API || '').replace(/\/$/, '')
  const token = localStorage.getItem('ks-token') || sessionStorage.getItem('ks-token')
  const url = endpoint.startsWith('http') ? endpoint : `${baseURL}${endpoint}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${t ? ` — ${t}` : ''}`)
  }
  if (!res.body) throw new Error('No response body (streaming unsupported?)')

  const decoder = new TextDecoder()
  const reader = res.body.getReader()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      onRawLine(line)
      const trimmed = line.trim()
      if (!trimmed) continue
      const parsed = tryParseJsonLine(trimmed)
      if (parsed) onParsed(parsed)
    }
  }
  if (buffer.trim()) {
    onRawLine(buffer)
    const parsed = tryParseJsonLine(buffer.trim())
    if (parsed) onParsed(parsed)
  }
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}

function ReadOnlyBlock({ label, value, className = '' }) {
  const v = value != null && String(value).trim() !== '' ? String(value) : '—'
  return (
    <div className={className}>
      <div className="text-xs font-medium text-slate-500 mb-1">{label}</div>
      <div className="text-sm text-slate-900 whitespace-pre-wrap wrap-break-word">{v}</div>
    </div>
  )
}

const BLOG_CREATE_STEPS = [
  { step: 2, title: 'Business profile' },
  { step: 3, title: 'Blog direction' },
  { step: 4, title: 'Topic ideas' },
  { step: 5, title: 'Writing' },
  { step: 6, title: 'Complete' },
]

const STEP_HEADER_TITLES = {
  2: 'Your Business Profile',
  3: 'Blog Direction',
  4: 'Topic Ideas',
  5: 'Writing',
  6: 'Complete',
}

function BlogCreateStepsNav({ currentStep }) {
  return (
    <nav aria-label="Blog creation steps" className="text-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 px-6">Steps</h2>
      <ol className="m-0 py-4 list-none space-y-2 p-0 w-full">
        {BLOG_CREATE_STEPS.map(({ step: n, title }, index) => {
          const done = currentStep > n
          const active = currentStep === n
          return (
            <li key={n} className="px-6 py-1 flex items-center space-x-4">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  done ? 'bg-emerald-600 text-white' : active ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : index + 1}
              </span>
              <span className={`min-w-0 ${active ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                {title}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function NewBlog() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showSnackbar } = useSnackbar()
  const company = user?.default_company
  const companyId = company?.id ?? company?.uuid ?? null
  const [step, setStep] = useState(1)
  const [prefillLoading, setPrefillLoading] = useState(false)
  const [prefillError, setPrefillError] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [competitors, setCompetitors] = useState([])
  const [profileEditing, setProfileEditing] = useState(false)

  const [blogTopicInput, setBlogTopicInput] = useState('')
  const [blogDescriptionInput, setBlogDescriptionInput] = useState('')

  const [researchPhase, setResearchPhase] = useState('idle')
  const [topicSuggestions, setTopicSuggestions] = useState([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(null)

  const [topicResearchWorkflow, setTopicResearchWorkflow] = useState([])
  const [createBlogWorkflow, setCreateBlogWorkflow] = useState([])
  const [researchWorkflowViz, setResearchWorkflowViz] = useState(WORKFLOW_VIZ_INITIAL)
  const [createWorkflowViz, setCreateWorkflowViz] = useState(WORKFLOW_VIZ_INITIAL)

  const [finalBlogTopic, setFinalBlogTopic] = useState('')
  const [finalBlogDescription, setFinalBlogDescription] = useState('')
  const [blogResult, setBlogResult] = useState(null)
  const [streamModal, setStreamModal] = useState(null)
  const [blogPreviewOpen, setBlogPreviewOpen] = useState(false)

  const researchAbortRef = useRef(null)
  const createAbortRef = useRef(null)
  const savedBundleRef = useRef(null)

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const addCompetitor = () => {
    setCompetitors((prev) => [...prev, { id: newCompetitorId(), company_name: '', company_website: '' }])
  }

  const updateCompetitor = (id, key, value) => {
    setCompetitors((prev) => prev.map((c) => (c.id === id ? { ...c, [key]: value } : c)))
  }

  const resetModal = useCallback(() => {
    setStep(1)
    setPrefillError(null)
    setForm(emptyForm())
    setCompetitors([])
    setProfileEditing(false)
    setBlogTopicInput('')
    setBlogDescriptionInput('')
    setResearchPhase('idle')
    setTopicSuggestions([])
    setSelectedSuggestionIndex(null)
    setTopicResearchWorkflow([])
    setCreateBlogWorkflow([])
    setResearchWorkflowViz(WORKFLOW_VIZ_INITIAL)
    setCreateWorkflowViz(WORKFLOW_VIZ_INITIAL)
    setFinalBlogTopic('')
    setFinalBlogDescription('')
    setBlogResult(null)
    setStreamModal(null)
    setBlogPreviewOpen(false)
    savedBundleRef.current = null
    if (researchAbortRef.current) researchAbortRef.current.abort()
    if (createAbortRef.current) createAbortRef.current.abort()
    researchAbortRef.current = null
    createAbortRef.current = null
  }, [])

  const loadPrefill = useCallback(async () => {
    setPrefillLoading(true)
    setPrefillError(null)
    const next = emptyForm()
    const nextCompetitors = []

    const results = await Promise.allSettled([
      Api.get('/business-profiles/latest'),
      companyId ? Api.get(`/companies/${companyId}/competitors`) : Promise.resolve(null),
    ])

    const [bpRes, compRes] = results

    if (bpRes.status === 'fulfilled') {
      const bp = bpRes.value?.data?.data
      if (bp) {
        const ci = bp.company_info || {}
        const idn = bp.company_identity || {}
        const blogsList = bp.blogs_list || {}
        next.industry = String(ci.industry ?? '')
        next.company_type = String(ci.company_type ?? '')
        next.product_category = String(ci.product_category ?? '')
        next.services_provided = String(ci.services_provided ?? '')
        next.key_keywords = String(ci.key_keywords ?? '')
        next.business_model = String(idn.business_model ?? '')
        next.company_description = String(idn.description ?? '')
        next.core_values = String(idn.core_values ?? '')
        next.blogs_page_url = String(blogsList.blogs_page_url ?? '')
      }
    }

    if (compRes.status === 'fulfilled' && compRes.value) {
      const row = competitorsRowFromResponse(compRes.value, companyId)
      if (row) {
        next.company_name = String(row.company_name ?? '')
        next.company_website = String(row.company_website ?? '')
        const wm = row.website_metadata || {}
        next.meta_description = String(wm.meta ?? '')
        next.page_content_summary = String(wm.content ?? '')
        next.headings = String(wm.headings ?? '')
        const list = Array.isArray(row.competitors) ? row.competitors : []
        list.forEach((c) => {
          nextCompetitors.push({
            id: c.id != null ? String(c.id) : newCompetitorId(),
            company_name: String(c.company_name ?? ''),
            company_website: String(c.company_website ?? ''),
          })
        })
      }
    }

    const anyFail = results.some((r) => r.status === 'rejected')
    if (anyFail) {
      setPrefillError('Some sources could not be loaded; you can still edit fields below.')
    }

    setForm(next)
    setCompetitors(nextCompetitors)
    setPrefillLoading(false)
  }, [companyId])

  useEffect(() => {
    resetModal()
    loadPrefill()
  }, [resetModal, loadPrefill])

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const textareaClass = `${inputClass} min-h-[88px] resize-y`

  const runTopicResearch = async () => {
    if (researchAbortRef.current) researchAbortRef.current.abort()
    researchAbortRef.current = new AbortController()
    const payload = buildStep2Payload(form, competitors)
    setResearchWorkflowViz(WORKFLOW_VIZ_INITIAL)
    setTopicResearchWorkflow([])
    setResearchPhase('streaming')
    setTopicSuggestions([])
    setSelectedSuggestionIndex(null)

    try {
      await consumeAiEventStream(
        '/api/v1/research-blog-topic',
        { data: payload },
        {
          signal: researchAbortRef.current.signal,
          onRawLine: (line) => {
            setTopicResearchWorkflow((prev) => [...prev, line])
          },
          onParsed: (parsed) => {
            setResearchWorkflowViz((p) => {
              const w = applyWorkflowStreamEvent(p, parsed)
              return applyBrowserStreamToWorkflow(w, parsed)
            })
            if (parsed.type === 'workflow' && parsed.event === 'completed') {
              const raw = extractBlogsFromWorkflowCompleted(parsed)
              const normalized = Array.isArray(raw) ? raw.map(normalizeTopicSuggestion).filter((x) => x.blog_title) : []
              setTopicSuggestions(normalized.length ? normalized : [])
              setResearchPhase('pick')
            }
          },
        },
      )
    } catch (e) {
      if (String(e?.name) === 'AbortError') return
      showSnackbar({ message: e?.message || String(e), variant: 'error', duration: 5000 })
      setResearchPhase('pick')
    } finally {
      researchAbortRef.current = null
    }
    setResearchPhase((p) => (p === 'streaming' ? 'pick' : p))
  }

  const runCreateBlog = async (topic, description) => {
    if (createAbortRef.current) createAbortRef.current.abort()
    createAbortRef.current = new AbortController()
    const base = buildStep2Payload(form, competitors)
    setCreateWorkflowViz(WORKFLOW_VIZ_INITIAL)
    setCreateBlogWorkflow([])
    setBlogResult(null)

    try {
      await consumeAiEventStream(
        '/api/v1/create-blog',
        {
          data: {
            ...base,
            blog_topic: topic,
            blog_description: description,
          },
        },
        {
          signal: createAbortRef.current.signal,
          onRawLine: (line) => {
            setCreateBlogWorkflow((prev) => [...prev, line])
          },
          onParsed: (parsed) => {
            setCreateWorkflowViz((p) => {
              const w = applyWorkflowStreamEvent(p, parsed)
              return applyBrowserStreamToWorkflow(w, parsed)
            })
            if (parsed.type === 'workflow' && parsed.event === 'completed') {
              const br = extractBlogResultFromCreateCompleted(parsed)
              if (br != null) setBlogResult(br)
            }
          },
        },
      )
      setStep(6)
    } catch (e) {
      if (String(e?.name) === 'AbortError') return
      showSnackbar({ message: e?.message || String(e), variant: 'error', duration: 5000 })
    } finally {
      createAbortRef.current = null
    }
  }

  const handleContinueStep1 = () => setStep(2)
  const handleContinueStep2 = () => {
    if (profileEditing) {
      showSnackbar({ message: 'Save your business profile first.', variant: 'warning', duration: 3000 })
      return
    }
    setStep(3)
  }
  const handleBack = () => {
    if (step <= 1) return
    if (step === 5) return
    if (step === 4) {
      setResearchPhase('idle')
      setTopicSuggestions([])
      setSelectedSuggestionIndex(null)
    }
    setStep((s) => Math.max(1, s - 1))
  }

  const handleContinueStep3 = () => {
    const t = blogTopicInput.trim()
    const d = blogDescriptionInput.trim()
    if (!t && !d) {
      setStep(4)
      runTopicResearch()
      return
    }
    setFinalBlogTopic(t)
    setFinalBlogDescription(d)
    setStep(5)
    runCreateBlog(t, d)
  }

  const handleContinueStep4 = () => {
    if (selectedSuggestionIndex == null || !topicSuggestions[selectedSuggestionIndex]) {
      showSnackbar({ message: 'Select a blog topic to continue.', variant: 'warning', duration: 4000 })
      return
    }
    const s = topicSuggestions[selectedSuggestionIndex]
    setFinalBlogTopic(s.blog_title)
    setFinalBlogDescription(s.reason)
    setStep(5)
    runCreateBlog(s.blog_title, s.reason)
  }

  const handleSaveAll = () => {
    savedBundleRef.current = {
      topic_research_workflow: topicResearchWorkflow,
      create_blog_workflow: createBlogWorkflow,
      blog_data: blogResult,
      finalBlogTopic,
      finalBlogDescription,
    }
    showSnackbar({ message: 'Saved locally — ready to persist to your database next.', variant: 'success', duration: 4000 })
  }

  const renderBlogBody = () => {
    if (blogResult == null) return '—'
    if (typeof blogResult === 'string') return blogResult
    const md = blogResult.markdown ?? blogResult.content ?? blogResult.body ?? blogResult.blog
    if (typeof md === 'string') return md
    try {
      return JSON.stringify(blogResult, null, 2)
    } catch {
      return String(blogResult)
    }
  }

  const footerButtons = () => {
    if (step === 1) {
      return (
        <div className="flex w-full flex-wrap items-center justify-end">
          <button
            type="button"
            onClick={handleContinueStep1}
            className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Continue
          </button>
        </div>
      )
    }

    if (step === 6) {
      return (
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate('/seo-services/blogs')}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBlogPreviewOpen(true)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Show blog
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Save
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex w-full flex-wrap items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={(step === 4 && researchPhase === 'streaming') || step === 5}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Go back
        </button>
        <div className="flex flex-wrap gap-2">
          {step === 2 ? (
            <button
              type="button"
              onClick={handleContinueStep2}
              disabled={prefillLoading || profileEditing}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Continue
            </button>
          ) : null}
          {step === 3 ? (
            <button
              type="button"
              onClick={handleContinueStep3}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Continue
            </button>
          ) : null}
          {step === 4 && researchPhase === 'pick' ? (
            <button
              type="button"
              onClick={handleContinueStep4}
              disabled={!topicSuggestions.length}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Continue
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  const rightColumn = () => {
    if (step === 1) {
      return (
        <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-10 text-center">
          <p className="max-w-lg text-base leading-relaxed text-slate-700">
            This will be an AI-created, not generated blog for your company and business. The topic research, page structure,
            content strategy, and informative depth will be done automatically by AI — or you can provide your own topic in
            the next steps and let the AI handle the rest. Fasten your seat belt and enjoy.
          </p>
          <button
            type="button"
            onClick={handleContinueStep1}
            className="mt-6 rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Get started
          </button>
        </div>
      )
    }

    if (prefillLoading) {
      return <div className="py-16 text-center text-sm text-slate-600">Loading latest data…</div>
    }

    if (step === 2) {
      return (
        <div className="space-y-8 pb-4">
          {prefillError ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{prefillError}</p>
          ) : null}

          {profileEditing ? (
            <div className="space-y-8">
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Meta description" className="sm:col-span-2">
                  <textarea className={textareaClass} value={form.meta_description} onChange={(e) => setField('meta_description', e.target.value)} rows={3} />
                </Field>
                <Field label="Page content (summary)" className="sm:col-span-2">
                  <textarea className={textareaClass} value={form.page_content_summary} onChange={(e) => setField('page_content_summary', e.target.value)} rows={5} />
                </Field>
                <Field label="Headings" className="sm:col-span-2">
                  <textarea className={textareaClass} value={form.headings} onChange={(e) => setField('headings', e.target.value)} rows={4} />
                </Field>
              </section>
              <section>
                <h4 className="mb-3 text-sm font-semibold text-slate-900">Company details</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Industry">
                    <input className={inputClass} value={form.industry} onChange={(e) => setField('industry', e.target.value)} />
                  </Field>
                  <Field label="Company type">
                    <input className={inputClass} value={form.company_type} onChange={(e) => setField('company_type', e.target.value)} />
                  </Field>
                  <Field label="Product category" className="sm:col-span-2">
                    <input className={inputClass} value={form.product_category} onChange={(e) => setField('product_category', e.target.value)} />
                  </Field>
                  <Field label="Services provided" className="sm:col-span-2">
                    <textarea className={textareaClass} value={form.services_provided} onChange={(e) => setField('services_provided', e.target.value)} rows={3} />
                  </Field>
                  <Field label="Key keywords" className="sm:col-span-2">
                    <textarea className={textareaClass} value={form.key_keywords} onChange={(e) => setField('key_keywords', e.target.value)} rows={3} />
                  </Field>
                  <Field label="Business model" className="sm:col-span-2">
                    <input className={inputClass} value={form.business_model} onChange={(e) => setField('business_model', e.target.value)} />
                  </Field>
                  <Field label="Description" className="sm:col-span-2">
                    <textarea className={textareaClass} value={form.company_description} onChange={(e) => setField('company_description', e.target.value)} rows={4} />
                  </Field>
                  <Field label="Core values" className="sm:col-span-2">
                    <textarea className={textareaClass} value={form.core_values} onChange={(e) => setField('core_values', e.target.value)} rows={3} />
                  </Field>
                  <Field label="Blogs page URL" className="sm:col-span-2">
                    <input className={inputClass} value={form.blogs_page_url} onChange={(e) => setField('blogs_page_url', e.target.value)} />
                  </Field>
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadOnlyBlock label="Meta description" value={form.meta_description} className="sm:col-span-2" />
                <ReadOnlyBlock label="Page content (summary)" value={form.page_content_summary} className="sm:col-span-2" />
                <ReadOnlyBlock label="Headings" value={form.headings} className="sm:col-span-2" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadOnlyBlock label="Industry" value={form.industry} />
                <ReadOnlyBlock label="Company type" value={form.company_type} />
                <ReadOnlyBlock label="Product category" value={form.product_category} className="sm:col-span-2" />
                <ReadOnlyBlock label="Services provided" value={form.services_provided} className="sm:col-span-2" />
                <ReadOnlyBlock label="Key keywords" value={form.key_keywords} className="sm:col-span-2" />
                <ReadOnlyBlock label="Business model" value={form.business_model} className="sm:col-span-2" />
                <ReadOnlyBlock label="Description" value={form.company_description} className="sm:col-span-2" />
                <ReadOnlyBlock label="Core values" value={form.core_values} className="sm:col-span-2" />
                <ReadOnlyBlock label="Blogs page URL" value={form.blogs_page_url} className="sm:col-span-2" />
              </div>
            </div>
          )}

          <section>
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Competitors</h4>
            {competitors.length ? (
              <div className="space-y-3">
                {competitors.map((c) => {
                  const logo = getLogoUrl(c.company_name)
                  return (
                  <div key={c.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
                      <img src={logo} alt="" className="h-full w-full object-cover" />
                    </div>
                    {profileEditing ? (
                      <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          className={inputClass}
                          placeholder="Competitor name"
                          value={c.company_name}
                          onChange={(e) => updateCompetitor(c.id, 'company_name', e.target.value)}
                        />
                        <input
                          className={inputClass}
                          placeholder="Competitor website"
                          value={c.company_website}
                          onChange={(e) => updateCompetitor(c.id, 'company_website', e.target.value)}
                        />
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="font-medium text-slate-900">{c.company_name.trim() || '—'}</div>
                        <div className="break-all text-slate-600">{c.company_website.trim() || '—'}</div>
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No competitors yet.</p>
            )}
            {profileEditing ? (
              <button
                type="button"
                onClick={addCompetitor}
                className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                + Add another competitor
              </button>
            ) : null}
          </section>
        </div>
      )
    }

    if (step === 3) {
      return (
        <div className="space-y-6 pb-4">
          <p className="text-sm text-slate-600">
            Optionally enter a topic and short description. Leave both empty to have AI suggest topics from your profile.
          </p>
          <Field label="Blog topic (optional)">
            <input className={inputClass} value={blogTopicInput} onChange={(e) => setBlogTopicInput(e.target.value)} placeholder="e.g. How teams adopt AI responsibly" />
          </Field>
          <Field label="Description (optional)">
            <textarea
              className={textareaClass}
              value={blogDescriptionInput}
              onChange={(e) => setBlogDescriptionInput(e.target.value)}
              rows={5}
              placeholder="What should this post cover?"
            />
          </Field>
        </div>
      )
    }

    if (step === 4) {
      if (researchPhase === 'streaming') {
        return (
          <div className="space-y-4 pb-4">
            <BlogWorkflowPipeline
              phase={researchWorkflowViz.phase}
              runId={researchWorkflowViz.runId}
              input={researchWorkflowViz.input}
              agents={researchWorkflowViz.agents}
              orchestratorStream={researchWorkflowViz.orchestratorStream}
              onOpenStream={setStreamModal}
              onExpandBrowser={() => {}}
            />
          </div>
        )
      }
      if (researchPhase === 'pick') {
        return (
          <div className="space-y-4 pb-4">
            <p className="text-sm text-slate-600">Select one idea to continue. This choice is required.</p>
            {!topicSuggestions.length ? (
              <p className="text-sm text-amber-800">No suggestions were returned. Go back and try again, or add a topic in the previous step.</p>
            ) : (
              <ul className="space-y-3 list-none m-0 p-0">
                {topicSuggestions.map((s, i) => {
                  const selected = selectedSuggestionIndex === i
                  return (
                    <li key={`${s.blog_title}-${i}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedSuggestionIndex(i)}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                          selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`font-semibold ${selected ? 'text-white' : 'text-slate-900'}`}>{s.blog_title}</div>
                        <div className={`mt-1 text-sm leading-relaxed ${selected ? 'text-slate-200' : 'text-slate-600'}`}>
                          {s.reason || '—'}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      }
      return null
    }

    if (step === 5) {
      return (
        <div className="space-y-4 pb-4">
          <BlogWorkflowPipeline
            phase={createWorkflowViz.phase}
            runId={createWorkflowViz.runId}
            input={createWorkflowViz.input}
            agents={createWorkflowViz.agents}
            orchestratorStream={createWorkflowViz.orchestratorStream}
            onOpenStream={setStreamModal}
            onExpandBrowser={() => {}}
          />
        </div>
      )
    }

    if (step === 6) {
      return (
        <div className="space-y-4 pb-4 text-center">
          <p className="text-sm text-slate-600">Use Show blog to preview, or Save to store workflows and content locally until the API is wired.</p>
        </div>
      )
    }

    return null
  }

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <div className={`flex min-h-0 flex-1 flex-col ${step > 1 ? 'lg:flex-row' : ''}`}>
          {step > 1 ? (
            <aside className="shrink-0 border-b border-slate-200 bg-white lg:flex lg:h-full lg:w-64 lg:border-b-0 lg:border-r xl:w-72">
              <div className="w-full h-full overflow-y-auto pt-5 pb-4">
                <BlogCreateStepsNav currentStep={step} />
              </div>
            </aside>
          ) : null}

          {step > 1 ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 sm:px-6">
                <h2 className="text-xl font-bold text-slate-700 tracking-tight">{STEP_HEADER_TITLES[step]}</h2>
                {step === 2 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (profileEditing) {
                        setProfileEditing(false)
                      } else {
                        setProfileEditing(true)
                      }
                    }}
                    className="text-sm font-semibold text-slate-400 underline underline-offset-4 decoration-dashed decoration-slate-500 hover:text-slate-800 hover:slate-600"
                  >
                    {profileEditing ? 'Save' : <span className="flex items-center space-x-2"><Pencil className="w-3.5 h-3.5" /> <span>Edit</span></span>}
                  </button>
                ) : null}
              </div>
              <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                <div className="w-full max-w-4xl">{rightColumn()}</div>
              </main>
              <footer className="shrink-0 border-t border-slate-200 px-4 py-2 sm:px-6">
                <div className="mx-auto w-full">{footerButtons()}</div>
              </footer>
            </div>
          ) : (
            <main className="min-h-0 min-w-0 flex flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6">
              {rightColumn()}
            </main>
          )}
        </div>
      </div>

      <SmartModal
        open={Boolean(streamModal)}
        onClose={() => setStreamModal(null)}
        animation="top"
        title={streamModal?.title ?? 'Output'}
        subtitle={streamModal?.subtitle}
        size="md"
        contentClassName="p-4"
        showFooter={false}
      >
        {streamModal ? (
          <div className="max-h-[min(70vh,28rem)] overflow-auto text-xs text-slate-800 whitespace-pre-wrap wrap-break-word sm:text-sm">
            {streamModal.body}
          </div>
        ) : null}
      </SmartModal>

      <SmartModal
        open={blogPreviewOpen}
        onClose={() => setBlogPreviewOpen(false)}
        title="Blog preview"
        size="lg"
        scrollMode="content"
        contentClassName="p-4"
        footer={
          <div className="flex w-full justify-end gap-2">
            <button
              type="button"
              onClick={() => setBlogPreviewOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                handleSaveAll()
              }}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Save
            </button>
          </div>
        }
      >
        <div className="max-h-[min(75vh,36rem)] overflow-auto text-sm text-slate-800 whitespace-pre-wrap wrap-break-word">
          {renderBlogBody()}
        </div>
      </SmartModal>
    </>
  )
}
