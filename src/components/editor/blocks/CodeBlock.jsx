import { useSelected, useFocused } from 'slate-react'
import { Transforms } from 'slate'
import { ReactEditor, useSlateStatic } from 'slate-react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/utils'
import { CodeMirrorEditor } from '../codemirror/CodeMirrorEditor'

const PREVIEW_MIN_HEIGHT_PX = 40

export const CodeBlock = ({ element, isPrintPreview = false }) => {
  const selected = useSelected()
  const focused = useFocused()
  const editor = useSlateStatic()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(() => element.codeContent ?? '')
  const [previewHeight, setPreviewHeight] = useState(PREVIEW_MIN_HEIGHT_PX)

  const codeContent = element.codeContent ?? ''
  const hasContent = codeContent.trim().length > 0

  useEffect(() => {
    setEditValue(element.codeContent ?? '')
  }, [element.codeContent, isEditing])

  useEffect(() => {
    if (!isEditing) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isEditing])

  const onSave = () => {
    try {
      const path = ReactEditor.findPath(editor, element)
      Transforms.setNodes(editor, { codeContent: editValue }, { at: path })
    } catch (e) {
      console.error('Failed to save code block', e)
    }
    setIsEditing(false)
  }

  const onOpen = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setEditValue(element.codeContent ?? '')
    setIsEditing(true)
  }

  const stopPropagation = (e) => {
    e.stopPropagation()
    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation()
  }

  const containerRef = useRef(null)
  const previewContainerRef = useRef(null)
  const codeMirrorRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const stopNative = (e) => {
      e.stopPropagation()
      e.stopImmediatePropagation()
    }
    el.addEventListener('keydown', stopNative, { capture: true })
    el.addEventListener('keyup', stopNative, { capture: true })
    el.addEventListener('keypress', stopNative, { capture: true })
    return () => {
      el.removeEventListener('keydown', stopNative, { capture: true })
      el.removeEventListener('keyup', stopNative, { capture: true })
      el.removeEventListener('keypress', stopNative, { capture: true })
    }
  }, [])

  useEffect(() => {
    if (!hasContent || isPrintPreview) return
    const el = previewContainerRef.current
    if (!el) return
    const report = () => codeMirrorRef.current?.requestHeightReport?.()
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) report()
      },
      { threshold: 0, rootMargin: '50px' }
    )
    io.observe(el)
    const t1 = setTimeout(report, 600)
    const t2 = setTimeout(report, 1200)
    return () => {
      io.disconnect()
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [hasContent, isPrintPreview])

  const editorOverlay = isEditing
    ? createPortal(
        <div className="fixed inset-0 z-[10000] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-xl flex flex-col overflow-hidden border border-gray-200">
            <div className="h-14 border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
              <span className="font-semibold text-gray-700">Code Block</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-gray-500 font-semibold px-4 py-2 rounded-md text-sm transition-all underline decoration-dashed underline-offset-4 hover:decoration-gray-400 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  className="px-6 py-2 rounded-md text-sm font-semibold border border-gray-300 bg-gray-50 hover:text-gray-900 hover:bg-gray-200 cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-[360px] overflow-hidden flex flex-col">
              <CodeMirrorEditor
                value={editValue}
                onChange={setEditValue}
                className="flex-1 min-h-[360px] border-0 rounded-none"
              />
            </div>
          </div>
        </div>,
        document.body
      )
    : null

  return (
    <div className="editor-code-block relative bg-white group">
      <div
        ref={containerRef}
        contentEditable={false}
        onKeyDownCapture={stopPropagation}
        onKeyUpCapture={stopPropagation}
        className={cn(
          'rounded-xl relative transition-all duration-300 w-full bg-white border border-gray-200',
          !isPrintPreview && 'overflow-hidden',
          hasContent ? 'min-h-0' : 'min-h-[120px]',
          selected && focused ? 'border-blue-300 ring-1 ring-blue-300/50' : 'border-gray-200 hover:border-gray-300'
        )}
      >
        {!hasContent && (
          <div
            onMouseDown={onOpen}
            className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-500 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Click to edit code</span>
            </div>
          </div>
        )}

        {hasContent && (
          <>
            <div
              ref={previewContainerRef}
              role="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onOpen(e)
              }}
              style={isPrintPreview ? undefined : { height: previewHeight }}
              className={cn(
                'editor-code-block-preview relative z-10 cursor-pointer hover:bg-gray-50/80 transition-colors [&_.cm-editor]:outline-none [&_.cm-scroller]:overflow-visible',
                isPrintPreview && '!h-auto !min-h-0'
              )}
            >
              <CodeMirrorEditor
                ref={codeMirrorRef}
                readOnly
                value={codeContent}
                className={isPrintPreview ? 'min-h-0 border-0 rounded-none' : 'h-full border-0 rounded-none'}
                onContentHeightChange={isPrintPreview ? undefined : setPreviewHeight}
              />
            </div>
            <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-all">
              <button
                type="button"
                onMouseDown={onOpen}
                className="text-[10px] font-black uppercase tracking-tighter text-gray-500 hover:text-gray-900 transition-colors bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md border border-gray-200 shadow-sm"
              >
                Edit code
              </button>
            </div>
          </>
        )}

        {editorOverlay}
      </div>
    </div>
  )
}
