import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Loader2, FolderOpen, MoreVertical, ExternalLink, Trash2, Plus } from 'lucide-react'
import Api from '../../api/api'
import { GROUP_CREATED_EVENT, GROUP_DELETED_EVENT, GROUP_OPEN_CREATE_GROUP_MODAL } from './DefaultLayoutWithSidebar'
import { useSnackbar } from '../../components/ui/SnackbarProvider'
import { SmartModal } from '../../components/ui/SmartModal'

export function Groups() {
  const { showSnackbar } = useSnackbar()
  const [groups, setGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [openMenuGroupId, setOpenMenuGroupId] = useState(null)
  const [menuPosition, setMenuPosition] = useState(null)
  const [deleteModalGroup, setDeleteModalGroup] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const menuButtonRef = useRef(null)
  const menuDropdownRef = useRef(null)
  const deleteModalGroupRef = useRef(null)

  const refetch = () => {
    setIsLoading(true)
    Api.get('/groups')
      .then((response) => {
        const data = response?.data?.data
        setGroups(Array.isArray(data) ? data : [])
      })
      .catch(() => setGroups([]))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    refetch()
  }, [])

  useEffect(() => {
    const handler = () => refetch()
    window.addEventListener(GROUP_CREATED_EVENT, handler)
    return () => window.removeEventListener(GROUP_CREATED_EVENT, handler)
  }, [])

  useEffect(() => {
    if (!openMenuGroupId) {
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
    }
    const t2 = setTimeout(() => document.addEventListener('click', handleClickOutside), 0)
    return () => {
      cancelAnimationFrame(t)
      clearTimeout(t2)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuGroupId])

  function handleOpenInNewTab(group) {
    window.open(`/groups/${group.id}`, '_blank', 'noopener,noreferrer')
    setOpenMenuGroupId(null)
  }

  function handleDeleteClick(group) {
    deleteModalGroupRef.current = group
    setDeleteModalGroup(group)
    setOpenMenuGroupId(null)
  }

  function handleDeleteConfirm() {
    if (!deleteModalGroup || isDeleting) return
    setIsDeleting(true)
    const groupName = deleteModalGroup.name || 'Untitled group'
    const groupId = deleteModalGroup.id
    Api.delete(`/groups/${groupId}`)
      .then(() => {
        window.dispatchEvent(new CustomEvent(GROUP_DELETED_EVENT))
        setDeleteModalGroup(null)
        setIsDeleting(false)
        showSnackbar({
          message: `Group "${groupName}" deleted`,
          variant: 'success',
          duration: 3000,
        })
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

  function handleDeleteModalClose() {
    if (!isDeleting) setDeleteModalGroup(null)
  }

  if (isLoading) {
    return (
      <div className="px-4 py-6 w-full min-h-full overflow-y-auto flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          <p className="text-sm text-slate-500">Loading groups…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 w-full min-h-full overflow-y-auto">
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <div className="max-w-full">
        {groups.length === 0 ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 animate-[fadeIn_0.4s_ease-out_both]">
              <FolderOpen className="w-12 h-12 text-slate-300 shrink-0" strokeWidth={1.5} />
              <p className="text-slate-500 text-base">No groups yet.</p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent(GROUP_OPEN_CREATE_GROUP_MODAL))}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-500" />
                <span>Create new</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            {groups.map((group) => (
              <div key={group.id} className="relative flex flex-col gap-2 group text-center">
                <div className="relative flex items-center justify-center aspect-square rounded-lg border border-slate-200 bg-white group-hover:border-blue-300 group-hover:bg-blue-50/50 transition-colors">
                  <div ref={openMenuGroupId === group.id ? menuButtonRef : null} className="absolute top-1.5 right-1.5 z-10">
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-slate-200/80 transition-colors"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setOpenMenuGroupId((prev) => (prev === group.id ? null : group.id))
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
                  <span className="font-semibold text-sm text-slate-800 truncate">{group.name || 'Untitled group'}</span>
                  {group.description && (
                    <span className="text-sm text-slate-500 line-clamp-2">{group.description}</span>
                  )}
                </Link>
              </div>
            ))}
          </div>
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
              onClick={() => handleOpenInNewTab(group)}
            >
              <ExternalLink className="w-4 h-4" />
              Open in new tab
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              onClick={() => handleDeleteClick(group)}
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
            Delete &quot;{(deleteModalGroup ?? deleteModalGroupRef.current)?.name || 'Untitled group'}&quot;
          </h2>
          <p className="mt-2 text-slate-600">
            Are you sure you want to delete this group?
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
