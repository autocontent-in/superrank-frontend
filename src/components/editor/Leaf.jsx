import { useContext } from 'react'
import { cn } from './lib/utils'
import { PrintPreviewContext } from './PrintPreviewContext'

export const Leaf = ({ attributes, children, leaf }) => {
    const printPreview = useContext(PrintPreviewContext)
    const hideHighlighter = printPreview?.hideHighlighter === true
    if (leaf.bold) {
        children = <strong>{children}</strong>
    }

    if (leaf.italic) {
        children = <em>{children}</em>
    }

    if (leaf.underline) {
        children = <u>{children}</u>
    }

    if (leaf.strikethrough) {
        children = <del>{children}</del>
    }

    if (leaf.code) {
        children = <code className="px-1.5 py-0.5 rounded-md bg-blue-100/60 font-mono text-sm border border-slate-200 text-slate-900">{children}</code>
    }

    const style = {}
    if (leaf.fontSize) {
        style.fontSize = leaf.fontSize
    }
    if (leaf.highlight && !hideHighlighter) {
        style.backgroundColor = typeof leaf.highlight === 'string' ? leaf.highlight : '#fef08a'
    }

    return (
        <span {...attributes} style={style} className={cn(attributes?.className, leaf.highlight && !hideHighlighter && 'editor-text-highlight')}>
            {children}
        </span>
    )
}
