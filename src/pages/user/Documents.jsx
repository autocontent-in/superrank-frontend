import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { FileText, Loader2, MoreVertical, ExternalLink, Trash2, Plus } from 'lucide-react'
import Api from '../../api/api'
import { DOCUMENT_DELETED_EVENT } from './DefaultLayoutWithSidebar'
import { useSnackbar } from '../../components/ui/SnackbarProvider'
import { SmartModal } from '../../components/ui/SmartModal'

export function Documents() {
  const { showSnackbar } = useSnackbar()
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState('Untitled')
  const [isCreating, setIsCreating] = useState(false)
  const [openMenuDocId, setOpenMenuDocId] = useState(null)
  const [menuPosition, setMenuPosition] = useState(null)
  const [deleteModalDoc, setDeleteModalDoc] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const menuButtonRef = useRef(null)
  const menuDropdownRef = useRef(null)
  const deleteModalDocRef = useRef(null)

  const refetch = useCallback(() => {
    setIsLoading(true)
    Api.get('/documents')
      .then((response) => {
        const data = response?.data?.data
        setDocuments(Array.isArray(data) ? data : [])
      })
      .catch(() => setDocuments([]))
      .finally(() => setIsLoading(false))
  }, [])

  const handleCreateModalOpen = useCallback(() => {
    setCreateTitle('Untitled')
    setCreateModalOpen(true)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

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
      if (menuButtonRef.current?.contains(e.target) || menuDropdownRef.current?.contains(e.target)) return
      setOpenMenuDocId(null)
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
    const docId = deleteModalDoc.id
    Api.delete(`/documents/${docId}`)
      .then(() => {
        setDeleteModalDoc(null)
        setIsDeleting(false)
        window.dispatchEvent(new CustomEvent(DOCUMENT_DELETED_EVENT))
        showSnackbar({
          message: `Document "${docTitle}" deleted!`,
          variant: 'success',
          duration: 3000,
        })
        setDocuments((prev) => prev.filter((d) => d.id !== docId))
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
    if (!isDeleting) setDeleteModalDoc(null)
  }

  function handleCreateModalClose() {
    if (!isCreating) setCreateModalOpen(false)
  }

  function handleCreateSubmit(e) {
    e.preventDefault()
    if (isCreating) return
    const title = (createTitle || 'Untitled').trim()
    setIsCreating(true)
    Api.post('/documents', { data: { title } })
      .then(() => {
        setCreateModalOpen(false)
        setCreateTitle('Untitled')
        showSnackbar({
          message: `Document "${title}" created!`,
          variant: 'success',
          duration: 3000,
        })
        refetch()
      })
      .catch(() => {
        showSnackbar({
          message: 'Unable to create document. Please try again.',
          variant: 'error',
          duration: 4000,
          showCloseButton: true,
        })
      })
      .finally(() => setIsCreating(false))
  }

  if (isLoading) {
    return (
      <div className="px-4 py-6 w-full min-h-full overflow-y-auto flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          <p className="text-sm text-slate-500">Loading documents…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 w-full min-h-full overflow-y-auto">
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <div className="max-w-full">
        {documents.length === 0 ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 animate-[fadeIn_0.4s_ease-out_both]">
              <FileText className="w-12 h-12 text-slate-300 shrink-0" strokeWidth={1.5} />
              <p className="text-slate-500 text-base">No documents.</p>
              <button
                type="button"
                onClick={handleCreateModalOpen}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-500" />
                <span>Create new</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="relative flex flex-col gap-2 group text-center">
                <div className="relative flex items-center justify-center aspect-square rounded-lg border border-slate-200 bg-white overflow-hidden group-hover:border-blue-300 group-hover:bg-blue-50/50 transition-colors">
                  <div ref={openMenuDocId === doc.id ? menuButtonRef : null} className="absolute top-1.5 right-1.5 z-10">
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-slate-200/80 transition-colors"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setOpenMenuDocId((prev) => (prev === doc.id ? null : doc.id))
                      }}
                      aria-label="More options"
                      aria-expanded={openMenuDocId === doc.id}
                    >
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <Link to={`/documents/p/${doc.id}`} className="absolute inset-0 flex items-center justify-center" aria-hidden tabIndex={-1}>
                    <FileText className="w-10 h-10 text-slate-500 shrink-0 pointer-events-none" aria-hidden />
                    <img
                      src={`${import.meta.env.VITE_APP_BACKEND_API || ''}/media/documents/${doc.id}/thumbnail/${doc.thumbnail || 'thumbnail.jpg'}`}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover object-[center_top] pointer-events-none"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  </Link>
                </div>
                <Link to={`/documents/p/${doc.id}`} className="flex flex-col gap-0.5 -mt-1">
                  <span className="text-sm text-slate-700" title={doc.title || 'Untitled'}>
                    {doc.title?.trim() || 'Untitled'}
                  </span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {openMenuDocId && menuPosition && (() => {
        const doc = documents.find((d) => d.id === openMenuDocId)
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
          <h2 className="text-base font-semibold text-slate-900">
            Delete &quot;{(deleteModalDoc ?? deleteModalDocRef.current)?.title || 'Untitled'}&quot;
          </h2>
          <p className="mt-2 text-slate-600">
            Are you sure you want to delete this document?
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

      <SmartModal
        open={createModalOpen}
        onClose={handleCreateModalClose}
        title="Create Document"
        showFooter={false}
        size="sm"
        closeOnBackdrop={!isCreating}
        closeOnEscape={!isCreating}
        staticBackdrop={isCreating}
        animation="top"
      >
        <form onSubmit={handleCreateSubmit} className="py-6 px-6 space-y-4">
          <div>
            <label htmlFor="documents-create-doc-title" className="block text-sm font-medium text-slate-700 mb-1">
              Title
            </label>
            <input
              id="documents-create-doc-title"
              type="text"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="Enter title"
              autoComplete="off"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCreateModalClose}
              disabled={isCreating}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="py-2 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </SmartModal>
    </div>
  )
}
