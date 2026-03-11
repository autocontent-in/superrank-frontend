import { ReactEditor, useSlateStatic } from 'slate-react'
import { Transforms } from 'slate'
import { Columns2, Columns3, Columns4 } from 'lucide-react'
import { cn } from './lib/utils'

export const ColumnToolbar = ({ element }) => {
    const editor = useSlateStatic()
    const path = ReactEditor.findPath(editor, element)
    const currentColumnCount = element.children.length

    const setColumns = (count) => {
        if (count === currentColumnCount) return

        if (count > currentColumnCount) {
            const diff = count - currentColumnCount
            for (let i = 0; i < diff; i++) {
                Transforms.insertNodes(
                    editor,
                    {
                        type: 'column',
                        children: [{ type: 'paragraph', children: [{ text: '' }] }]
                    },
                    { at: [...path, currentColumnCount + i] }
                )
            }
        } else {
            const diff = currentColumnCount - count
            for (let i = 0; i < diff; i++) {
                Transforms.removeNodes(editor, { at: [...path, currentColumnCount - 1 - i] })
            }
        }
    }

    return (
        <div
            contentEditable={false}
            className="editor-column-toolbar absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 p-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-10"
        >
            <button
                onMouseDown={(e) => {
                    e.preventDefault()
                    setColumns(2)
                }}
                className={cn(
                    "p-2 rounded-md transition-all",
                    currentColumnCount === 2
                        ? "bg-blue-100/50 text-blue-700"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
                title="2 Columns"
            >
                <Columns2 size={16} />
            </button>
            <button
                onMouseDown={(e) => {
                    e.preventDefault()
                    setColumns(3)
                }}
                className={cn(
                    "p-2 rounded-md transition-all",
                    currentColumnCount === 3
                        ? "bg-blue-100/50 text-blue-700"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
                title="3 Columns"
            >
                <Columns3 size={16} />
            </button>
            <button
                onMouseDown={(e) => {
                    e.preventDefault()
                    setColumns(4)
                }}
                className={cn(
                    "p-2 rounded-md transition-all",
                    currentColumnCount === 4
                        ? "bg-blue-100/50 text-blue-700"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
                title="4 Columns"
            >
                <Columns4 size={16} />
            </button>
        </div>
    )
}
