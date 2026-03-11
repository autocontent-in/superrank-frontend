import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Check, Copy, Loader2, Pencil, CheckCheck } from 'lucide-react'
import html2canvas from 'html2canvas'
import { toPng, toJpeg } from 'html-to-image'
import { CrapEditorProvider, CrapEditor, CrapToolbar } from '../../components/editorb2b'
import '../../components/editorb2b/editorb2b.css'
import {
  rawToEditorBlockContent,
  editorBlockContentToRaw,
  editorBlockContentToMarkdown,
  editorBlockContentToHTML,
} from '../../components/editor/lib/editorStorage'
import { DEFAULT_BLOCK_MENU_ITEMS } from '../../components/editor/lib/editorBlocks'
import { PagePropertiesTabStrip, TABS, PANEL_WIDTH, PANEL_WIDTH_AI } from './DocumentProperties'
import Api from '../../api/api'
import { generateImageStorageName } from '../../components/editor/lib/utils'
import { SmartModal } from '../../components/ui/SmartModal'
import { useSnackbar } from '../../components/ui/SnackbarProvider'
import { PrintPreviewContext } from '../../components/editor/PrintPreviewContext'
import { DOCUMENT_DELETED_EVENT, DOCUMENT_MODIFIED_EVENT } from './DefaultLayoutWithSidebar'

const { value: DEFAULT_DOC } = rawToEditorBlockContent(null)

const IMG_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g

function MarkdownWithImagePreview({ markdown }) {
  const segments = []
  let lastIndex = 0
  let m
  IMG_REGEX.lastIndex = 0
  while ((m = IMG_REGEX.exec(markdown)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ type: 'text', content: markdown.slice(lastIndex, m.index) })
    }
    segments.push({ type: 'img', alt: m[1], url: m[2] })
    lastIndex = IMG_REGEX.lastIndex
  }
  if (lastIndex < markdown.length) {
    segments.push({ type: 'text', content: markdown.slice(lastIndex) })
  }
  if (segments.length === 0 && markdown) {
    segments.push({ type: 'text', content: markdown })
  }

  return (
    <div className="h-full max-w-none overflow-auto bg-white p-4 pt-12 pb-10 text-xs leading-relaxed text-slate-800 font-mono">
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i} className="whitespace-pre-wrap wrap-break-word block">
            {seg.content}
          </span>
        ) : (
          <span key={i} className="block my-2">
            <img src={seg.url} alt={seg.alt} className="max-w-full h-auto rounded" />
          </span>
        )
      )}
    </div>
  )
}

const B2B_BLOCKS = (() => {
  const byId = Object.fromEntries(DEFAULT_BLOCK_MENU_ITEMS.map((b) => [b.id, b]))
  return [byId.graph, byId.sketch, byId.code, byId.table, byId.image, byId.columns, byId.horizontal_line_solid].filter(Boolean)
})()

const CONTENT_SAVE_DEBOUNCE_MS = 3000
const S_CB_DP = 's_cb_dp'

function getInitialPropertiesCollapsed(location) {
  if (location?.state?.startCollapsedFromNewDoc) return true
  try {
    const stored = localStorage.getItem(S_CB_DP)
    if (stored === 'true') return true
    if (stored === 'false') return false
  } catch (_) { /* ignore */ }
  return false
}

function SaveLoaderLine({ visible }) {
  return (
    <div
      className={`document-no-print pointer-events-none absolute inset-x-0 top-0 z-40 h-2 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'
        }`}
      aria-hidden
    >
      <div className="h-full w-full bg-blue-400 animate-pulse" />
    </div>
  )
}

function DeleteLoaderLine({ visible }) {
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-0 z-10030 h-0.5 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'
        }`}
      aria-hidden
    >
      <div className="h-full w-full bg-blue-500 animate-pulse" />
    </div>
  )
}

export function Document() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const { showSnackbar } = useSnackbar()
  const [value, setValue] = useState(DEFAULT_DOC)
  const [images, setImages] = useState([])
  const [activeTabId, setActiveTabId] = useState('info')
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(() => getInitialPropertiesCollapsed(location))
  const [documentTitle, setDocumentTitle] = useState(() => `Document ${id}`)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInputValue, setTitleInputValue] = useState('')
  const [isLoadingDocument, setIsLoadingDocument] = useState(true)
  const [documentLoadError, setDocumentLoadError] = useState('')
  const [documentMeta, setDocumentMeta] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isMarkdownModalOpen, setIsMarkdownModalOpen] = useState(false)
  const [markdownPreview, setMarkdownPreview] = useState('')
  const [markdownShowImageLinks, setMarkdownShowImageLinks] = useState(false)
  const [isMarkdownCopied, setIsMarkdownCopied] = useState(false)
  const [isDocumentStructureModalOpen, setIsDocumentStructureModalOpen] = useState(false)
  const [documentStructureJson, setDocumentStructureJson] = useState('')
  const [isStructureEditMode, setIsStructureEditMode] = useState(false)
  const [isStructureCopied, setIsStructureCopied] = useState(false)
  const [editorContentKey, setEditorContentKey] = useState(0)
  const [isPrintPreview, setIsPrintPreview] = useState(false)
  const [isDocumentPreview, setIsDocumentPreview] = useState(false)
  const [printSettings, setPrintSettings] = useState({ showHighlighter: true, pageMargin: '10x10', keepBlocksTogether: false })
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const titleInputRef = useRef(null)
  const titleMeasureRef = useRef(null)
  const contentAreaRef = useRef(null)
  const documentPrintAreaRef = useRef(null)
  const contentSaveTimerRef = useRef(null)
  const initialThumbnailCapturedForRef = useRef(null)
  const markdownCopiedTimerRef = useRef(null)
  const isContentAutosaveReadyRef = useRef(false)
  const lastSavedContentSignatureRef = useRef('')
  const pendingSaveCountRef = useRef(0)

  const startSaving = useCallback(() => {
    pendingSaveCountRef.current += 1
    setIsSaving(true)
    showSnackbar({
      message: 'Saving...',
      loading: true,
      duration: 2000,
      position: 'bottom-right',
    })
  }, [showSnackbar])

  const stopSaving = useCallback(() => {
    pendingSaveCountRef.current = Math.max(0, pendingSaveCountRef.current - 1)
    if (pendingSaveCountRef.current === 0) {
      setIsSaving(false)
    }
  }, [])

  const handlePropertiesCollapsedChange = useCallback((collapsed) => {
    setPropertiesCollapsed(collapsed)
    try {
      localStorage.setItem(S_CB_DP, String(collapsed))
    } catch (_) { /* ignore */ }
  }, [])

  const patchDocument = useCallback(async (payload) => {
    if (!id) return
    startSaving()
    try {
      await Api.patch(`/documents/${id}`, { data: payload })
      window.dispatchEvent(new CustomEvent(DOCUMENT_MODIFIED_EVENT))
    } finally {
      stopSaving()
    }
  }, [id, startSaving, stopSaving])

  const captureAndUploadThumbnail = useCallback(async () => {
    if (!id) return
    const contentEl = contentAreaRef.current
    const viewportEl = documentPrintAreaRef.current
    if (!contentEl && !viewportEl) {
      // eslint-disable-next-line no-console
      console.warn('[thumbnail] No content element to capture')
      return
    }

    const scrollParent = contentEl?.closest('.document-print-area')
    const scrollTopBefore = scrollParent?.scrollTop ?? 0
    const el = contentEl || viewportEl
    const margin = printSettings?.pageMargin || '10x10'

    const excludeEditingUI = (node) => {
      const tag = node?.tagName?.toUpperCase?.()
      if (tag === 'CANVAS' || tag === 'IFRAME' || tag === 'OBJECT') return false
      const cls = node?.className ?? ''
      if (typeof cls !== 'string') return true
      const editingClasses = [
        'editor-block-actions',
        'editor-image-block-actions',
        'editor-image-toolbar',
        'editor-column-toolbar',
        'editor-divider-toolbar',
        'editor-table-toolbar',
        'editor-toolbar',
        'editor-top-buttons',
      ]
      return !editingClasses.some((c) => cls.includes(c))
    }

    const prevHighlights = document.body.getAttribute('data-print-highlights')
    const prevMargin = document.body.getAttribute('data-print-margin')
    const prevKeepBlocks = document.body.getAttribute('data-print-keep-blocks-together')

    try {
      if (scrollParent) scrollParent.scrollTop = 0
      if (scrollParent) {
        scrollParent.classList.add('print-preview', 'print-preview-show-highlights', `print-preview-margin-${margin}`)
        document.body.setAttribute('data-print-highlights', 'true')
        if (margin) document.body.setAttribute('data-print-margin', margin)
        if (printSettings?.keepBlocksTogether) document.body.setAttribute('data-print-keep-blocks-together', 'true')
        await new Promise((r) => setTimeout(r, 100))
      }

      const dataUrl = await toJpeg(el, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        skipFonts: true,
        pixelRatio: 1,
        quality: 0.85,
        filter: excludeEditingUI,
      })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('thumbnail', file)

      await Api.patch(`/documents/${id}/thumbnail`, formData)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[thumbnail] Capture or upload failed:', err)
    } finally {
      if (scrollParent) scrollParent.scrollTop = scrollTopBefore
      if (scrollParent) {
        scrollParent.classList.remove('print-preview', 'print-preview-show-highlights', `print-preview-margin-${margin}`)
      }
      if (prevHighlights !== null) document.body.setAttribute('data-print-highlights', prevHighlights)
      else document.body.removeAttribute('data-print-highlights')
      if (prevMargin !== null) document.body.setAttribute('data-print-margin', prevMargin)
      else document.body.removeAttribute('data-print-margin')
      if (prevKeepBlocks !== null) document.body.setAttribute('data-print-keep-blocks-together', prevKeepBlocks)
      else document.body.removeAttribute('data-print-keep-blocks-together')
    }
  }, [id, printSettings])

  const buildContentPayload = useCallback((editorValue, editorImages) => {
    const baseUrl = import.meta.env.VITE_APP_BACKEND_API || ''
    const content_json = editorBlockContentToRaw(editorValue, editorImages)
    const content_markdown = editorBlockContentToMarkdown(editorValue, editorImages, { baseUrl })
    const content = editorBlockContentToHTML(editorValue, editorImages, { baseUrl })
    return { content_json, content_markdown, content }
  }, [])

  const loadDocument = useCallback(async () => {
    if (!id) return

    setIsLoadingDocument(true)
    setDocumentLoadError('')

    try {
      const response = await Api.get(`/documents/${id}`)
      const documentPayload = response?.data?.data ?? response?.data
      const nextTitle = documentPayload?.title?.trim() || `Document ${id}`
      const sourceContentJson = documentPayload?.content_json ?? null

      // Load from content_json as the canonical editor payload and normalize shape.
      const parsedEditor = rawToEditorBlockContent(sourceContentJson)
      const normalizedRaw = editorBlockContentToRaw(parsedEditor.value, parsedEditor.images)
      const normalizedEditor = rawToEditorBlockContent(normalizedRaw)
      const initialContentPayload = buildContentPayload(normalizedEditor.value, normalizedEditor.images)

      setDocumentTitle(nextTitle)
      setTitleInputValue(nextTitle)
      setValue(normalizedEditor.value)
      setImages(normalizedEditor.images)
      setDocumentMeta({
        description: documentPayload?.description ?? '',
        tags: documentPayload?.tags ?? [],
        created_at: documentPayload?.created_at,
        updated_at: documentPayload?.updated_at ?? documentPayload?.updatedAt,
        thumbnail: documentPayload?.thumbnail ?? null,
      })
      lastSavedContentSignatureRef.current = JSON.stringify(initialContentPayload)
      isContentAutosaveReadyRef.current = false
    } catch (error) {
      if (error?.response?.status === 404) {
        navigate('/404', { replace: true })
        return
      }
      setDocumentLoadError('Unable to load document. Please refresh and try again.')
      setDocumentTitle(`Document ${id}`)
      setTitleInputValue(`Document ${id}`)
      setValue(DEFAULT_DOC)
      setImages([])
      setDocumentMeta(null)
      const fallbackContentPayload = buildContentPayload(DEFAULT_DOC, [])
      lastSavedContentSignatureRef.current = JSON.stringify(fallbackContentPayload)
      isContentAutosaveReadyRef.current = false
    } finally {
      setIsLoadingDocument(false)
    }
  }, [id, buildContentPayload, navigate])

  useEffect(() => {
    loadDocument()
  }, [loadDocument])

  useEffect(() => {
    if (isPrintPreview && printSettings?.pageMargin) {
      document.body.setAttribute('data-print-margin', printSettings.pageMargin)
    } else {
      document.body.removeAttribute('data-print-margin')
    }
    return () => document.body.removeAttribute('data-print-margin')
  }, [isPrintPreview, printSettings?.pageMargin])

  useEffect(() => {
    if (isPrintPreview && printSettings?.showHighlighter) {
      document.body.setAttribute('data-print-highlights', 'true')
    } else {
      document.body.removeAttribute('data-print-highlights')
    }
    return () => document.body.removeAttribute('data-print-highlights')
  }, [isPrintPreview, printSettings?.showHighlighter])

  useEffect(() => {
    if (printSettings?.keepBlocksTogether && !isDocumentPreview) {
      document.body.setAttribute('data-print-keep-blocks-together', 'true')
    } else {
      document.body.removeAttribute('data-print-keep-blocks-together')
    }
    return () => document.body.removeAttribute('data-print-keep-blocks-together')
  }, [printSettings?.keepBlocksTogether, isDocumentPreview])

  // Auto-size title input to content width
  useEffect(() => {
    if (!isEditingTitle || !titleMeasureRef.current || !titleInputRef.current) return
    const measure = titleMeasureRef.current
    const input = titleInputRef.current
    const text = titleInputValue || ' '
    measure.textContent = text
    input.style.width = `${Math.max(measure.scrollWidth, 40)}px`
  }, [isEditingTitle, titleInputValue])

  const handleTitleClick = useCallback(() => {
    setTitleInputValue(documentTitle)
    setIsEditingTitle(true)
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }, [documentTitle])

  const handleTitleBlur = useCallback(async () => {
    const trimmed = titleInputValue.trim()
    const nextTitle = trimmed || `Document ${id}`
    const previousTitle = documentTitle
    setDocumentTitle(nextTitle)
    setIsEditingTitle(false)

    if (!id || nextTitle === previousTitle) return

    try {
      await patchDocument({ title: nextTitle })
    } catch {
      // Keep current title in UI; next blur/edit can retry.
    }
  }, [titleInputValue, id, documentTitle, patchDocument])

  const handleChange = useCallback((newValue) => setValue(newValue), [])

  const removeImageBlock = useCallback((cellId) => {
    setValue((prev) => {
      const removeFrom = (nodes) => {
        if (!Array.isArray(nodes)) return nodes
        let changed = false
        const result = []
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i]
          if (n?.id === cellId && n?.type === 'image') {
            changed = true
            continue
          }
          if (n?.children) {
            const newChildren = removeFrom(n.children)
            if (newChildren !== n.children) {
              result.push({ ...n, children: newChildren })
              changed = true
            } else {
              result.push(n)
            }
          } else {
            result.push(n)
          }
        }
        return changed ? result : nodes
      }
      return removeFrom(JSON.parse(JSON.stringify(prev)))
    })
    setImages((prev) => prev.filter((img) => img.cellId !== cellId))
  }, [])

  const handleRequestImageUpload = useCallback(
    async ({ file, cellId, dataURL }) => {
      if (!id) return
      const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
      const name = generateImageStorageName(ext)
      const real_name = file.name
      const source = `/media/documents/${id}/content/${name}`

      const optimistic = {
        cellId,
        name,
        real_name,
        source,
        src: dataURL,
        uploading: true,
      }
      setImages((prev) => {
        const next = prev.filter((img) => img.cellId !== cellId)
        next.push(optimistic)
        return next
      })

      const formData = new FormData()
      formData.append('content_image', new File([file], name, { type: file.type }))
      formData.append('name', name)
      formData.append('real_name', real_name)

      try {
        await Api.post(`/documents/${id}/content/image`, formData)
        const baseUrl = import.meta.env.VITE_APP_BACKEND_API || ''
        setImages((prev) =>
          prev.map((img) =>
            img.cellId === cellId ? { ...img, url: baseUrl + source, uploading: false } : img
          )
        )
      } catch {
        removeImageBlock(cellId)
        showSnackbar({
          message: 'Image upload failed',
          variant: 'error',
          duration: 4000,
          showCloseButton: true,
        })
      }
    },
    [id, removeImageBlock, showSnackbar]
  )

  const handleImagesChange = useCallback((newImages) => setImages(newImages), [])
  const handleTogglePrintPreview = useCallback(() => {
    setIsDocumentPreview(false)
    setIsPrintPreview((p) => !p)
  }, [])
  const handleToggleDocumentPreview = useCallback(() => {
    setIsPrintPreview(false)
    setIsDocumentPreview((p) => !p)
  }, [])
  const handlePrintSettingsChange = useCallback((next) => setPrintSettings((s) => ({ ...s, ...next })), [])
  const handlePrint = useCallback(() => window.print(), [])

  const handleDeleteClick = useCallback(() => setDeleteModalOpen(true), [])
  const handleDeleteModalClose = useCallback(() => {
    if (!isDeleting) setDeleteModalOpen(false)
  }, [isDeleting])
  const handleDeleteConfirm = useCallback(async () => {
    if (!id || isDeleting) return
    setIsDeleting(true)
    const docTitle = documentTitle || 'Untitled'
    try {
      await Api.delete(`/documents/${id}`)
      setDeleteModalOpen(false)
      setIsDeleting(false)
      window.dispatchEvent(new CustomEvent(DOCUMENT_DELETED_EVENT))
      showSnackbar({
        message: `Document "${docTitle}" deleted`,
        variant: 'success',
        duration: 3000,
      })
      navigate('/', { replace: true })
    } catch {
      setIsDeleting(false)
      showSnackbar({
        message: 'Unable to delete document. Please try again.',
        variant: 'error',
        duration: 4000,
        showCloseButton: true,
      })
    }
  }, [id, isDeleting, documentTitle, showSnackbar, navigate])

  const handleUpdateDescription = useCallback(
    async (newDescription) => {
      if (!id) return
      const trimmed = (newDescription ?? '').trim()
      try {
        await patchDocument({ description: trimmed })
        setDocumentMeta((prev) => (prev ? { ...prev, description: trimmed } : null))
      } catch {
        // Keep current description in UI
      }
    },
    [id, patchDocument]
  )

  const handleTabChange = useCallback((tabId) => {
    if (tabId !== 'print') setIsPrintPreview(false)
    setActiveTabId(tabId)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setIsPrintPreview(false)
        setIsDocumentPreview(true)
      }
    }
    const handleKeyUp = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setIsDocumentPreview(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const handleGetMarkdown = useCallback(() => {
    const baseUrl = import.meta.env.VITE_APP_BACKEND_API || ''
    const markdown = editorBlockContentToMarkdown(value, images, { baseUrl })
    setMarkdownPreview(markdown)
    setIsMarkdownCopied(false)
    setIsMarkdownModalOpen(true)
  }, [value, images])

  const handleScreenshot = useCallback(async () => {
    const contentEl = contentAreaRef.current
    const viewportEl = documentPrintAreaRef.current
    if (!contentEl && !viewportEl) {
      showSnackbar({ message: 'Content area not found', variant: 'error', duration: 3000 })
      return
    }

    const scrollParent = contentEl?.closest('.document-print-area')
    const scrollTopBefore = scrollParent?.scrollTop ?? 0
    const el = contentEl || viewportEl

    const shouldAddPrintPreview = !scrollParent?.classList.contains('print-preview')

    const downloadImage = (dataUrl) => {
      const link = document.createElement('a')
      const docTitle = (documentTitle || 'document').replace(/[^a-zA-Z0-9_-]/g, '-')
      link.download = `${docTitle}-content-image.png`
      link.href = dataUrl
      link.click()
    }

    const html2canvasOpts = {
      useCORS: true,
      allowTaint: false,
      scale: 1,
      backgroundColor: '#ffffff',
      logging: false,
      foreignObjectRendering: false,
      imageTimeout: 15000,
      ignoreElements: (node) => {
        const tag = node?.tagName?.toUpperCase?.()
        return tag === 'CANVAS' || tag === 'IFRAME' || tag === 'OBJECT'
      },
    }

    const excludeEditingUI = (node) => {
      const tag = node?.tagName?.toUpperCase?.()
      if (tag === 'CANVAS' || tag === 'IFRAME' || tag === 'OBJECT') return false
      const cls = node?.className ?? ''
      if (typeof cls !== 'string') return true
      const editingClasses = [
        'editor-block-actions',
        'editor-image-block-actions',
        'editor-image-toolbar',
        'editor-column-toolbar',
        'editor-divider-toolbar',
        'editor-table-toolbar',
        'editor-toolbar',
        'editor-top-buttons',
      ]
      return !editingClasses.some((c) => cls.includes(c))
    }

    try {
      showSnackbar({ message: 'Capturing content...', loading: true, duration: 2000 })
      if (scrollParent) scrollParent.scrollTop = 0

      if (shouldAddPrintPreview && scrollParent) {
        scrollParent.classList.add('print-preview')
        await new Promise((r) => setTimeout(r, 100))
      }

      let dataUrl
      try {
        dataUrl = await toPng(el, {
          cacheBust: true,
          backgroundColor: '#ffffff',
          skipFonts: true,
          pixelRatio: 1,
          filter: excludeEditingUI,
        })
      } catch {
        html2canvasOpts.ignoreElements = (node) => !excludeEditingUI(node)
        const canvas = await html2canvas(el, html2canvasOpts)
        dataUrl = canvas.toDataURL('image/png')
      }

      downloadImage(dataUrl)
      showSnackbar({ message: 'Image downloaded', variant: 'success', duration: 3000 })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Image capture failed:', err)
      showSnackbar({
        message: 'Failed to capture image. Please try again.',
        variant: 'error',
        duration: 4000,
        showCloseButton: true,
      })
    } finally {
      if (shouldAddPrintPreview && scrollParent) {
        scrollParent.classList.remove('print-preview')
      }
      if (scrollParent) scrollParent.scrollTop = scrollTopBefore
    }
  }, [documentTitle, showSnackbar])

  const handleCopyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdownPreview || '')
      setIsMarkdownCopied(true)
      if (markdownCopiedTimerRef.current) {
        window.clearTimeout(markdownCopiedTimerRef.current)
      }
      markdownCopiedTimerRef.current = window.setTimeout(() => {
        setIsMarkdownCopied(false)
      }, 1500)
    } catch {
      setIsMarkdownCopied(false)
    }
  }, [markdownPreview])

  const handleGetDocumentStructure = useCallback(() => {
    const raw = editorBlockContentToRaw(value, images)
    setDocumentStructureJson(JSON.stringify(raw, null, 2))
    setIsStructureEditMode(false)
    setIsStructureCopied(false)
    setIsDocumentStructureModalOpen(true)
  }, [value, images])

  const getDocumentContent = useCallback(() => {
    return editorBlockContentToRaw(value, images)
  }, [value, images])

  const handleCopyStructure = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(documentStructureJson || '')
      setIsStructureCopied(true)
      if (markdownCopiedTimerRef.current) {
        window.clearTimeout(markdownCopiedTimerRef.current)
      }
      markdownCopiedTimerRef.current = window.setTimeout(() => {
        setIsStructureCopied(false)
      }, 1500)
    } catch {
      setIsStructureCopied(false)
    }
  }, [documentStructureJson])

  const handleApplyStructure = useCallback(() => {
    try {
      const parsed = JSON.parse(documentStructureJson)
      const { value: newValue, images: newImages } = rawToEditorBlockContent(parsed)
      setValue(newValue)
      setImages(newImages)
      setEditorContentKey((k) => k + 1)
      setIsStructureEditMode(false)
      showSnackbar({ message: 'Document structure applied', variant: 'success', duration: 2000 })
    } catch (e) {
      showSnackbar({
        message: 'Invalid JSON. Please fix syntax errors.',
        variant: 'error',
        duration: 4000,
        showCloseButton: true,
      })
    }
  }, [documentStructureJson, showSnackbar])

  useEffect(() => {
    if (!id || isLoadingDocument || documentLoadError) return

    const contentPayload = buildContentPayload(value, images)
    const nextSignature = JSON.stringify(contentPayload)

    if (!isContentAutosaveReadyRef.current) {
      isContentAutosaveReadyRef.current = true
      lastSavedContentSignatureRef.current = nextSignature
      return
    }

    if (nextSignature === lastSavedContentSignatureRef.current) return

    if (contentSaveTimerRef.current) {
      window.clearTimeout(contentSaveTimerRef.current)
    }

    contentSaveTimerRef.current = window.setTimeout(async () => {
      captureAndUploadThumbnail()
      try {
        const payloadToSend = {
          ...contentPayload,
          content_json: JSON.stringify(contentPayload.content_json),
        }
        await patchDocument(payloadToSend)
        lastSavedContentSignatureRef.current = nextSignature
      } catch {
        // Silent fail; any new change will attempt autosave again.
      }
    }, CONTENT_SAVE_DEBOUNCE_MS)

    return () => {
      if (contentSaveTimerRef.current) {
        window.clearTimeout(contentSaveTimerRef.current)
      }
    }
  }, [id, value, images, isLoadingDocument, documentLoadError, buildContentPayload, patchDocument, captureAndUploadThumbnail])

  // Initial thumbnail capture only when: thumbnail is empty AND document has content (e.g. from template).
  // Thumbnails are otherwise only captured on content change (edit).
  // Delay allows graph/sketch blocks (canvas-based) to finish async rendering.
  const INITIAL_THUMBNAIL_DELAY_MS = 2500
  const hasNonEmptyContent = useCallback(
    (val, imgs) =>
      JSON.stringify(buildContentPayload(val ?? value, imgs ?? images)) !==
      JSON.stringify(buildContentPayload(DEFAULT_DOC, [])),
    [value, images, buildContentPayload]
  )
  useEffect(() => {
    if (!id || isLoadingDocument || documentLoadError) return
    if (initialThumbnailCapturedForRef.current === id) return
    const thumbnailEmpty = !documentMeta?.thumbnail
    if (!thumbnailEmpty) return
    if (!hasNonEmptyContent(value, images)) return

    const timer = window.setTimeout(() => {
      initialThumbnailCapturedForRef.current = id
      captureAndUploadThumbnail()
    }, INITIAL_THUMBNAIL_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [id, isLoadingDocument, documentLoadError, documentMeta?.thumbnail, value, images, hasNonEmptyContent, captureAndUploadThumbnail])

  useEffect(() => {
    return () => {
      if (contentSaveTimerRef.current) {
        window.clearTimeout(contentSaveTimerRef.current)
      }
      if (markdownCopiedTimerRef.current) {
        window.clearTimeout(markdownCopiedTimerRef.current)
      }
    }
  }, [])

  const activeTab = TABS.find((t) => t.id === activeTabId) ?? TABS[0]
  const ActivePanel = activeTab.component
  const isAskAIActive = activeTabId === 'ask-ai'
  const effectivePanelWidth = isAskAIActive ? PANEL_WIDTH_AI : PANEL_WIDTH

  if (isLoadingDocument) {
    return (
      <div className="h-full min-h-0 w-full flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Loading document...</p>
      </div>
    )
  }

  if (documentLoadError) {
    return (
      <div className="h-full min-h-0 w-full flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <p className="text-sm text-rose-600">{documentLoadError}</p>
          <button
            type="button"
            onClick={loadDocument}
            className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="document-page relative h-full min-h-0 w-full flex flex-col bg-slate-50">
      <SaveLoaderLine visible={isSaving} />
      <DeleteLoaderLine visible={isDeleting} />
      <CrapEditorProvider
        key={`${id}-${editorContentKey}`}
        initialValue={value}
        onChange={handleChange}
        blocks={B2B_BLOCKS}
        images={images}
        onImagesChange={handleImagesChange}
        documentId={id}
        onRequestImageUpload={handleRequestImageUpload}
      >
        <div className="document-page-inner flex flex-1 min-h-0 w-full overflow-hidden">
          <div className="flex flex-col min-h-0 border-r border-slate-200 flex-1 min-w-0">
            <header className="document-chrome document-header shrink-0 h-14 px-4 border-b border-slate-200 bg-white flex items-center justify-center">
              <div className="w-full max-w-4xl mx-auto text-center">
                {isEditingTitle ? (
                  <div className="w-full flex justify-center">
                    <div className="relative inline-block">
                      <span
                        ref={titleMeasureRef}
                        aria-hidden
                        className="invisible absolute whitespace-pre text-lg font-semibold text-slate-900 pointer-events-none group"
                      >
                        {titleInputValue || ' '}
                      </span>
                      <input
                        ref={titleInputRef}
                        type="text"
                        value={titleInputValue}
                        onChange={(e) => setTitleInputValue(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={(e) => e.key === 'Enter' && titleInputRef.current?.blur()}
                        className="text-lg font-semibold text-slate-900 bg-transparent outline-none min-w-[40px] py-0 border border-transparent mx-2 -mt-0.5 focus:border-slate-300 transition-colors text-center"
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleTitleClick}
                    className="text-lg font-semibold text-slate-900 rounded px-1.5 pb-0.5 -mx-1.5 -my-0.5 border border-transparent hover:border-slate-300 transition-colors w-fit"
                  >
                    {documentTitle || `Document ${id}`}
                  </button>
                )}
              </div>
            </header>
            <div className="document-chrome document-toolbar-row shrink-0 border-b border-slate-200 bg-white">
              {isDocumentPreview ? (
                <div className="w-full max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-center">
                  <span className="text-sm font-medium text-slate-600">Document Preview</span>
                </div>
              ) : isPrintPreview ? (
                <div className="w-full max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-center">
                  <span className="text-sm font-medium text-slate-600">Print Preview</span>
                </div>
              ) : (
                <CrapToolbar className="w-full max-w-4xl mx-auto" />
              )}
            </div>
            <PrintPreviewContext.Provider
              value={{
                hideHighlighter: (isPrintPreview && !printSettings.showHighlighter) || isDocumentPreview,
                pageMargin: printSettings.pageMargin || '10x10',
              }}
            >
              <div
                ref={documentPrintAreaRef}
                className={[
                  'document-print-area flex-1 min-h-0 overflow-y-auto',
                  (isPrintPreview || isDocumentPreview) && 'print-preview',
                  isPrintPreview && printSettings?.showHighlighter && 'print-preview-show-highlights',
                  isPrintPreview ? 'print-preview-margin-' + (printSettings.pageMargin || '10x10') : '',
                ].filter(Boolean).join(' ')}
                data-print-margin={isPrintPreview ? (printSettings.pageMargin || '10x10') : undefined}
              >
                <div
                  ref={contentAreaRef}
                  className={(isPrintPreview || isDocumentPreview) ? 'mt-10 mb-20' : 'mt-10 mb-60'}
                >
                  <CrapEditor
                    readOnly={isPrintPreview || isDocumentPreview}
                    className="p-4 w-full max-w-4xl mx-auto border border-slate-200 bg-white min-h-[842px]"
                    placeholder="Type '/' to add a block..."
                  />
                </div>
              </div>
            </PrintPreviewContext.Provider>
          </div>
          <div
            className="document-chrome document-properties-column flex h-full min-h-0 shrink-0 flex-col overflow-hidden bg-white transition-[width] duration-200 ease-in-out"
            style={{ width: propertiesCollapsed ? 0 : effectivePanelWidth }}
          >
            <div
              className="flex min-h-0 flex-1 flex-col transition-transform duration-200 ease-in-out"
              style={{
                width: effectivePanelWidth,
                transform: propertiesCollapsed ? 'translateX(-100%)' : 'translateX(0)',
              }}
            >
              <header className="shrink-0 h-14 px-4 border-b border-slate-200 bg-white flex items-center">
                <h2 className="text-lg font-semibold text-slate-900 truncate">
                  {activeTab.label}
                </h2>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <ActivePanel
                  documentId={id}
                  documentMeta={documentMeta}
                  onGetMarkdown={handleGetMarkdown}
                  onScreenshot={handleScreenshot}
                  onGetDocumentStructure={handleGetDocumentStructure}
                  getDocumentContent={getDocumentContent}
                  onUpdateDescription={handleUpdateDescription}
                  onDeleteDocument={handleDeleteClick}
                  isPrintPreview={isPrintPreview}
                  onTogglePrintPreview={handleTogglePrintPreview}
                  isDocumentPreview={isDocumentPreview}
                  onToggleDocumentPreview={handleToggleDocumentPreview}
                  printSettings={printSettings}
                  onPrintSettingsChange={handlePrintSettingsChange}
                  onPrint={handlePrint}
                />
              </div>
            </div>
          </div>
          <div className="document-chrome document-properties-strip h-full min-h-0 flex flex-col">
            <PagePropertiesTabStrip
              activeTabId={activeTabId}
              onTabChange={handleTabChange}
              collapsed={propertiesCollapsed}
              onCollapsedChange={handlePropertiesCollapsedChange}
            />
          </div>
        </div>
      </CrapEditorProvider>
      <SmartModal
        open={isMarkdownModalOpen}
        onClose={() => {
          setIsMarkdownModalOpen(false)
          setIsMarkdownCopied(false)
          setMarkdownShowImageLinks(false)
        }}
        title="Document markdown"
        animation="top"
        size="lg"
        contentClassName="overflow-hidden"
        backdropBlur="none"
      >
        <div className="relative h-[70vh] min-h-[320px] max-h-[80vh]">
          <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMarkdownShowImageLinks((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label={markdownShowImageLinks ? 'Show Image Links' : 'Show Images'}
              title={markdownShowImageLinks ? 'Show Image Links' : 'Show Images'}
            >
              <span>{markdownShowImageLinks ? 'Show Image Links' : 'Show Images'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Copy markdown"
            >
              {isMarkdownCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isMarkdownCopied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          {markdownShowImageLinks ? (
            markdownPreview ? (
              <MarkdownWithImagePreview markdown={markdownPreview} />
            ) : (
              <pre className="h-full max-w-none whitespace-pre-wrap wrap-break-word overflow-auto bg-white p-4 pt-12 pb-10 text-xs leading-relaxed text-slate-800">
                No content available
              </pre>
            )
          ) : (
            <pre className="h-full max-w-none whitespace-pre-wrap wrap-break-word overflow-auto bg-white p-4 pt-4 pb-10 text-xs leading-relaxed text-slate-800">
              {markdownPreview || 'No content available'}
            </pre>
          )}
        </div>
      </SmartModal>
      <SmartModal
        open={isDocumentStructureModalOpen}
        onClose={() => {
          setIsDocumentStructureModalOpen(false)
          setIsStructureEditMode(false)
          setIsStructureCopied(false)
        }}
        title="Document structure"
        animation="top"
        size="lg"
        contentClassName="overflow-hidden"
        backdropBlur="none"
      >
        <div className="relative h-[70vh] min-h-[320px] max-h-[80vh]">
          <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsStructureEditMode((m) => !m)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label={isStructureEditMode ? 'View mode' : 'Edit mode'}
              title={isStructureEditMode ? 'View mode' : 'Edit mode'}
            >
              {isStructureEditMode ? <CheckCheck className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
              <span>{isStructureEditMode ? 'View' : 'Edit'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyStructure}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Copy JSON"
            >
              {isStructureCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isStructureCopied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          {isStructureEditMode ? (
            <>
              <textarea
                value={documentStructureJson}
                onChange={(e) => setDocumentStructureJson(e.target.value)}
                className="absolute inset-0 w-full h-full max-w-none p-4 pt-12 pb-4 text-xs leading-relaxed text-slate-800 font-mono bg-slate-50 border-0 resize-none focus:ring-0 focus:outline-none"
                spellCheck={false}
              />
              <div className="absolute bottom-3 right-3 z-10">
                <button
                  type="button"
                  onClick={handleApplyStructure}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-600 bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Apply
                </button>
              </div>
            </>
          ) : (
            <pre className="h-full max-w-none whitespace-pre-wrap wrap-break-word overflow-auto bg-white p-4 pt-12 pb-10 text-xs leading-relaxed text-slate-800 font-mono">
              {documentStructureJson || 'No content available'}
            </pre>
          )}
        </div>
      </SmartModal>
      <SmartModal
        open={deleteModalOpen}
        onClose={handleDeleteModalClose}
        size="sm"
        backdropBlur="xs"
        showHeader={false}
        showFooter={false}
        closeOnBackdrop={!isDeleting}
        closeOnEscape={!isDeleting}
        showCloseButton={!isDeleting}
        staticBackdrop={isDeleting}
        animation="top"
      >
        <div className="px-5 py-4">
          <h2 className="text-lg font-medium text-slate-900">
            You sure want to delete this document?
          </h2>
          <p className="mt-2 text-base text-slate-400/80">Note: This action cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleDeleteModalClose}
              disabled={isDeleting}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="px-3 py-1.5 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </SmartModal>
    </div>
  )
}
