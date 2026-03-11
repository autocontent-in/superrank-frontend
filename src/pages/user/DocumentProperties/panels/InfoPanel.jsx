import { useState, useRef, useEffect, useCallback } from 'react'
import { Pencil, Trash2, Eye, X } from 'lucide-react'
import dayjs from 'dayjs'

function formatDate(isoString) {
  if (!isoString) return '-'
  const d = dayjs(isoString)
  return d.format('MMM D, YYYY')
}

function AutoGrowTextarea({ value, onChange, className = '', ...props }) {
  const ref = useRef(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => {
    resize()
  }, [value, resize])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        onChange(e.target.value)
      }}
      rows={2}
      className={`block w-full resize-none overflow-hidden py-2 px-3 text-sm text-slate-900 border-0 bg-transparent outline-none focus:ring-0 ${className}`}
      {...props}
    />
  )
}

export function InfoPanel({ documentMeta, onUpdateDescription, onDeleteDocument, isDocumentPreview, onToggleDocumentPreview }) {
  const meta = documentMeta ?? {}
  const rawDescription = meta.description?.trim() ?? ''
  const hasDescription = !!rawDescription
  const description = hasDescription ? rawDescription : '-'
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [descriptionInputValue, setDescriptionInputValue] = useState(description)
  const tags = meta.tags
  const tagsDisplay = Array.isArray(tags)
    ? tags.length > 0
      ? tags.join(', ')
      : '-'
    : typeof tags === 'string'
      ? tags.trim() || '-'
      : '-'
  const createdAt = formatDate(meta.created_at)
  const updatedAt = formatDate(meta.updated_at)

  useEffect(() => {
    if (!isEditingDescription) {
      setDescriptionInputValue(meta.description?.trim() ?? '')
    }
  }, [meta.description, isEditingDescription])

  const handleStartEdit = useCallback(() => {
    setDescriptionInputValue(meta.description?.trim() ?? '')
    setIsEditingDescription(true)
  }, [meta.description])

  const handleSave = useCallback(async () => {
    if (onUpdateDescription) {
      await onUpdateDescription(descriptionInputValue)
    }
    setIsEditingDescription(false)
  }, [descriptionInputValue, onUpdateDescription])

  const handleCancel = useCallback(() => {
    setDescriptionInputValue(meta.description?.trim() ?? '')
    setIsEditingDescription(false)
  }, [meta.description])

  return (
    <div className="p-4 space-y-5">
      {onToggleDocumentPreview && (
        <div className="pb-5 border-b border-slate-200">
          <button
            type="button"
            onClick={onToggleDocumentPreview}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {isDocumentPreview ? (
              <>
                <X className="w-4 h-4 text-slate-500 shrink-0" />
                Exit Document Preview
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-slate-500 shrink-0" />
                Preview Document <span className="font-mono text-xs text-slate-400">(Alt+P)</span>
              </>
            )}
          </button>
        </div>
      )}

      <ul className="space-y-4 text-sm text-slate-600">
        <li className="flex flex-col gap-2">
          <span className="flex items-center gap-2 font-medium text-slate-700">
            Description
            {onUpdateDescription != null && hasDescription && !isEditingDescription && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="shrink-0 p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Edit description"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </span>
          {isEditingDescription ? (
            <div className="group flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden mb-2">
              <AutoGrowTextarea
                value={descriptionInputValue}
                onChange={setDescriptionInputValue}
                placeholder="Add a description..."
                autoFocus
              />
              <div className="flex justify-end gap-1 px-1 py-1.5">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : hasDescription ? (
            <p className="text-slate-600 text-left whitespace-pre-wrap wrap-break-word mb-2">
              {description}
            </p>
          ) : onUpdateDescription != null ? (
            <button
              type="button"
              onClick={handleStartEdit}
              className="text-left text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span>click to add description</span>
            </button>
          ) : (
            <p className="text-slate-600 text-left">-</p>
          )}
        </li>
        <li className="flex items-center gap-3">
          <span className="font-medium text-slate-700">Created</span>
          <span className="text-slate-600 ml-auto text-right text-xs">{createdAt}</span>
        </li>
        <li className="flex items-center gap-3">
          <span className="font-medium text-slate-700">Updated</span>
          <span className="text-slate-600 ml-auto text-right text-xs">{updatedAt}</span>
        </li>
      </ul>

      {onDeleteDocument && (
        <div className="pt-6 mt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={onDeleteDocument}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-rose-200 bg-white px-3 py-3 text-sm font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
            Delete document
          </button>
        </div>
      )}
    </div>
  )
}
