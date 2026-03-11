import { useContext, useRef, useEffect } from 'react'
import { useSelected, useSlateStatic, ReactEditor } from 'slate-react'
import { Transforms, Editor as SlateEditor } from 'slate'
import { Trash2, Plus, Blocks } from 'lucide-react'
import { cn, generateCellId } from './lib/utils'
import { SlashMenuContext } from './SlashMenuContext'

const createParagraphNode = () => ({ type: 'paragraph', id: generateCellId(), children: [{ text: '' }] })

import katex from 'katex'
import 'katex/dist/katex.min.css'
import { MathBlock } from './blocks/MathBlock'
import { SketchBlock } from './blocks/SketchBlock'
import { GraphBlock } from './blocks/GraphBlock'
import { ImageBlock } from './blocks/ImageBlock'
import { CodeBlock } from './blocks/CodeBlock'
import { TableBlock } from './blocks/TableBlock'
import { ColumnToolbar } from './ColumnToolbar'
import { DividerToolbar } from './DividerToolbar'

const InlineMath = ({ attributes, element }) => {
    const katexRef = useRef(null)
    const latex = (element.latex ?? '').trim()
    useEffect(() => {
        if (!katexRef.current) return
        try {
            katex.render(latex || ' ', katexRef.current, { displayMode: false, throwOnError: false })
        } catch {
            katexRef.current.textContent = latex || ' '
        }
    }, [latex])
    return (
        <span {...attributes} className="inline-flex align-baseline" contentEditable={false} suppressContentEditableWarning>
            <span ref={katexRef} className="katex-inline" />
        </span>
    )
}

export const Element = ({ attributes, children, element, isPrintPreview = false }) => {
    const editor = useSlateStatic()
    const slashMenu = useContext(SlashMenuContext)
    const align = element.align || 'left'

    const alignmentClasses = {
        left: 'items-start text-left',
        center: 'items-center text-center',
        right: 'items-end text-right',
        justify: 'items-stretch text-justify'
    }[align]

    const path = ReactEditor.findPath(editor, element)

    const onDelete = (e) => {
        e.preventDefault()
        e.stopPropagation()
        Transforms.removeNodes(editor, { at: path })
    }

    const onAddAbove = (e) => {
        e.preventDefault()
        e.stopPropagation()
        Transforms.insertNodes(editor, createParagraphNode(), { at: path })
        Transforms.select(editor, SlateEditor.start(editor, path))
        ReactEditor.focus(editor)
    }

    const onAddBelow = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const nextPath = [...path.slice(0, -1), path[path.length - 1] + 1]
        Transforms.insertNodes(editor, createParagraphNode(), { at: nextPath })
        Transforms.select(editor, SlateEditor.start(editor, nextPath))
        ReactEditor.focus(editor)
    }

    if (element.type === 'inline-math') {
        return <InlineMath attributes={attributes} element={element} />
    }

    let content
    switch (element.type) {
        case 'math':
            content = <MathBlock children={children} element={element} />
            break
        case 'sketch':
            content = <SketchBlock children={children} element={element} isPrintPreview={isPrintPreview} />
            break
        case 'graph':
            content = <GraphBlock children={children} element={element} isPrintPreview={isPrintPreview} />
            break
        case 'image':
            content = <ImageBlock attributes={attributes} children={children} element={element} />
            break
        case 'code':
            content = <CodeBlock children={children} element={element} isPrintPreview={isPrintPreview} />
            break
        case 'table':
            content = <TableBlock attributes={attributes} children={children} element={element} isPrintPreview={isPrintPreview} />
            break
        case 'horizontal_line': {
            const selected = useSelected()
            const lineStyle = element.lineStyle || 'solid'
            const borderClass = lineStyle === 'dashed'
                ? 'border-t-2 border-dashed border-slate-200'
                : lineStyle === 'dotted'
                    ? 'border-t-2 border-dotted border-slate-200'
                    : 'border-t-2 border-solid border-slate-200'
            return (
                <div {...attributes} className="editor-horizontal-line my-2 flex items-center justify-center relative group">
                    {selected && <DividerToolbar element={element} />}
                    <div contentEditable={false} className={cn('w-full', borderClass)} />
                    <div className="hidden">{children}</div>
                    <div
                        contentEditable={false}
                        className="editor-block-actions absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-[5] flex items-center gap-0.5"
                    >
                        <div className="flex flex-col rounded-md overflow-hidden border border-slate-200 bg-slate-100 self-center [&_button]:p-0.5 [&_button]:flex [&_button]:items-center [&_button]:justify-center [&_button]:text-slate-500 [&_button]:hover:text-slate-900 [&_button]:transition-colors">
                            <button onMouseDown={onAddAbove} title="Add block above"><Plus size={12} /></button>
                            <div className="w-full h-px bg-slate-200" />
                            <button onMouseDown={onAddBelow} title="Add block below"><Plus size={12} /></button>
                        </div>
                        <button
                            onMouseDown={onDelete}
                            className="p-1.5 rounded-md border border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                            title="Delete line"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            )
        }
        case 'h1':
            content = <h1 className="text-4xl font-black mb-3 mt-4">{children}</h1>
            break
        case 'h2':
            content = <h2 className="text-3xl font-bold mb-2 mt-3">{children}</h2>
            break
        case 'h3':
            content = <h3 className="text-2xl font-bold mb-2 mt-2">{children}</h3>
            break
        case 'h4':
            content = <h4 className="text-xl font-bold mb-1.5 mt-2">{children}</h4>
            break
        case 'h5':
            content = <h5 className="text-lg font-bold mb-1 mt-1.5">{children}</h5>
            break
        case 'h6':
            content = <h6 className="text-base font-bold mb-1 mt-1.5 uppercase tracking-wide">{children}</h6>
            break
        case 'blockquote':
            content = <blockquote className="border-l-4 border-blue-500/50 pl-4 italic my-4 text-slate-500">{children}</blockquote>
            break
        case 'bulleted-list':
            content = <ul className="list-disc list-outside ml-6 mb-4">{children}</ul>
            break
        case 'numbered-list':
            content = <ol className="list-decimal list-outside ml-6 mb-4">{children}</ol>
            break
        case 'list-item':
            content = <li {...attributes} className="mb-1">{children}</li>
            break
        case 'columns-container': {
            const selected = useSelected()
            return (
                <div {...attributes} className="editor-columns-container my-4 relative group">
                    <div className="flex gap-0 w-full relative">
                        {selected && <ColumnToolbar element={element} />}
                        {children}
                    </div>
                    <div
                        contentEditable={false}
                        className="editor-block-actions absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-[5] flex items-center gap-0.5"
                    >
                        <div className="flex flex-col rounded-md overflow-hidden border border-slate-200 bg-slate-100 self-center [&_button]:p-0.5 [&_button]:flex [&_button]:items-center [&_button]:justify-center [&_button]:text-slate-500 [&_button]:hover:text-slate-900 [&_button]:transition-colors">
                            <button onMouseDown={onAddAbove} title="Add block above"><Plus size={12} /></button>
                            <div className="w-full h-px bg-slate-200" />
                            <button onMouseDown={onAddBelow} title="Add block below"><Plus size={12} /></button>
                        </div>
                        <button
                            onMouseDown={onDelete}
                            className="p-1.5 rounded-md border border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                            title="Delete columns"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            )
        }
        case 'column':
            content = (
                <div {...attributes} className="editor-column flex-1 min-w-0 border-y border-l border-slate-200 last:border-r last:rounded-r-lg first:rounded-l-lg bg-white">
                    <div className="p-3 min-h-[120px]">
                        {children}
                    </div>
                </div>
            )
            break
        default: {
            const isEmpty = element.children.length === 1 &&
                element.children[0]?.text === ''
            content = (
                <p
                    className="leading-relaxed min-h-[1.5em] whitespace-pre-wrap"
                    data-placeholder={isEmpty ? "Type '/' to add a block ..." : undefined}
                >
                    {children}
                </p>
            )
        }
    }

    if (['list-item', 'columns-container', 'column'].includes(element.type)) {
        return content
    }

    const voidBlockTypes = ['sketch', 'math', 'graph', 'horizontal_line', 'code', 'table', 'image']
    const isEmptyBlock = !voidBlockTypes.includes(element.type) &&
        element.children?.length === 1 &&
        element.children[0]?.text === ''
    const isEmptyCodeInPreview = isPrintPreview && element.type === 'code' && (!element.codeContent || String(element.codeContent).trim() === '')
    const isEmptySketchInPreview = isPrintPreview && element.type === 'sketch' && (!element.sketchData?.elements?.length)
    const hiddenInPrintPreview = isEmptyCodeInPreview || isEmptySketchInPreview
    return (
        <div {...attributes} className={cn(
            "editor-block-cell py-1.5 px-3 my-2 rounded-lg border border-slate-100 bg-slate-100/30 transition-all hover:bg-slate-100/50 flex flex-col justify-center relative group/cell",
            isEmptyBlock && "editor-block-empty",
            hiddenInPrintPreview && "hidden",
            alignmentClasses
        )}>
            <div className="w-full relative">
                {content}
            </div>

            <div
                contentEditable={false}
                className={cn(
                    "editor-block-actions absolute right-2 opacity-0 group-hover/cell:opacity-100 transition-opacity z-20 flex items-center gap-1",
                    ['image', 'columns-container', 'table', 'code', 'sketch', 'graph'].includes(element.type) ? "top-2" : "top-1/2 -translate-y-1/2"
                )}
            >
                <div className="flex flex-col rounded-md overflow-hidden border border-slate-200 bg-slate-100 self-center [&_button]:p-0.5 [&_button]:flex [&_button]:items-center [&_button]:justify-center [&_button]:text-slate-500 [&_button]:hover:text-slate-900 [&_button]:transition-colors">
                    <button onMouseDown={onAddAbove} title="Add block above"><Plus size={12} /></button>
                    <div className="w-full h-px bg-slate-200" />
                    <button onMouseDown={onAddBelow} title="Add block below"><Plus size={12} /></button>
                </div>
                {isEmptyBlock && slashMenu?.openSlashMenu && (
                    <button
                        type="button"
                        onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            Transforms.select(editor, SlateEditor.start(editor, path))
                            ReactEditor.focus(editor)
                            const rect = e.currentTarget.getBoundingClientRect()
                            slashMenu.openSlashMenu({ top: rect.top, left: rect.left })
                        }}
                        className="p-1.5 rounded-md border border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                        title="Insert Block"
                    >
                        <Blocks size={14} />
                    </button>
                )}
                <button
                    onMouseDown={onDelete}
                    className="p-1.5 rounded-md border border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                    title="Delete block"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    )
}
