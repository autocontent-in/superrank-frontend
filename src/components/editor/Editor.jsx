import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { createEditor, Editor as SlateEditor, Element as SlateElement, Transforms, Range } from 'slate'
import { Slate, Editable, withReact, ReactEditor } from 'slate-react'
import { withHistory } from 'slate-history'
import { Element } from './Element'
import { Leaf } from './Leaf'
import { Toolbar } from './Toolbar'
import { SlashMenu } from './SlashMenu'
import { CustomEditor, getLastHighlightColor } from './lib/utils'
import { cn, generateCellId } from './lib/utils'
import { createParagraphNode, createBlockNode, createImageNode } from './lib/editorBlocks'
import { withBlocks } from './lib/editorCore'
import { editorBlockContentToRaw, rawToEditorBlockContent, editorBlockContentToMarkdown, editorBlockContentToHTML } from './lib/editorStorage'
import { CellImagesContext } from './CellImagesContext'
import { SlashMenuContext } from './SlashMenuContext'
import { DEFAULT_SAMPLE_TEMPLATE } from './SampleTemplates'
import { Printer, Settings, Copy, Check, X, Plus } from 'lucide-react'

const DEFAULT_VALUE = [
  createParagraphNode(),
]

/**
 * Rich block editor (paragraphs, headings, math, graph, sketch, columns).
 * Save/load via your APIs: use editorBlockContentToRaw / rawToEditorBlockContent from editorStorage.
 *
 * Props:
 * - initialValue: Slate value to show on mount (default: one empty paragraph)
 * - onChange: (value) => void — called when content changes (wire to your API)
 * - showDataButton: boolean — show "Show data" button (default true)
 * - images: Array<{ cellId, name, src? }> — images keyed by cell id (for preview/display)
 * - onImagesChange: (images) => void — called when images are added/updated
 * - title: string — optional title shown to the left of the top buttons (from VITE_APP_NAME or fallback)
 */
export const Editor = ({
  initialValue: initialValueProp,
  onChange: onChangeProp,
  showDataButton = true,
  images: imagesProp = [],
  onImagesChange: onImagesChangeProp,
  title: titleProp,
}) => {
  const editor = useMemo(() => withBlocks(withHistory(withReact(createEditor()))), [])
  const [value, setValue] = useState(() => {
    if (Array.isArray(initialValueProp) && initialValueProp.length > 0) return initialValueProp
    return DEFAULT_VALUE
  })

  const slateValue = Array.isArray(value) && value.length > 0 ? value : DEFAULT_VALUE

  const [menuState, setMenuState] = useState({
    open: false,
    position: { top: 0, left: 0 }
  })
  const [showRawData, setShowRawData] = useState(false)
  const [showDataTab, setShowDataTab] = useState('json')
  const [includeImagesInMarkdown, setIncludeImagesInMarkdown] = useState(true)
  const [dataCopied, setDataCopied] = useState(false)
  const showDataPreRef = useRef(null)
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [loadInputText, setLoadInputText] = useState('')
  const [isPrintPreview, setIsPrintPreview] = useState(false)
    const [showHighlightsInPrint, setShowHighlightsInPrint] = useState(false)
    const [showPrintSettingsModal, setShowPrintSettingsModal] = useState(false)
    const [printMargin, setPrintMargin] = useState('10mm')

  useEffect(() => {
    if (isPrintPreview && showHighlightsInPrint) {
      document.body.setAttribute('data-print-highlights', 'true')
    } else {
      document.body.removeAttribute('data-print-highlights')
    }
    return () => document.body.removeAttribute('data-print-highlights')
  }, [isPrintPreview, showHighlightsInPrint])

  useEffect(() => {
    if (isPrintPreview) {
      document.body.setAttribute('data-print-margin', printMargin)
    } else {
      document.body.removeAttribute('data-print-margin')
    }
    return () => document.body.removeAttribute('data-print-margin')
  }, [isPrintPreview, printMargin])

  const modalOpen = showPrintSettingsModal || showLoadModal || showRawData
  useEffect(() => {
    if (!modalOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [modalOpen])

  useEffect(() => {
    const id = setTimeout(() => {
      const root = editor.children
      if (!Array.isArray(root) || root.length === 0) return
      const lastPath = [root.length - 1]
      try {
        Transforms.select(editor, SlateEditor.start(editor, lastPath))
        ReactEditor.focus(editor)
      } catch (_) {
        // ignore if path invalid
      }
    }, 500)
    return () => clearTimeout(id)
  }, [editor])

  const handleChange = useCallback((newValue) => {
    setValue(newValue)
    onChangeProp?.(newValue)
  }, [onChangeProp])

  const cellImagesValue = useMemo(() => ({
    images: imagesProp,
    onAddImage: (entry) => {
      if (!onImagesChangeProp) return
      const next = imagesProp.filter(img => img.cellId !== entry.cellId)
      next.push(entry)
      onImagesChangeProp(next)
    },
  }), [imagesProp, onImagesChangeProp])

  const renderElement = useCallback((props) => <Element {...props} isPrintPreview={isPrintPreview} />, [isPrintPreview])
  const renderLeaf = useCallback((props) => <Leaf {...props} />, [])

  const openSlashMenu = useCallback((position) => {
    setMenuState({ open: true, position })
  }, [])

  const onSelectBlock = (type) => {
    const { selection } = editor
    if (selection) {
      const [match] = SlateEditor.nodes(editor, {
        at: selection,
        match: n => !SlateEditor.isEditor(n) && SlateElement.isElement(n) && n.type === 'paragraph',
      })

      if (!match) return
      const [node, path] = match

      if (type === 'columns') {
        const [inColumn] = SlateEditor.nodes(editor, {
          at: path,
          match: n => !SlateEditor.isEditor(n) && SlateElement.isElement(n) && n.type === 'column',
        })
        if (inColumn) {
          setMenuState({ ...menuState, open: false })
          return
        }
      }

      if (type === 'columns') {
        const columnNodes = [
          {
            type: 'columns-container',
            id: generateCellId(),
            children: [
              { type: 'column', id: generateCellId(), children: [createParagraphNode()] },
              { type: 'column', id: generateCellId(), children: [createParagraphNode()] },
            ],
          },
        ]

        Transforms.removeNodes(editor, { at: path })
        Transforms.insertNodes(editor, columnNodes, { at: path })

        const rootExitPath = [path[0] + 1]
        if (rootExitPath[0] >= editor.children.length) {
          Transforms.insertNodes(editor, createParagraphNode(), { at: rootExitPath })
        }

        const firstParaPath = [...path, 0, 0]
        Transforms.select(editor, SlateEditor.start(editor, firstParaPath))
      } else if (type === 'image') {
        Transforms.removeNodes(editor, { at: path })
        Transforms.insertNodes(editor, createImageNode(), { at: path })
        const nextPath = [...path]
        nextPath[nextPath.length - 1] += 1
        const parentPath = path.slice(0, -1)
        const parent = parentPath.length === 0 ? editor : SlateEditor.node(editor, parentPath)[0]
        if (nextPath[nextPath.length - 1] >= parent.children.length) {
          Transforms.insertNodes(editor, createParagraphNode(), { at: nextPath })
        }
        Transforms.select(editor, SlateEditor.start(editor, path))
      } else {
        const parentPath = path.slice(0, -1)
        const parent = parentPath.length === 0
          ? editor
          : SlateEditor.node(editor, parentPath)[0]
        const hadNextSibling = path[path.length - 1] < parent.children.length - 1

        Transforms.removeNodes(editor, { at: path })
        Transforms.insertNodes(editor, createBlockNode(type), { at: path })
        if (!hadNextSibling) {
          Transforms.insertNodes(editor, createParagraphNode(), { at: [...path.slice(0, -1), path[path.length - 1] + 1] })
        }
        Transforms.select(editor, SlateEditor.start(editor, path))
      }

      ReactEditor.focus(editor)
      setMenuState({ ...menuState, open: false })
    }
  }

  const rawDataJson = showRawData
    ? JSON.stringify(editorBlockContentToRaw(slateValue, imagesProp), null, 2)
    : ''
  const baseUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_BACKEND_API ? import.meta.env.VITE_APP_BACKEND_API : ''
  const rawDataHtml = showRawData
    ? editorBlockContentToHTML(slateValue, imagesProp, { includeImages: includeImagesInMarkdown, baseUrl })
    : ''
  const rawDataMarkdown = showRawData
    ? editorBlockContentToMarkdown(slateValue, imagesProp, { includeImages: includeImagesInMarkdown, baseUrl })
    : ''

  const showDataTabContent = showDataTab === 'html' ? rawDataHtml : showDataTab === 'markdown' ? rawDataMarkdown : rawDataJson
  const hasDataContent = showRawData && showDataTabContent.trim().length > 0

  const applyLoadedData = useCallback((newValue, loadedImages) => {
    for (let i = editor.children.length - 1; i >= 0; i--) {
      Transforms.removeNodes(editor, { at: [i] })
    }
    for (let i = 0; i < newValue.length; i++) {
      Transforms.insertNodes(editor, newValue[i], { at: [i] })
    }
    setValue(newValue)
    onChangeProp?.(newValue)
    if (loadedImages?.length > 0 && onImagesChangeProp) onImagesChangeProp(loadedImages)
    else if (loadedImages?.length === 0 && onImagesChangeProp) onImagesChangeProp([])
    Transforms.select(editor, SlateEditor.start(editor, [0]))
  }, [editor, onChangeProp, onImagesChangeProp])

  const handleLoadSubmit = useCallback(() => {
    let parsed = loadInputText.trim()
    if (!parsed) return
    try {
      parsed = parsed.startsWith('{') || parsed.startsWith('[') ? JSON.parse(parsed) : null
    } catch {
      return
    }
    const { value: newValue, images: loadedImages } = rawToEditorBlockContent(parsed)
    applyLoadedData(newValue, loadedImages)
    setShowLoadModal(false)
    setLoadInputText('')
  }, [loadInputText, applyLoadedData])

  const handleLoadSample = useCallback(() => {
    const { value: newValue, images: loadedImages } = rawToEditorBlockContent(DEFAULT_SAMPLE_TEMPLATE.data)
    applyLoadedData(newValue, loadedImages)
  }, [applyLoadedData])

  return (
    <div className={cn('w-full relative', isPrintPreview && 'print-preview', isPrintPreview && showHighlightsInPrint && 'print-preview-show-highlights')}>
      {isPrintPreview && (
        <div className="print-preview-header sticky top-0 z-20 bg-white border-b border-slate-200 rounded-t-2xl">
          <div className="print-preview-title flex items-center justify-between gap-4 px-5 py-3 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              {titleProp && (
                <>
                  <h1 className="text-xl font-bold text-slate-900 truncate">{titleProp}</h1>
                  <span className="w-px h-4 bg-slate-200 shrink-0" aria-hidden />
                </>
              )}
              <span className="font-medium text-slate-500">Print Preview</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setShowPrintSettingsModal(true)}
                  className="editor-top-btn p-2 text-slate-500 hover:text-slate-900 hover:bg-white transition-all rounded-md"
                  title="Print settings"
                >
                  <Settings size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="editor-top-btn p-2 text-slate-500 hover:text-slate-900 hover:bg-white transition-all rounded-md"
                  title="Print"
                >
                  <Printer size={18} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintPreview(false)}
                className="editor-top-btn p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all rounded-md"
                title="Exit print preview"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
      {showPrintSettingsModal && isPrintPreview && (
        <div
          className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
          onClick={() => setShowPrintSettingsModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-lg border border-slate-200 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <span className="font-semibold text-slate-900 text-sm">Print settings</span>
              <button
                type="button"
                onClick={() => setShowPrintSettingsModal(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHighlightsInPrint}
                  onChange={(e) => setShowHighlightsInPrint(e.target.checked)}
                  className="rounded border-slate-200 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-900">Show highlights in print</span>
              </label>

              <hr className="my-4 border-dashed border-slate-200" />

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-slate-900">Print margin</legend>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="printMargin"
                      value="10mm"
                      checked={printMargin === '10mm'}
                      onChange={() => setPrintMargin('10mm')}
                      className="h-4 w-4 border-slate-200 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-900">A4 – 10 × 10 mm (Default)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="printMargin"
                      value="8x6"
                      checked={printMargin === '8x6'}
                      onChange={() => setPrintMargin('8x6')}
                      className="h-4 w-4 border-slate-200 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-900">A4 – 8 × 6 mm</span>
                  </label>
                </div>
              </fieldset>
            </div>
          </div>
        </div>
      )}
      {showDataButton && !isPrintPreview && (
        <div className="editor-top-buttons flex items-center justify-between gap-4 px-5 py-3 border-b border-slate-200 bg-white rounded-t-2xl">
          {titleProp ? (
            <h1 className="app-title text-xl font-bold tracking-tight text-slate-900">{titleProp}</h1>
          ) : (
            <span className="flex-1" />
          )}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setIsPrintPreview(true)}
              className="editor-top-btn px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-white rounded-md transition-all"
            >
              Print
            </button>
            <button
              type="button"
              onClick={() => setShowLoadModal(true)}
              className="editor-top-btn px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-white rounded-md transition-all"
            >
              Load
            </button>
            <button
              type="button"
              onClick={handleLoadSample}
              className="editor-top-btn px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-white rounded-md transition-all"
            >
              Load sample
            </button>
            <button
              type="button"
              onClick={() => setShowRawData(true)}
              className="editor-top-btn px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-white rounded-md transition-all"
            >
              Show data
            </button>
          </div>
        </div>
      )}
      {showLoadModal && (
        <div
          className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
          onClick={() => setShowLoadModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-lg border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <span className="font-semibold text-slate-900">Load raw data</span>
              <button
                type="button"
                onClick={() => { setShowLoadModal(false); setLoadInputText('') }}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 flex-1 flex flex-col min-h-0">
              <p className="text-sm text-slate-500 mb-2">Paste raw editor data (JSON: array of blocks, or object with &quot;content&quot; and optional &quot;images&quot;):</p>
              <textarea
                value={loadInputText}
                onChange={(e) => setLoadInputText(e.target.value)}
                placeholder='{"content":[...],"images":[{"cellId":"...","name":"file.jpg","src":"data:..."}]}'
                className="flex-1 min-h-[200px] p-4 text-sm font-mono border border-slate-200 rounded-lg bg-slate-100/50 text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600"
                spellCheck={false}
              />
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => { setShowLoadModal(false); setLoadInputText('') }}
                className="px-4 py-2 text-sm font-medium text-slate-500 bg-transparent hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLoadSubmit}
                className="px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 bg-blue-600 text-white hover:opacity-90 rounded-lg transition-opacity"
              >
                <Plus className="w-4 h-4" />
                <span>Load</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {showRawData && (
        <div
          className="fixed inset-0 z-[10002] flex items-start justify-center pt-20 px-4 pb-4 bg-black/40 backdrop-blur-md select-none overflow-auto"
          onClick={() => { setShowRawData(false); setShowDataTab('json') }}
        >
          <div
            className="bg-white rounded-2xl shadow-lg border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden select-none shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <span className="font-semibold text-slate-900">Show data</span>
              <button
                type="button"
                onClick={() => { setShowRawData(false); setShowDataTab('json') }}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center border-b border-slate-200 gap-1 px-2">
              <button
                type="button"
                onClick={() => setShowDataTab('json')}
                className={cn(
                  'px-4 py-2.5 text-xs font-semibold transition-colors rounded-t-lg border-b-2 -mb-px',
                  showDataTab === 'json'
                    ? 'text-blue-700 border-blue-700 bg-blue-100/50'
                    : 'text-slate-500 hover:text-slate-900 border-transparent'
                )}
              >
                JSON
              </button>
              <button
                type="button"
                onClick={() => setShowDataTab('html')}
                className={cn(
                  'px-4 py-2.5 text-xs font-semibold transition-colors rounded-t-lg border-b-2 -mb-px',
                  showDataTab === 'html'
                    ? 'text-blue-700 border-blue-700 bg-blue-100/50'
                    : 'text-slate-500 hover:text-slate-900 border-transparent'
                )}
              >
                HTML
              </button>
              <button
                type="button"
                onClick={() => setShowDataTab('markdown')}
                className={cn(
                  'px-4 py-2.5 text-xs font-semibold transition-colors rounded-t-lg border-b-2 -mb-px',
                  showDataTab === 'markdown'
                    ? 'text-blue-700 border-blue-700 bg-blue-100/50'
                    : 'text-slate-500 hover:text-slate-900 border-transparent'
                )}
              >
                Markdown
              </button>
              {(showDataTab === 'html' || showDataTab === 'markdown') && (
                <label className="ml-auto flex items-center gap-2 px-4 py-2.5 text-xs text-slate-500 cursor-pointer hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={includeImagesInMarkdown}
                    onChange={(e) => setIncludeImagesInMarkdown(e.target.checked)}
                    className="rounded border-slate-200 text-blue-600 focus:ring-blue-500"
                  />
                  Images
                </label>
              )}
            </div>
            <div className="flex-1 relative flex flex-col min-h-[240px]">
              {hasDataContent && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(showDataTabContent)
                      setDataCopied(true)
                      setTimeout(() => setDataCopied(false), 2000)
                    } catch (_) {}
                  }}
                  className="absolute right-3 top-3 z-10 p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm"
                  title={dataCopied ? 'Copied!' : 'Copy to clipboard'}
                >
                  {dataCopied ? <Check className="w-4 h-4 text-blue-600" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
              {hasDataContent ? (
                <pre
                  ref={showDataPreRef}
                  tabIndex={0}
                  className="flex-1 min-h-0 p-5 pr-14 overflow-auto text-sm text-slate-900 bg-slate-100/50 font-mono whitespace-pre-wrap break-words select-text outline-none rounded-b-2xl"
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                      e.preventDefault()
                      const pre = showDataPreRef.current
                      if (pre) {
                        const range = document.createRange()
                        range.selectNodeContents(pre)
                        const sel = window.getSelection()
                        sel.removeAllRanges()
                        sel.addRange(range)
                      }
                    }
                  }}
                >
                  {showDataTabContent}
                </pre>
              ) : (
                <div className="flex-1 min-h-[200px] flex items-center justify-center text-slate-500 text-sm bg-slate-100/30 rounded-b-2xl">
                  There is no content
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className={cn(showRawData && 'select-none')}>
      <CellImagesContext.Provider value={cellImagesValue}>
        <SlashMenuContext.Provider value={{ openSlashMenu }}>
          <Slate editor={editor} initialValue={slateValue} onChange={handleChange}>
            <Toolbar />
            <div className={cn('editor-content px-6 pb-10 min-h-[500px] relative', isPrintPreview && 'pointer-events-none')}>
              <Editable
                readOnly={isPrintPreview}
                renderElement={renderElement}
                renderLeaf={renderLeaf}
                spellCheck={!isPrintPreview}
                autoFocus={!isPrintPreview}
                className="outline-none"
                onKeyDown={event => {
                  if (isPrintPreview) return
                  const { selection } = editor
                  if (!selection) return

                  if (event.key === '/') {
                    const [match] = SlateEditor.nodes(editor, {
                      match: n => !SlateEditor.isEditor(n) && SlateElement.isElement(n) && n.type === 'paragraph',
                    })

                    if (match) {
                      const text = SlateEditor.string(editor, selection.anchor.path)
                      if (text.trim() === '') {
                        const domSelection = window.getSelection()
                        if (domSelection && domSelection.rangeCount > 0) {
                          const range = domSelection.getRangeAt(0)
                          const rect = range.getBoundingClientRect()
                          setMenuState({
                            open: true,
                            position: { top: rect.top, left: rect.left }
                          })
                        }
                      }
                    }
                  }

                  if (menuState.open && !['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) {
                    setMenuState({ ...menuState, open: false })
                  }

                  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
                    event.preventDefault()
                    const [block] = SlateEditor.nodes(editor, {
                      match: n => !SlateEditor.isEditor(n) && SlateElement.isElement(n),
                      at: selection,
                    })
                    if (block) {
                      const [, path] = block
                      Transforms.select(editor, {
                        anchor: SlateEditor.start(editor, path),
                        focus: SlateEditor.end(editor, path),
                      })
                    }
                    return
                  }

                  if (!event.ctrlKey && !event.metaKey) return

                  switch (event.key) {
                    case 'b': {
                      event.preventDefault()
                      CustomEditor.toggleMark(editor, 'bold')
                      break
                    }
                    case 'i': {
                      event.preventDefault()
                      CustomEditor.toggleMark(editor, 'italic')
                      break
                    }
                    case 'u': {
                      event.preventDefault()
                      CustomEditor.toggleMark(editor, 'underline')
                      break
                    }
                    case '`': {
                      event.preventDefault()
                      CustomEditor.toggleMark(editor, 'code')
                      break
                    }
                    case 'h': {
                      event.preventDefault()
                      const current = CustomEditor.getHighlightColor(editor)
                      if (current) {
                        CustomEditor.setHighlight(editor, null)
                      } else {
                        CustomEditor.setHighlight(editor, getLastHighlightColor())
                      }
                      break
                    }
                  }
                }}
              />
              {menuState.open && !isPrintPreview && (
                <SlashMenu
                  position={menuState.position}
                  onSelect={onSelectBlock}
                  onClose={() => setMenuState({ ...menuState, open: false })}
                />
              )}
            </div>
          </Slate>
        </SlashMenuContext.Provider>
      </CellImagesContext.Provider>
      </div>
    </div>
  )
}
