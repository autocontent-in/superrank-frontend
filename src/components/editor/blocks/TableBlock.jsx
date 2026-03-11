import { useSelected, useSlateStatic } from 'slate-react'
import { Transforms } from 'slate'
import { ReactEditor } from 'slate-react'
import { useRef, useEffect, useCallback } from 'react'
import { TableToolbar } from '../TableToolbar'
import { cn } from '../lib/utils'

const MIN_CELL_HEIGHT = 20
const MIN_COL_WIDTH = 10
const DEFAULT_COL_WIDTH = 120

function resizeTextarea(el) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(MIN_CELL_HEIGHT, el.scrollHeight)}px`
}

function ensureCells(cells, rows, cols) {
    const out = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
            if (cells[r] && typeof cells[r][c] === 'string') return cells[r][c]
            return ''
        })
    )
    return out
}

function ensureHeaderCells(headerCells, cols) {
    if (!Array.isArray(headerCells)) return Array(cols).fill('')
    return Array.from({ length: cols }, (_, c) => (headerCells[c] != null ? String(headerCells[c]) : ''))
}

function ensureColumnWidths(columnWidths, cols) {
    if (!Array.isArray(columnWidths) || columnWidths.length !== cols) {
        return Array(cols).fill(DEFAULT_COL_WIDTH)
    }
    return columnWidths.map((w) => Math.max(MIN_COL_WIDTH, Math.min(800, Number(w) || DEFAULT_COL_WIDTH)))
}

export const TableBlock = ({ attributes, children, element, isPrintPreview = false }) => {
    const editor = useSlateStatic()
    const selected = useSelected()
    const path = ReactEditor.findPath(editor, element)

    const rows = Math.max(1, Math.min(20, Number(element.rows) || 2))
    const cols = Math.max(1, Math.min(10, Number(element.cols) || 2))
    const hasHeader = !!element.hasHeader
    const headerCells = ensureHeaderCells(element.headerCells, cols)
    const cells = ensureCells(element.cells || [], rows, cols)
    const columnWidths = ensureColumnWidths(element.columnWidths, cols)

    const updateTable = useCallback(
        (updates) => {
            Transforms.setNodes(editor, updates, { at: path })
        },
        [editor, path]
    )

    const setHeaderCell = useCallback(
        (colIndex, value) => {
            const next = [...headerCells]
            next[colIndex] = value
            updateTable({ headerCells: next })
        },
        [headerCells, updateTable]
    )

    const setCell = useCallback(
        (rowIndex, colIndex, value) => {
            const next = cells.map((row, r) => (r === rowIndex ? [...row] : row))
            if (!next[rowIndex]) next[rowIndex] = Array(cols).fill('')
            next[rowIndex][colIndex] = value
            updateTable({ cells: next })
        },
        [cells, cols, updateTable]
    )

    const setColumnWidths = useCallback(
        (newWidths) => {
            updateTable({ columnWidths: newWidths })
        },
        [updateTable]
    )

    const resizeRef = useRef({ startX: 0, startWidths: [], colIndex: -1 })

    const handleResizeStart = useCallback(
        (colIndex, e) => {
            e.preventDefault()
            e.stopPropagation()
            resizeRef.current = { startX: e.clientX, startWidths: [...columnWidths], colIndex }
            const onMove = (moveEvent) => {
                const delta = moveEvent.clientX - resizeRef.current.startX
                const next = [...resizeRef.current.startWidths]
                const idx = resizeRef.current.colIndex
                next[idx] = Math.max(MIN_COL_WIDTH, next[idx] + delta)
                setColumnWidths(next)
            }
            const onUp = () => {
                document.removeEventListener('mousemove', onMove)
                document.removeEventListener('mouseup', onUp)
                document.body.style.cursor = ''
                document.body.style.userSelect = ''
            }
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'
            document.addEventListener('mousemove', onMove)
            document.addEventListener('mouseup', onUp)
        },
        [columnWidths, setColumnWidths]
    )

    const stopPropagation = (e) => {
        e.stopPropagation()
        if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation()
    }

    const containerRef = useRef(null)
    const cellRefsRef = useRef({})

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const stopNative = (e) => {
            e.stopPropagation()
            e.stopImmediatePropagation()
        }
        el.addEventListener('keydown', stopNative, { capture: true })
        el.addEventListener('keyup', stopNative, { capture: true })
        return () => {
            el.removeEventListener('keydown', stopNative, { capture: true })
            el.removeEventListener('keyup', stopNative, { capture: true })
        }
    }, [])

    useEffect(() => {
        Object.values(cellRefsRef.current).forEach(resizeTextarea)
    }, [cells, headerCells])

    const handleCellRef = (isHeader, r, c) => (el) => {
        const key = isHeader ? `h-${c}` : `${r}-${c}`
        if (el) {
            cellRefsRef.current[key] = el
            resizeTextarea(el)
        } else {
            delete cellRefsRef.current[key]
        }
    }

    const handleCellInput = (e) => {
        resizeTextarea(e.target)
    }

    return (
        <div
            ref={containerRef}
            {...attributes}
            className="editor-table-block relative group"
            contentEditable={false}
        >
            {selected && !isPrintPreview && <TableToolbar element={element} />}
            <div
                className={cn(
                    'overflow-x-auto bg-white',
                    isPrintPreview ? 'border border-gray-400 print:border-gray-400' : 'border border-gray-200'
                )}
            >
                <table
                    className={cn(
                        'border-separate border-spacing-0 text-sm',
                        isPrintPreview && 'table-fixed w-full',
                        !isPrintPreview && 'table-fixed'
                    )}
                    style={
                        !isPrintPreview
                            ? { width: columnWidths.reduce((a, b) => a + b, 0), minWidth: '100%' }
                            : undefined
                    }
                >
                    <colgroup>
                        {columnWidths.map((w, c) => (
                            <col key={c} style={{ width: isPrintPreview ? `${(w / columnWidths.reduce((a, b) => a + b, 0)) * 100}%` : `${w}px` }} />
                        ))}
                    </colgroup>
                    {hasHeader && (
                        <thead>
                            <tr>
                                {headerCells.map((text, c) => (
                                    <th
                                        key={c}
                                        className={cn(
                                            'relative px-3 py-2 text-left font-semibold text-gray-800 align-top border border-gray-200 bg-gray-100',
                                            isPrintPreview && 'border-gray-400! print:border-gray-400! min-w-0 overflow-hidden'
                                        )}
                                    >
                                        {isPrintPreview ? (
                                            <span className="block py-1 wrap-break-words">{text || `Header ${c + 1}`}</span>
                                        ) : (
                                            <>
                                                <textarea
                                                    ref={handleCellRef(true, 0, c)}
                                                    value={text}
                                                    onChange={(e) => setHeaderCell(c, e.target.value)}
                                                    onInput={handleCellInput}
                                                    onMouseDown={stopPropagation}
                                                    onClick={stopPropagation}
                                                    rows={1}
                                                    className="w-full min-w-[80px] min-h-[28px] bg-transparent outline-none resize-none overflow-hidden py-0 pr-4"
                                                    style={{ minHeight: MIN_CELL_HEIGHT }}
                                                    placeholder={`Header ${c + 1}`}
                                                />
                                                {c < cols - 1 ? (
                                                    <div
                                                        role="separator"
                                                        aria-orientation="vertical"
                                                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-200 active:bg-blue-300 z-10"
                                                        style={{ marginRight: '-3px' }}
                                                        onMouseDown={(e) => handleResizeStart(c, e)}
                                                    />
                                                ) : (
                                                    <div
                                                        role="separator"
                                                        aria-orientation="vertical"
                                                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-200 active:bg-blue-300 z-10"
                                                        onMouseDown={(e) => handleResizeStart(c, e)}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                    )}
                    <tbody>
                        {cells.map((row, r) => (
                            <tr key={r}>
                                {row.map((text, c) => (
                                    <td
                                        key={c}
                                        className={cn(
                                            'relative px-3 py-2 text-gray-700 align-top border border-gray-200',
                                            isPrintPreview && 'border-gray-400! print:border-gray-400! min-w-0 overflow-hidden',
                                            !hasHeader && r === 0 && !isPrintPreview && 'bg-gray-50/50'
                                        )}
                                    >
                                        {isPrintPreview ? (
                                            <span className="block py-1 break-words">{text}</span>
                                        ) : (
                                            <>
                                                <textarea
                                                    ref={handleCellRef(false, r, c)}
                                                    value={text}
                                                    onChange={(e) => setCell(r, c, e.target.value)}
                                                    onInput={handleCellInput}
                                                    onMouseDown={stopPropagation}
                                                    onClick={stopPropagation}
                                                    rows={1}
                                                    className={cn(
                                                        'w-full min-w-[80px] min-h-[28px] bg-transparent outline-none resize-none overflow-hidden py-0',
                                                        !hasHeader && r === 0 && 'pr-4'
                                                    )}
                                                    style={{ minHeight: MIN_CELL_HEIGHT }}
                                                    placeholder=""
                                                />
                                                {!hasHeader && r === 0 && (
                                                    <div
                                                        role="separator"
                                                        aria-orientation="vertical"
                                                        className={cn(
                                                            'absolute right-0 top-0 bottom-0 cursor-col-resize hover:bg-blue-200 active:bg-blue-300 z-10',
                                                            c < cols - 1 ? 'w-1.5' : 'w-2'
                                                        )}
                                                        style={c < cols - 1 ? { marginRight: '-3px' } : undefined}
                                                        onMouseDown={(e) => handleResizeStart(c, e)}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="hidden">{children}</div>
        </div>
    )
}
