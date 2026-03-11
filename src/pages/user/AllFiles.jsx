import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Loader2, FolderOpen, FileText, MoreVertical, ExternalLink, Trash2 } from 'lucide-react'
import Api from '../../api/api'
import { DOCUMENT_DELETED_EVENT, GROUP_DELETED_EVENT } from './DefaultLayoutWithSidebar'
import { useSnackbar } from '../../components/ui/SnackbarProvider'
import { SmartModal } from '../../components/ui/SmartModal'

export function AllFiles() {
  const { showSnackbar } = useSnackbar()
  const [groups, setGroups] = useState([])
  const [documents, setDocuments] = useState([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true)
  const [openMenuGroupId, setOpenMenuGroupId] = useState(null)
  const [openMenuDocId, setOpenMenuDocId] = useState(null)
  const [menuPosition, setMenuPosition] = useState(null)
  const [deleteModalGroup, setDeleteModalGroup] = useState(null)
  const [deleteModalDoc, setDeleteModalDoc] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const menuButtonRef = useRef(null)
  const menuDropdownRef = useRef(null)
  const deleteModalGroupRef = useRef(null)
  const deleteModalDocRef = useRef(null)

  useEffect(() => {
    setIsLoadingGroups(true)
    Api.get('/groups')
      .then((response) => {
        const data = response?.data?.data
        setGroups(Array.isArray(data) ? data : [])
      })
      .catch(() => setGroups([]))
      .finally(() => setIsLoadingGroups(false))
  }, [])

  useEffect(() => {
    setIsLoadingDocuments(true)
    Api.get('/documents')
      .then((response) => {
        const data = response?.data?.data
        setDocuments(Array.isArray(data) ? data : [])
      })
      .catch(() => setDocuments([]))
      .finally(() => setIsLoadingDocuments(false))
  }, [])

  const isLoading = isLoadingGroups || isLoadingDocuments

  useEffect(() => {
    if (!openMenuGroupId && !openMenuDocId) {
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
      setOpenMenuGroupId(null)
      setOpenMenuDocId(null)
    }
    const t2 = setTimeout(() => document.addEventListener('click', handleClickOutside), 0)
    return () => {
      cancelAnimationFrame(t)
      clearTimeout(t2)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuGroupId, openMenuDocId])

  function handleOpenGroupInNewTab(group) {
    window.open(`/groups/${group.id}`, '_blank', 'noopener,noreferrer')
    setOpenMenuGroupId(null)
  }

  function handleOpenDocInNewTab(doc) {
    window.open(`/documents/p/${doc.id}`, '_blank', 'noopener,noreferrer')
    setOpenMenuDocId(null)
  }

  function handleDeleteGroupClick(group) {
    deleteModalGroupRef.current = group
    setDeleteModalGroup(group)
    setOpenMenuGroupId(null)
  }

  function handleDeleteDocClick(doc) {
    deleteModalDocRef.current = doc
    setDeleteModalDoc(doc)
    setOpenMenuDocId(null)
  }

  function handleDeleteGroupConfirm() {
    if (!deleteModalGroup || isDeleting) return
    setIsDeleting(true)
    const groupName = deleteModalGroup.name || 'Untitled group'
    const groupId = deleteModalGroup.id
    Api.delete(`/groups/${groupId}`)
      .then(() => {
        window.dispatchEvent(new CustomEvent(GROUP_DELETED_EVENT))
        setDeleteModalGroup(null)
        setIsDeleting(false)
        showSnackbar({ message: `Group "${groupName}" deleted`, variant: 'success', duration: 3000 })
        setGroups((prev) => prev.filter((g) => g.id !== groupId))
      })
      .catch(() => {
        setIsDeleting(false)
        showSnackbar({
          message: 'Unable to delete group. Please try again.',
          variant: 'error',
          duration: 4000,
          showCloseButton: true,
        })
      })
  }

  function handleDeleteDocConfirm() {
    if (!deleteModalDoc || isDeleting) return
    setIsDeleting(true)
    const docTitle = deleteModalDoc.title || 'Untitled'
    const docId = deleteModalDoc.id
    Api.delete(`/documents/${docId}`)
      .then(() => {
        window.dispatchEvent(new CustomEvent(DOCUMENT_DELETED_EVENT))
        setDeleteModalDoc(null)
        setIsDeleting(false)
        showSnackbar({ message: `Document "${docTitle}" deleted`, variant: 'success', duration: 3000 })
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

  function handleDeleteGroupModalClose() {
    if (!isDeleting) setDeleteModalGroup(null)
  }

  function handleDeleteDocModalClose() {
    if (!isDeleting) setDeleteModalDoc(null)
  }

  if (isLoading) {
    return (
      <div className="px-4 py-6 w-full min-h-full overflow-y-auto flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          <p className="text-sm text-slate-500">Loading your stuff…</p>
        </div>
      </div>
    )
  }

  const isEmpty = groups.length === 0 && documents.length === 0

  return (
    <div className="px-4 py-6 w-full min-h-full overflow-y-auto">
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <div className="max-w-full space-y-10">
        {isEmpty ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 animate-[fadeIn_0.4s_ease-out_both] text-center max-w-md">
              <FolderOpen className="w-12 h-12 text-slate-300 shrink-0" strokeWidth={1.5} />
              <p className="text-slate-500 text-base">All Files and Groups will show here.</p>
            </div>
          </div>
        ) : (
        <>
        {/* GROUPS section */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Groups
          </h2>
          {groups.length === 0 ? (
            <p className="text-slate-600">No groups yet. Time to make one? 📁</p>
          ) : (
            <div className="grid grid-cols-12 gap-4">
              {groups.map((group) => (
                <div key={group.id} className="flex flex-col gap-2 group text-center">
                  <div className="relative flex items-center justify-center aspect-square rounded-lg border border-slate-200 bg-white overflow-hidden group-hover:border-blue-300 group-hover:bg-blue-50/50 transition-colors">
                    <div ref={openMenuGroupId === group.id ? menuButtonRef : null} className="absolute top-1.5 right-1.5 z-10">
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-slate-200/80 transition-colors"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setOpenMenuGroupId((prev) => (prev === group.id ? null : group.id))
                          setOpenMenuDocId(null)
                        }}
                        aria-label="More options"
                        aria-expanded={openMenuGroupId === group.id}
                      >
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                    <Link to={`/groups/${group.id}`} className="absolute inset-0 flex items-center justify-center" aria-hidden tabIndex={-1}>
                      <FolderOpen className="w-10 h-10 text-slate-500 shrink-0 pointer-events-none" />
                    </Link>
                  </div>
                  <Link to={`/groups/${group.id}`} className="flex flex-col gap-0.5 -mt-1">
                    <span className="font-medium text-sm text-slate-700">
                      {group.name || 'Untitled group'}
                    </span>
                    {group.description && (
                      <span className="text-sm text-slate-500 line-clamp-2">{group.description}</span>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* DOCUMENTS section */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Documents
          </h2>
          {documents.length === 0 ? (
            <p className="text-slate-600">Nothing here yet. Blank canvas energy 🎨</p>
          ) : (
            <div className="grid grid-cols-8 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="flex flex-col gap-2 group text-center">
                  <div className="relative flex items-center justify-center aspect-square rounded-lg border border-slate-200 bg-white overflow-hidden group-hover:border-blue-300 group-hover:bg-blue-50/50 transition-colors">
                    <div ref={openMenuDocId === doc.id ? menuButtonRef : null} className="absolute top-1.5 right-1.5 z-10">
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-slate-200/80 transition-colors"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setOpenMenuDocId((prev) => (prev === doc.id ? null : doc.id))
                          setOpenMenuGroupId(null)
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
        </section>
        </>
        )}
      </div>

      {openMenuGroupId && menuPosition && (() => {
        const group = groups.find((g) => g.id === openMenuGroupId)
        if (!group) return null
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
              onClick={() => handleOpenGroupInNewTab(group)}
            >
              <ExternalLink className="w-4 h-4" />
              Open in new tab
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              onClick={() => handleDeleteGroupClick(group)}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>,
          document.body,
        )
      })()}

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
              onClick={() => handleOpenDocInNewTab(doc)}
            >
              <ExternalLink className="w-4 h-4" />
              Open in new tab
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              onClick={() => handleDeleteDocClick(doc)}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>,
          document.body,
        )
      })()}

      <SmartModal
        open={!!deleteModalGroup}
        onClose={handleDeleteGroupModalClose}
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
            Delete &quot;{(deleteModalGroup ?? deleteModalGroupRef.current)?.name || 'Untitled group'}&quot;
          </h2>
          <p className="mt-2 text-slate-600">Are you sure you want to delete this group?</p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleDeleteGroupModalClose}
              disabled={isDeleting}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteGroupConfirm}
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
        open={!!deleteModalDoc}
        onClose={handleDeleteDocModalClose}
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
          <p className="mt-2 text-slate-600">Are you sure you want to delete this document?</p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleDeleteDocModalClose}
              disabled={isDeleting}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteDocConfirm}
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
