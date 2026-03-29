import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  FileText,
  Loader2,
  Pencil,
  PenLine,
  Search,
  Sparkles,
  Terminal,
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useSnackbar } from '../../../components/ui/SnackbarProvider'
import Api from '../../../api/api.jsx'
import AiApi from '../../../api/AiApi.jsx'
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

function blogEntryForPayload(b) {
  if (!b || typeof b !== 'object') return null
  const title = b.title != null ? String(b.title).trim() : ''
  const link = b.link != null ? String(b.link).trim() : ''
  const summary = b.summary != null ? String(b.summary).trim() : ''
  const dateRaw = b.date ?? b.datetime
  const date = dateRaw != null ? String(dateRaw).trim() : ''
  if (!title && !link && !summary && !date) return null
  return { title, link, summary, date }
}

function buildStep2Payload(form, competitors, profileBlogs = []) {
  const blogs = Array.isArray(profileBlogs)
    ? profileBlogs.map(blogEntryForPayload).filter(Boolean)
    : []
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
    blog_page_url: form.blogs_page_url,
    blogs,
    competitors: competitors.map((c) => ({
      company_name: c.company_name,
      company_website: c.company_website,
    })),
  }
}

function formatBlogDate(iso) {
  if (iso == null || iso === '') return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

/** Display label for a suggested topic row (supports suggested_blog_topics + legacy shapes). */
function suggestedTopicLabel(row) {
  if (!row || typeof row !== 'object') return ''
  return String(row.topic ?? row.blog_title ?? row.title ?? '').trim()
}

function extractSuggestedBlogTopicsFromWorkflowCompleted(parsed) {
  if (!parsed || parsed.type !== 'workflow' || parsed.event !== 'completed') return null
  const d = parsed.data
  if (!d || typeof d !== 'object') return null
  if (Array.isArray(d.suggested_blog_topics)) return d.suggested_blog_topics
  if (Array.isArray(d.blog_topics)) return d.blog_topics
  if (Array.isArray(d.blogs)) return d.blogs
  if (d.result && typeof d.result === 'object' && Array.isArray(d.result.blogs)) return d.result.blogs
  return null
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
  { step: 5, title: 'Final Blog' },
]

const STEP_HEADER_TITLES = {
  2: 'Your Business Profile',
  3: 'Blog Direction',
  4: 'Topic Ideas',
  5: 'Final Blog',
}

/** Primary CTA — matches Business Profile / app blue theme */
const BTN_PRIMARY =
  'rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors'

const BTN_SECONDARY =
  'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 transition-colors'

const BTN_HEADER_OUTLINE =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors'

function BlogCreateStepsNav({ currentStep }) {
  return (
    <nav aria-label="Blog creation steps" className="text-sm">
      <h2 className="mb-3 px-6 text-xs font-semibold uppercase tracking-wide text-blue-900/50">Steps</h2>
      <ol className="m-0 list-none space-y-1 p-0 py-4">
        {BLOG_CREATE_STEPS.map(({ step: n, title }, index) => {
          const done = currentStep > n
          const active = currentStep === n
          return (
            <li key={n} className="flex items-center space-x-2.5 px-4 py-1.5 sm:px-6">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-shadow ${
                  done
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : active
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-200 ring-offset-1 ring-offset-slate-50'
                      : 'border border-slate-200 bg-white text-slate-500'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden /> : index + 1}
              </span>
              <span
                className={`min-w-0 ${active ? 'font-semibold text-blue-950' : done ? 'text-slate-700' : 'text-slate-500'}`}
              >
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
  /** From GET /business-profiles/latest — required before starting the blog flow. */
  const [hasBusinessProfile, setHasBusinessProfile] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [competitors, setCompetitors] = useState([])
  const [profileEditing, setProfileEditing] = useState(false)
  const [profileBlogPosts, setProfileBlogPosts] = useState([])

  const [blogTopicInput, setBlogTopicInput] = useState('')
  const [blogDescriptionInput, setBlogDescriptionInput] = useState('')

  const [researchPhase, setResearchPhase] = useState('idle')
  const [topicSuggestions, setTopicSuggestions] = useState([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(null)
  /** Full topic object from the workflow (all fields); sent as `selected_topic` to create-blog. */
  const [selectedTopic, setSelectedTopic] = useState(null)

  const [topicResearchWorkflow, setTopicResearchWorkflow] = useState([])
  const [writeBlogStreamLog, setWriteBlogStreamLog] = useState('')
  const [researchWorkflowViz, setResearchWorkflowViz] = useState(WORKFLOW_VIZ_INITIAL)

  const [finalBlogTopic, setFinalBlogTopic] = useState('')
  const [finalBlogDescription, setFinalBlogDescription] = useState('')
  const [blogHtmlContent, setBlogHtmlContent] = useState('')
  const [writeBlogStreaming, setWriteBlogStreaming] = useState(false)
  const [savingBlog, setSavingBlog] = useState(false)
  const writeSelectedTopicRef = useRef(null)
  const [streamModal, setStreamModal] = useState(null)
  const [sseLogsModalOpen, setSseLogsModalOpen] = useState(false)
  const [blogPreviewOpen, setBlogPreviewOpen] = useState(false)

  const researchAbortRef = useRef(null)
  const createAbortRef = useRef(null)

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
    setHasBusinessProfile(false)
    setForm(emptyForm())
    setCompetitors([])
    setProfileBlogPosts([])
    setProfileEditing(false)
    setBlogTopicInput('')
    setBlogDescriptionInput('')
    setResearchPhase('idle')
    setTopicSuggestions([])
    setSelectedSuggestionIndex(null)
    setSelectedTopic(null)
    setTopicResearchWorkflow([])
    setWriteBlogStreamLog('')
    setResearchWorkflowViz(WORKFLOW_VIZ_INITIAL)
    setFinalBlogTopic('')
    setFinalBlogDescription('')
    setBlogHtmlContent('')
    setWriteBlogStreaming(false)
    setSavingBlog(false)
    writeSelectedTopicRef.current = null
    setStreamModal(null)
    setSseLogsModalOpen(false)
    setBlogPreviewOpen(false)
    if (researchAbortRef.current) researchAbortRef.current.abort()
    if (createAbortRef.current) createAbortRef.current.abort()
    researchAbortRef.current = null
    createAbortRef.current = null
  }, [])

  const loadPrefill = useCallback(async () => {
    setPrefillLoading(true)
    setPrefillError(null)
    setProfileBlogPosts([])
    const next = emptyForm()
    const nextCompetitors = []

    const results = await Promise.allSettled([
      Api.get('/business-profiles/latest'),
      companyId ? Api.get(`/companies/${companyId}/competitors`) : Promise.resolve(null),
    ])

    const [bpRes, compRes] = results

    let businessProfilePresent = false
    if (bpRes.status === 'fulfilled') {
      const bp = bpRes.value?.data?.data
      if (bp && typeof bp === 'object') {
        businessProfilePresent = true
        const ci = bp.company_info || {}
        const idn = bp.company_identity || {}
        const blogsList = bp.blogs_list || {}
        setProfileBlogPosts(Array.isArray(blogsList.blogs) ? blogsList.blogs : [])
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
    setHasBusinessProfile(businessProfilePresent)

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
    const payload = buildStep2Payload(form, competitors, profileBlogPosts)
    setResearchWorkflowViz(WORKFLOW_VIZ_INITIAL)
    setTopicResearchWorkflow([])
    setResearchPhase('streaming')
    setTopicSuggestions([])
    setSelectedSuggestionIndex(null)
    setSelectedTopic(null)

    try {
      await consumeAiEventStream(
        '/api/v1/research-blog-topics',
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
              const raw = extractSuggestedBlogTopicsFromWorkflowCompleted(parsed)
              const list = Array.isArray(raw)
                ? raw.filter((row) => row && typeof row === 'object' && suggestedTopicLabel(row))
                : []
              setTopicSuggestions(list)
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

  const runWriteBlog = async (topic, description, selectedTopicPayload = null) => {
    if (createAbortRef.current) createAbortRef.current.abort()
    createAbortRef.current = new AbortController()
    const base = buildStep2Payload(form, competitors, profileBlogPosts)
    writeSelectedTopicRef.current =
      selectedTopicPayload && typeof selectedTopicPayload === 'object' ? selectedTopicPayload : null
    setWriteBlogStreamLog('')
    setBlogHtmlContent('')
    setWriteBlogStreaming(true)

    const body = {
      data: {
        ...base,
        blog_topic: topic,
        blog_description: description,
        ...(selectedTopicPayload && typeof selectedTopicPayload === 'object'
          ? { selected_topic: selectedTopicPayload }
          : {}),
      },
    }

    try {
      const res = await AiApi.streamPost('/write-blog', body, {
        signal: createAbortRef.current.signal,
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}${errText ? ` — ${errText}` : ''}`)
      }

      if (!res.body) throw new Error('No response body (streaming unsupported?)')

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setBlogHtmlContent((prev) => prev + chunk)
        setWriteBlogStreamLog((prev) => prev + chunk)
      }
    } catch (e) {
      if (String(e?.name) === 'AbortError') return
      showSnackbar({ message: e?.message || String(e), variant: 'error', duration: 5000 })
    } finally {
      setWriteBlogStreaming(false)
      createAbortRef.current = null
    }
  }

  const handleContinueStep1 = () => {
    if (!hasBusinessProfile) {
      showSnackbar({
        message: 'Create a business profile first to continue.',
        variant: 'warning',
        duration: 4000,
      })
      return
    }
    setStep(2)
  }
  const handleContinueStep2 = () => {
    if (profileEditing) {
      showSnackbar({ message: 'Save your business profile first.', variant: 'warning', duration: 3000 })
      return
    }
    setStep(3)
  }
  const handleBack = () => {
    if (step <= 1) return
    if (step === 5 && writeBlogStreaming) return
    if (step === 5) {
      if (createAbortRef.current) createAbortRef.current.abort()
      createAbortRef.current = null
      setBlogHtmlContent('')
      setWriteBlogStreamLog('')
      setWriteBlogStreaming(false)
      writeSelectedTopicRef.current = null
    }
    if (step === 4) {
      setResearchPhase('idle')
      setTopicSuggestions([])
      setSelectedSuggestionIndex(null)
      setSelectedTopic(null)
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
    setSelectedTopic(null)
    setFinalBlogTopic(t)
    setFinalBlogDescription(d)
    setStep(5)
    runWriteBlog(t, d, null)
  }

  const handleContinueStep4 = () => {
    if (selectedTopic == null || selectedSuggestionIndex == null || !topicSuggestions[selectedSuggestionIndex]) {
      showSnackbar({ message: 'Select a blog topic to continue.', variant: 'warning', duration: 4000 })
      return
    }
    const label = suggestedTopicLabel(selectedTopic)
    const reason = String(selectedTopic.reason ?? selectedTopic.why ?? selectedTopic.summary ?? '').trim()
    setFinalBlogTopic(label)
    setFinalBlogDescription(reason)
    setStep(5)
    runWriteBlog(label, reason, selectedTopic)
  }

  const handleSaveAndContinueBlog = async () => {
    const content = blogHtmlContent.trim()
    if (!content) {
      showSnackbar({ message: 'Wait for the blog content to finish streaming.', variant: 'warning', duration: 4000 })
      return
    }
    if (writeBlogStreaming) {
      showSnackbar({ message: 'Still receiving content. Wait for streaming to finish.', variant: 'warning', duration: 4000 })
      return
    }
    setSavingBlog(true)
    try {
      const res = await Api.post('/ai-blogs', {
        data: {
          content,
          selected_topic: writeSelectedTopicRef.current,
        },
      })
      const id = res?.data?.data?.id ?? res?.data?.id
      if (id == null) {
        showSnackbar({ message: 'Saved, but no blog id was returned.', variant: 'warning', duration: 5000 })
        return
      }
      navigate(`/services/blogs/${encodeURIComponent(String(id))}`)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || String(e)
      showSnackbar({ message: msg, variant: 'error', duration: 5000 })
    } finally {
      setSavingBlog(false)
    }
  }

  const footerButtons = () => {
    return (
      <div className="flex w-full flex-wrap items-center justify-between">
        <button type="button" onClick={handleBack} disabled={(step === 4 && researchPhase === 'streaming') || (step === 5 && writeBlogStreaming)} className={BTN_SECONDARY}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Go back
        </button>
        <div className="flex flex-wrap gap-2">
          {step === 2 ? (
            <button type="button" onClick={handleContinueStep2} disabled={prefillLoading || profileEditing} className={BTN_PRIMARY}>
              Next
            </button>
          ) : null}
          {step === 3 ? (
            <button type="button" onClick={handleContinueStep3} className={BTN_PRIMARY}>
              Next
            </button>
          ) : null}
          {step === 4 && researchPhase === 'pick' ? (
            <button type="button" onClick={handleContinueStep4} disabled={!topicSuggestions.length} className={BTN_PRIMARY}>
              Next
            </button>
          ) : null}
          {step === 5 ? (
            <button
              type="button"
              onClick={handleSaveAndContinueBlog}
              disabled={savingBlog || writeBlogStreaming || !blogHtmlContent.trim()}
              className={BTN_PRIMARY}
            >
              {savingBlog ? 'Saving…' : 'Save and Continue'}
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  const rightColumn = () => {
    if (step === 1) {
      const welcomeFeatures = [
        {
          icon: Building2,
          title: 'Profile-grounded context',
          desc: 'Uses your business profile, positioning, and site signals so content stays on-brand.',
        },
        {
          icon: Search,
          title: 'Topic discovery',
          desc: 'AI proposes strategic angles; you approve direction before any draft is written.',
        },
        {
          icon: PenLine,
          title: 'Guided authoring',
          desc: 'Optional custom brief, or fully assisted flow from idea through streamed HTML output.',
        },
        {
          icon: FileText,
          title: 'Review & publish',
          desc: 'Inspect the draft, then save to your library when you are satisfied.',
        },
      ]

      return (
        <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-12 sm:py-16">
          <div className="w-full max-w-xl space-y-10">
            <header className="text-center sm:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-800">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" aria-hidden />
                SEM, SEO and Content flow
              </div>
              <h1 className="text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Strategic blogs, aligned with your business
              </h1>
              <p className="mx-auto mt-4 text-pretty text-sm leading-relaxed text-slate-600 sm:mx-0 sm:text-[15px]">
                Produce blogs that reflect your positioning and market context. The assistant researches themes, proposes topics you can select or override, then creates a structured blog you can review before it goes live.
              </p>
            </header>

            <ul className="list-none grid grid-cols-2 gap-4">
              {welcomeFeatures.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="border border-blue-200 rounded-lg p-4">
                  <div className="flex space-x-4">
                  <div className="flex shrink-0 items-start text-blue-600">
                    <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="min-w-0 pt-0.5 text-left">
                    <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                  </div>
                  </div>
                    <p className="mt-4 text-sm text-slate-600">{desc}</p>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              {prefillLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-2 text-center sm:flex-row sm:justify-start sm:text-left">
                  <Loader2 className="h-6 w-6 shrink-0 animate-spin text-blue-600" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-slate-800">Checking prerequisites</p>
                    <p className="mt-0.5 text-xs text-slate-500">Verifying your business profile connection…</p>
                  </div>
                </div>
              ) : hasBusinessProfile ? (
                  <button
                    type="button"
                    onClick={handleContinueStep1}
                    className={`w-full flex items-center justify-center space-x-2 py-4 ${BTN_PRIMARY}`}
                  >
                    <span>GET STARTED</span>
                    <ArrowRight className="h-4 w-4 inline-block" />
                  </button>
              ) : (
                <div className="space-y-3 text-center sm:text-left">
                  <h2 className="text-sm font-semibold text-slate-900">Business profile required</h2>
                  <p className="text-sm leading-relaxed text-slate-600">
                    This workflow relies on your saved business profile for company details, positioning, and competitive
                    context. Complete that step first to unlock blog creation.
                  </p>
                  <Link
                    to="/business-profile"
                    className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-900 sm:justify-start"
                  >
                    Create or update your business profile
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              )}
            </div>
          </div>
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
                <h4 className="mb-3 text-sm font-semibold text-blue-950">Company details</h4>
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
            <h4 className="mb-3 text-sm font-semibold text-blue-950">Blog topics</h4>
            <p className="mb-3 text-sm text-slate-600">
              Topics from your saved business profile (existing posts on your blogs page, when available).
            </p>
            {profileBlogPosts.length ? (
              <ul className="m-0 list-none space-y-3 p-0">
                {profileBlogPosts.map((b, i) => {
                  const title = b?.title != null ? String(b.title).trim() : ''
                  const link = b?.link != null ? String(b.link).trim() : ''
                  const when = formatBlogDate(b?.date ?? b?.datetime)
                  const summary = b?.summary != null ? String(b.summary).trim() : ''
                  const key = `${link || title || 'post'}-${i}`
                  return (
                    <li key={key} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                      <div className="text-sm font-medium text-slate-900">
                        {link ? (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900 break-all"
                          >
                            {title || link}
                          </a>
                        ) : (
                          <span>{title || '—'}</span>
                        )}
                      </div>
                      {when ? <div className="mt-1 text-xs text-slate-500">{when}</div> : null}
                      {summary ? <p className="mt-2 mb-0 text-sm leading-relaxed text-slate-600">{summary}</p> : null}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No blog topics in your profile yet. They appear after your business profile includes posts from your blogs page.</p>
            )}
          </section>

          <section>
            <h4 className="mb-3 text-sm font-semibold text-blue-950">Competitors</h4>
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
                  const title = suggestedTopicLabel(s)
                  const category = String(s.category ?? '').trim()
                  const reason = String(s.reason ?? s.why ?? s.summary ?? '').trim()
                  return (
                    <li key={`${title}-${i}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSuggestionIndex(i)
                          setSelectedTopic(s)
                        }}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                          selected
                            ? 'border-blue-600 bg-blue-600 text-white shadow-md ring-1 ring-blue-500/30'
                            : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/60'
                        }`}
                      >
                        <div className={`font-semibold ${selected ? 'text-white' : 'text-slate-900'}`}>{title || '—'}</div>
                        {category ? (
                          <div className={`mt-1 text-xs font-medium ${selected ? 'text-blue-100' : 'text-slate-500'}`}>
                            {category}
                          </div>
                        ) : null}
                        <div className={`mt-1 text-sm leading-relaxed ${selected ? 'text-blue-50' : 'text-slate-600'}`}>
                          {reason || '—'}
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
          {writeBlogStreaming ? (
            <p className="text-sm text-slate-600">Generating your blog…</p>
          ) : blogHtmlContent.trim() ? (
            <p className="text-sm text-slate-600">Review the draft below, then use Save and Continue to store it.</p>
          ) : (
            <p className="text-sm text-amber-800">No content was received. Go back and try again, or check the stream logs.</p>
          )}
          <div
            className="min-h-48  bg-white ring-slate-100/80 sm:p-6 [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-blue-100 [&_blockquote]:pl-4 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_img]:max-w-full [&_img]:rounded-lg [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_p]:leading-relaxed [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-50 [&_pre]:p-3 [&_pre]:text-sm [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6"
            dangerouslySetInnerHTML={
              blogHtmlContent.trim() ? { __html: blogHtmlContent } : { __html: '' }
            }
          />
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
            <aside className="shrink-0 border-b border-slate-200/80 lg:flex lg:h-full lg:w-64 lg:border-b-0 lg:border-r lg:border-slate-200/80 xl:w-72">
              <div className="w-full h-full overflow-y-auto pt-5 pb-4">
                <BlogCreateStepsNav currentStep={step} />
              </div>
            </aside>
          ) : null}

          {step > 1 ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6">
                <h2 className="text-xl font-bold tracking-tight text-blue-950">{STEP_HEADER_TITLES[step]}</h2>
                <div className="flex shrink-0 items-center gap-2">
                  {step === 4 || step === 5 ? (
                    <button
                      type="button"
                      onClick={() => setSseLogsModalOpen(true)}
                      className={`inline-flex items-center gap-1.5 shadow-none ${BTN_HEADER_OUTLINE}`}
                      aria-label="Open SSE logs"
                    >
                      <Terminal className="h-4 w-4 text-blue-600" aria-hidden />
                      SSE Logs
                    </button>
                  ) : null}
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
                      className="text-sm font-semibold text-blue-600 underline decoration-blue-300 decoration-dashed underline-offset-4 hover:text-blue-800"
                    >
                      {profileEditing ? 'Save' : <span className="flex items-center space-x-2"><Pencil className="w-3.5 h-3.5" /> <span>Edit</span></span>}
                    </button>
                  ) : null}
                  {step === 5 && blogHtmlContent.trim() ? (
                    <button type="button" onClick={() => setBlogPreviewOpen(true)} className={BTN_HEADER_OUTLINE}>
                      Preview
                    </button>
                  ) : null}
                </div>
              </div>
              <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                <div className="w-full max-w-4xl">{rightColumn()}</div>
              </main>
              <footer className="shrink-0 border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6">
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
        open={sseLogsModalOpen}
        onClose={() => setSseLogsModalOpen(false)}
        animation="top"
        showHeader={false}
        size="xl"
        className="bg-black! border-slate-800 shadow-2xl shadow-black/50"
        contentClassName="p-0 min-h-[min(75vh,40rem)] max-h-[min(75vh,40rem)] bg-black"
        showFooter={false}
      >
        <pre className="m-0 h-full min-h-[min(75vh,40rem)] max-h-[min(75vh,40rem)] overflow-auto p-4 font-mono text-xs leading-relaxed text-green-400 whitespace-pre-wrap wrap-break-word selection:bg-green-900 selection:text-green-200">
          {(() => {
            const parts = []
            if (topicResearchWorkflow.length) parts.push(topicResearchWorkflow.join('\n'))
            if (writeBlogStreamLog) parts.push(writeBlogStreamLog)
            const text = parts.join('\n\n')
            return text
          })()}
        </pre>
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
          </div>
        }
      >
        <div
          className="max-h-[min(75vh,36rem)] overflow-auto text-sm text-slate-800 [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-4 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_img]:max-w-full [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={
            blogHtmlContent.trim() ? { __html: blogHtmlContent } : { __html: '<p class="text-slate-500">—</p>' }
          }
        />
      </SmartModal>
    </>
  )
}
