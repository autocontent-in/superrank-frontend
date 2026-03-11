import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, MoreVertical, ExternalLink, Trash2, Loader2 } from 'lucide-react'
import dayjs from 'dayjs'
import Api from '../../api/api'
import { DOCUMENT_DELETED_EVENT, DOCUMENT_CREATED_EVENT } from './DefaultLayoutWithSidebar'
import { useSnackbar } from '../../components/ui/SnackbarProvider'
import { SmartModal } from '../../components/ui/SmartModal'
import { DOCUMENT_TEMPLATES, buildTemplateContentPayload } from './documentTemplates'
const TITLE_MAX_LENGTH = 25

function formatUpdatedDate(isoString) {
  if (!isoString) return ''
  return `Updated ${dayjs(isoString).format('MMM D, YYYY')}`
}

function truncateTitle(title) {
  if (!title) return 'Untitled'
  const s = String(title).trim()
  if (s.length <= TITLE_MAX_LENGTH) return s
  return s.slice(0, TITLE_MAX_LENGTH) + '…'
}

function DeleteLoaderLine({ visible }) {
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-0 z-10030 h-0.5 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      aria-hidden
    >
      <div className="h-full w-full bg-blue-500 animate-pulse" />
    </div>
  )
}

export function Home() {

  const navigate = useNavigate()
  const { showSnackbar, updateSnackbar } = useSnackbar()
  const [isCreating, setIsCreating] = useState(false)
  const [recentDocuments, setRecentDocuments] = useState([])
  const [isLoadingRecent, setIsLoadingRecent] = useState(true)
  const [openMenuDocId, setOpenMenuDocId] = useState(null)
  const [menuPosition, setMenuPosition] = useState(null)
  const [deleteModalDoc, setDeleteModalDoc] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const menuButtonRef = useRef(null)
  const menuDropdownRef = useRef(null)
  const deleteModalDocRef = useRef(null)

  useEffect(() => {
    setIsLoadingRecent(true)
    Api.get('/documents/recent')
      .then((response) => {
        const data = response?.data?.data
        setRecentDocuments(Array.isArray(data) ? data : [])
      })
      .catch(() => setRecentDocuments([]))
      .finally(() => setIsLoadingRecent(false))
  }, [])

  useEffect(() => {
    if (!openMenuDocId) {
      setMenuPosition(null)
      return
    }
    const measure = () => {
      const el = menuButtonRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setMenuPosition({ top: rect.bottom + 4, left: rect.right - 160 })
    }
    const t = requestAnimationFrame(measure)
    const handleClickOutside = (e) => {
      const inButton = menuButtonRef.current?.contains(e.target)
      const inDropdown = menuDropdownRef.current?.contains(e.target)
      if (!inButton && !inDropdown) setOpenMenuDocId(null)
    }
    const t2 = setTimeout(() => document.addEventListener('click', handleClickOutside), 0)
    return () => {
      cancelAnimationFrame(t)
      clearTimeout(t2)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuDocId])

  function handleOpenInNewTab(doc) {
    window.open(`/documents/p/${doc.id}`, '_blank', 'noopener,noreferrer')
    setOpenMenuDocId(null)
  }

  function handleDeleteClick(doc) {
    deleteModalDocRef.current = doc
    setDeleteModalDoc(doc)
    setOpenMenuDocId(null)
  }

  function handleDeleteConfirm() {
    if (!deleteModalDoc || isDeleting) return
    setIsDeleting(true)
    const docTitle = deleteModalDoc.title || 'Untitled'
    Api.delete(`/documents/${deleteModalDoc.id}`)
      .then(() => {
        setDeleteModalDoc(null)
        setIsDeleting(false)
        window.dispatchEvent(new CustomEvent(DOCUMENT_DELETED_EVENT))
        showSnackbar({
          message: `Document "${docTitle}" deleted!`,
          variant: 'success',
          duration: 3000,
        })
        setIsLoadingRecent(true)
        Api.get('/documents/recent')
          .then((response) => {
            const data = response?.data?.data
            setRecentDocuments(Array.isArray(data) ? data : [])
          })
          .catch(() => {})
          .finally(() => setIsLoadingRecent(false))
      })
      .catch(() => {
        setIsDeleting(false)
        showSnackbar({
          message: 'Unable to delete document. Please try again.',
          variant: 'error',
          duration: 4000,
          showCloseButton: true,
        })
      })
  }

  function handleDeleteModalClose() {
    if (!isDeleting) {
      setDeleteModalDoc(null)
    }
  }

  async function handleBlankPage() {
    if (isCreating) return

    setIsCreating(true)
    const toastId = showSnackbar({
      message: 'Cooking up a new doc...',
      loading: true,
      duration: 0,
    })

    Api.post('/documents').then((response) => {
      window.dispatchEvent(new CustomEvent(DOCUMENT_CREATED_EVENT))
      updateSnackbar(toastId, {
        message: 'Document created! Let\'s go 🚀',
        variant: 'success',
        loading: false,
        duration: 3000,
      })

      window.setTimeout(() => {
        navigate(`/documents/p/${response.data.data.id}`, { state: { startCollapsedFromNewDoc: true } })
      }, 400)
    }).catch((error) => {
      updateSnackbar(toastId, {
        message: 'Unable to create document. Please try again.',
        variant: 'error',
        loading: false,
        duration: 3000,
        showCloseButton: true,
      })
    })
  }

  async function handleTemplateClick(template) {
    if (isCreating) return

    setIsCreating(true)
    const toastId = showSnackbar({
      message: `Creating ${template.title}...`,
      loading: true,
      duration: 0,
    })

    try {
      const response = await Api.post('/documents', { data: { title: template.title } })
      const docId = response.data.data.id
      const value = template.getValue()
      const payload = buildTemplateContentPayload(value)

      await Api.patch(`/documents/${docId}`, { data: payload })
      window.dispatchEvent(new CustomEvent(DOCUMENT_CREATED_EVENT))
      updateSnackbar(toastId, {
        message: `Document "${template.title}" created! 📄`,
        variant: 'success',
        loading: false,
        duration: 3000,
      })
      window.setTimeout(() => {
        navigate(`/documents/p/${docId}`, { state: { startCollapsedFromNewDoc: true } })
      }, 400)
    } catch {
      updateSnackbar(toastId, {
        message: 'Unable to create document. Please try again.',
        variant: 'error',
        loading: false,
        duration: 3000,
        showCloseButton: true,
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-12 sm:pt-6 sm:pb-16 w-full min-h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold text-slate-900 mb-8">Let&apos;s create something ✨</h1>

        <div className="grid grid-cols-6 gap-4">
          <button
            type="button"
            onClick={handleBlankPage}
            disabled={isCreating}
            className={`flex flex-col items-center gap-2 text-left border-0 bg-transparent p-0 ${isCreating ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
              }`}
          >
            <div className="w-full flex items-center justify-center aspect-3/4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/80 hover:border-blue-400 hover:bg-blue-50/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150">
              <Plus className="w-10 h-10 text-blue-500" strokeWidth={2} />
            </div>
            <span className="text-sm text-slate-600">Blank page ✨</span>
          </button>
          {DOCUMENT_TEMPLATES.map((template, i) => {
            const accentBorders = ['border-l-blue-500', 'border-l-amber-500', 'border-l-emerald-500', 'border-l-violet-500', 'border-l-rose-500', 'border-l-cyan-500']
            const accent = accentBorders[i % accentBorders.length]
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateClick(template)}
                disabled={isCreating}
                className={`flex flex-col items-center gap-2 text-left border-0 bg-transparent p-0 ${isCreating ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
              >
                <div className={`w-full flex items-center justify-center aspect-3/4 rounded-xl border border-slate-200 border-l-4 ${accent} bg-white overflow-hidden hover:border-slate-300 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-150`}>
                  <img
                    src={template.thumbnail}
                    alt=""
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <span className="text-sm text-slate-600">{template.label}</span>
              </button>
            )
          })}
        </div>

        {(isLoadingRecent || recentDocuments.length > 0) && (
          <>
            <h2 className="text-lg font-medium text-slate-700 mt-12 mb-4">Recents</h2>
            <div className="grid grid-cols-4 gap-4">
              {isLoadingRecent ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white animate-pulse"
              >
                <div className="w-full aspect-4/4 border-b border-slate-200 bg-slate-100 flex-1 min-h-0" />
                <div className="flex items-start gap-2 p-3 bg-slate-100/80">
                  <div className="w-5 h-5 rounded bg-slate-200 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-slate-200" />
                    <div className="h-3 w-1/2 rounded bg-slate-200" />
                  </div>
                </div>
              </div>
            ))
          ) : (
          recentDocuments.map((doc) => (
            <div
              key={doc.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/documents/p/${doc.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(`/documents/p/${doc.id}`)
                }
              }}
              className="flex flex-col overflow-hidden text-left rounded-xl border border-slate-200 bg-white p-0 cursor-pointer hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
            >
              <div className="w-full aspect-4/4 border-b border-slate-200 bg-white flex-1 min-h-0 overflow-hidden">
                <img
                  src={`${import.meta.env.VITE_APP_BACKEND_API || ''}/media/documents/${doc.id}/thumbnail/${doc.thumbnail || 'thumbnail.jpg'}`}
                  alt=""
                  className="w-full h-full object-cover object-[center_top]"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              </div>
              <div className="flex items-start gap-2 p-3 bg-slate-100/80">
                <FileText className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-700 truncate" title={doc.title || 'Untitled'}>{truncateTitle(doc.title)}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{formatUpdatedDate(doc.updated_at)}</div>
                </div>
                <div ref={openMenuDocId === doc.id ? menuButtonRef : null} className="relative shrink-0">
                  <button
                    type="button"
                    className="p-1 -m-1 rounded hover:bg-slate-200/80 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuDocId((prev) => (prev === doc.id ? null : doc.id))
                    }}
                    aria-label="More options"
                    aria-expanded={openMenuDocId === doc.id}
                  >
                    <MoreVertical className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          ))
          )}
            </div>
          </>
        )}
      </div>

      {openMenuDocId && menuPosition && (() => {
        const doc = recentDocuments.find((d) => d.id === openMenuDocId)
        if (!doc) return null
        return createPortal(
          <div
            ref={menuDropdownRef}
            className="fixed py-1 min-w-[160px] rounded-lg border border-slate-200 bg-white shadow-lg z-10025"
            style={{ top: menuPosition.top, left: menuPosition.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
              onClick={() => handleOpenInNewTab(doc)}
            >
              <ExternalLink className="w-4 h-4" />
              Open in new tab
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              onClick={() => handleDeleteClick(doc)}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>,
          document.body,
        )
      })()}

      <DeleteLoaderLine visible={isDeleting} />

      <SmartModal
        open={!!deleteModalDoc}
        onClose={handleDeleteModalClose}
        size="sm"
        showHeader={false}
        showFooter={false}
        closeOnBackdrop={!isDeleting}
        closeOnEscape={!isDeleting}
        showCloseButton={!isDeleting}
        staticBackdrop={isDeleting}
        animation="top"
      >
        <div className="px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Delete "<span className="text-gray-500">{(deleteModalDoc ?? deleteModalDocRef.current)?.title || ''}</span>"</h2>
          <p className="mt-2 text-slate-600">
            Sure you want to delete this? (No take-backs!)
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
