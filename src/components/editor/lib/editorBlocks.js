/**
 * Shared block registry for the editor: createNode helpers and default block menu.
 * Used by Editor.jsx and by B2B CrapEditorProvider for extensibility.
 */
import { Sigma, LineChart, Palette, Columns2, Minus, Image, Code, Table2 } from 'lucide-react'
import { generateCellId } from './utils'

export const createParagraphNode = () => ({ type: 'paragraph', id: generateCellId(), children: [{ text: '' }] })
export const createImageNode = () => ({ type: 'image', id: generateCellId(), children: [{ text: '' }] })

/**
 * Create a block node by type (id from slash menu or block registry).
 * @param {string} type - e.g. 'code', 'table', 'image', 'horizontal_line_solid', 'math', 'sketch', 'graph', 'columns'
 */
export function createBlockNode(type) {
  const id = generateCellId()
  const emptyChild = [{ text: '' }]
  if (type === 'code') return { type: 'code', id, codeContent: '', children: emptyChild }
  if (type === 'table') {
    const rows = 2
    const cols = 2
    return {
      type: 'table',
      id,
      rows,
      cols,
      hasHeader: false,
      headerCells: [],
      cells: Array.from({ length: rows }, () => Array(cols).fill('')),
      children: emptyChild,
    }
  }
  if (type === 'image') return createImageNode()
  if (typeof type === 'string' && type.startsWith('horizontal_line_')) {
    return { type: 'horizontal_line', lineStyle: type.replace('horizontal_line_', ''), id, children: emptyChild }
  }
  if (type === 'math') return { type: 'math', id, latex: '', children: emptyChild }
  if (type === 'sketch') return { type: 'sketch', id, sketchData: { elements: [], appState: {}, files: {} }, children: emptyChild }
  if (type === 'graph') return { type: 'graph', id, expression: '', latex: '', children: emptyChild }
  return { type, id, children: emptyChild }
}

/** Default slash menu items for B2B: id, label, icon, description. createNode is derived via createBlockNode(id). */
export const DEFAULT_BLOCK_MENU_ITEMS = [
  { id: 'math', label: 'Math Equation', icon: Sigma, description: 'Insert a LaTeX math block' },
  { id: 'graph', label: 'Function Graph', icon: LineChart, description: 'Plot mathematical functions' },
  { id: 'sketch', label: 'Sketchbook', icon: Palette, description: 'Drawing and sketching canvas' },
  { id: 'code', label: 'Code block', icon: Code, description: 'Code with syntax highlighting' },
  { id: 'table', label: 'Table', icon: Table2, description: 'Rows and columns grid' },
  { id: 'image', label: 'Image', icon: Image, description: 'Upload an image' },
  { id: 'columns', label: 'Columns', icon: Columns2, description: 'Side-by-side content' },
  { id: 'horizontal_line_solid', label: 'Divider', icon: Minus, description: 'Horizontal divider' },
]
