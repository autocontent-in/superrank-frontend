import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, highlightActiveLine, dropCursor, rectangularSelection, crosshairCursor } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, indentWithTab, history } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { foldGutter, indentOnInput, bracketMatching, foldKeymap } from '@codemirror/language'
import { defaultHighlightStyle, syntaxHighlighting, indentUnit } from '@codemirror/language'
import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { lintKeymap } from '@codemirror/lint'

const basicSetup = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  indentUnit.of('  '),
  keymap.of([
    ...defaultKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...searchKeymap,
    ...lintKeymap,
    indentWithTab,
  ]),
]

/** Minimal setup for read-only preview: line numbers + syntax highlighting only */
function readOnlyExtensions() {
  return [
    lineNumbers(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    javascript(),
    EditorView.lineWrapping,
    EditorView.editable.of(false),
  ]
}

export const CodeMirrorEditor = forwardRef(function CodeMirrorEditor(
  { value = '', onChange, placeholder = '// Start typing...', className = '', readOnly = false, onContentHeightChange },
  ref
) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const onContentHeightChangeRef = useRef(onContentHeightChange)
  onChangeRef.current = onChange
  onContentHeightChangeRef.current = onContentHeightChange

  const reportContentHeight = () => {
    const view = viewRef.current
    if (view && readOnly && onContentHeightChangeRef.current) {
      onContentHeightChangeRef.current(view.contentHeight)
    }
  }

  useImperativeHandle(ref, () => ({
    requestHeightReport: reportContentHeight,
  }), [])

  const scheduleHeightReport = () => {
    if (!readOnly) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => reportContentHeight())
    })
    const fallbackId = setTimeout(() => reportContentHeight(), 150)
    const fallback2Id = setTimeout(() => reportContentHeight(), 400)
    return () => {
      clearTimeout(fallbackId)
      clearTimeout(fallback2Id)
    }
  }

  useEffect(() => {
    if (!containerRef.current) return

    const extensions = readOnly
      ? readOnlyExtensions()
      : [
          basicSetup,
          javascript(),
          autocompletion(),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged && onChangeRef.current) {
              const doc = update.state.doc.toString()
              onChangeRef.current(doc)
            }
          }),
        ]

    const state = EditorState.create({
      doc: value,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view
    let cleanup = scheduleHeightReport()

    if (readOnly && view.contentDOM) {
      const ro = new ResizeObserver(() => reportContentHeight())
      ro.observe(view.contentDOM)
      const prevCleanup = cleanup
      cleanup = () => {
        if (typeof prevCleanup === 'function') prevCleanup()
        ro.disconnect()
      }
    }

    return () => {
      if (typeof cleanup === 'function') cleanup()
      view.destroy()
      viewRef.current = null
    }
  }, [readOnly])

  // Sync external value into editor when it changes (e.g. reset/load)
  useEffect(() => {
    const view = viewRef.current
    if (!view || value === view.state.doc.toString()) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    })
    const cleanup = scheduleHeightReport()
    return () => { if (typeof cleanup === 'function') cleanup() }
  }, [value])

  return (
    <div
      ref={containerRef}
      className={`codemirror-wrapper rounded border border-gray-200 bg-white text-left ${readOnly ? 'overflow-visible' : 'overflow-auto'} ${className}`}
    />
  )
})
