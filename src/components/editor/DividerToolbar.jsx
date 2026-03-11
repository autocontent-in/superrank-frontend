import { ReactEditor, useSlateStatic } from 'slate-react'
import { Transforms } from 'slate'
import { cn } from './lib/utils'

const STYLES = [
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'dotted', label: 'Dotted' },
]

export const DividerToolbar = ({ element }) => {
    const editor = useSlateStatic()
    const path = ReactEditor.findPath(editor, element)
    const currentStyle = element.lineStyle || 'solid'

    return (
        <div
            contentEditable={false}
            className="editor-divider-toolbar absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 p-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-10"
        >
            {STYLES.map(({ value, label }) => (
                <button
                    key={value}
                    onMouseDown={(e) => {
                        e.preventDefault()
                        Transforms.setNodes(editor, { lineStyle: value }, { at: path })
                    }}
                    className={cn(
                        "px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                        currentStyle === value
                            ? "bg-blue-100/50 text-blue-700"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    )
}
