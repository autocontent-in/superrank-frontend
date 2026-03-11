import { ReactEditor, useSlateStatic } from 'slate-react'
import { Transforms } from 'slate'
import { Rows3, Columns3, Heading } from 'lucide-react'
import { cn } from './lib/utils'

function ensureCells(cells, rows, cols) {
    return Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (cells[r] && typeof cells[r][c] === 'string' ? cells[r][c] : ''))
    )
}

function ensureHeaderCells(headerCells, cols) {
    if (!Array.isArray(headerCells)) return Array(cols).fill('')
    return Array.from({ length: cols }, (_, c) => (headerCells[c] != null ? String(headerCells[c]) : ''))
}

const ROW_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20]
const COL_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10]

export const TableToolbar = ({ element }) => {
    const editor = useSlateStatic()
    const path = ReactEditor.findPath(editor, element)

    const rows = Math.max(1, Math.min(20, Number(element.rows) || 2))
    const cols = Math.max(1, Math.min(10, Number(element.cols) || 2))
    const hasHeader = !!element.hasHeader
    const headerCells = ensureHeaderCells(element.headerCells, cols)
    const cells = ensureCells(element.cells || [], rows, cols)

    const setRows = (newRows) => {
        const nextCells = ensureCells(cells, newRows, cols)
        Transforms.setNodes(editor, { rows: newRows, cells: nextCells }, { at: path })
    }

    const setCols = (newCols) => {
        const nextCells = ensureCells(cells, rows, newCols)
        const nextHeader = ensureHeaderCells(headerCells, newCols)
        Transforms.setNodes(editor, { cols: newCols, cells: nextCells, headerCells: nextHeader }, { at: path })
    }

    const setHasHeader = (value) => {
        const nextHeader = value ? ensureHeaderCells(headerCells, cols) : []
        Transforms.setNodes(editor, { hasHeader: value, headerCells: nextHeader }, { at: path })
    }

    return (
        <div
            contentEditable={false}
            className="editor-table-toolbar absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-10"
        >
            <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1.5">
                <Rows3 size={14} className="text-slate-500 shrink-0" />
                <select
                    value={rows}
                    onChange={(e) => setRows(Number(e.target.value))}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="text-xs font-medium text-slate-900 bg-transparent border-0 py-0.5 pr-1 cursor-pointer outline-none focus:ring-0"
                >
                    {ROW_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                            {n} row{n !== 1 ? 's' : ''}
                        </option>
                    ))}
                </select>
            </div>
            <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1.5">
                <Columns3 size={14} className="text-slate-500 shrink-0" />
                <select
                    value={cols}
                    onChange={(e) => setCols(Number(e.target.value))}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="text-xs font-medium text-slate-900 bg-transparent border-0 py-0.5 pr-1 cursor-pointer outline-none focus:ring-0"
                >
                    {COL_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                            {n} col{n !== 1 ? 's' : ''}
                        </option>
                    ))}
                </select>
            </div>
            <button
                type="button"
                onMouseDown={(e) => {
                    e.preventDefault()
                    setHasHeader(!hasHeader)
                }}
                className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                    hasHeader ? 'bg-blue-100/50 text-blue-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                )}
                title={hasHeader ? 'Hide header row' : 'Show header row'}
            >
                <Heading size={14} />
                Header
            </button>
        </div>
    )
}
