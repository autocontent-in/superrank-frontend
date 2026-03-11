/**
 * Document serialization for the Slate editor (no localStorage).
 *
 * Public API (4 functions):
 * - editorBlockContentToRaw(value, images) → { content, images } for save/export (JSON).
 * - rawToEditorBlockContent(raw) → { value, images } for load/import.
 * - editorBlockContentToHTML(value, images, opts?) → string for HTML export.
 * - editorBlockContentToMarkdown(value, images, opts?) → string for markdown export.
 * - editorBlockContentToMarkdownAiOptimized(value, images, opts?) → compact markdown for LLM context.
 *
 * Raw format = { content: array of root nodes, images: [{ cellId, name, url? }] }.
 * TEXT FORMATTING (bold, italic, etc.) is stored on text nodes inside block children.
 */

import { generateCellId } from './utils'

const DEFAULT_VALUE = [
    { type: 'paragraph', id: generateCellId(), children: [{ text: '' }] },
]

function isTextNode(node) {
    return node !== null && typeof node === 'object' && 'text' in node && Array.isArray(node) === false
}

function isElementNode(node) {
    return (
        node !== null &&
        typeof node === 'object' &&
        Array.isArray(node) === false &&
        typeof node.type === 'string' &&
        Array.isArray(node.children)
    )
}

/** Recursively validate and sanitize a node so it won't crash the editor. */
function sanitizeNode(node) {
    if (isTextNode(node)) {
        const out = { text: typeof node.text === 'string' ? node.text : '' }
        if (node.bold === true) out.bold = true
        if (node.italic === true) out.italic = true
        if (node.underline === true) out.underline = true
        if (node.strikethrough === true) out.strikethrough = true
        if (node.code === true) out.code = true
        if (node.fontSize != null) out.fontSize = node.fontSize
        if (node.highlight === true) out.highlight = true
        if (typeof node.highlight === 'string' && node.highlight) out.highlight = node.highlight
        return out
    }
    if (isElementNode(node)) {
        let children = node.children.map(sanitizeNode).filter(Boolean)
        if (children.length === 0) children = [{ text: '' }]
        const out = { type: node.type, children }
        if (typeof node.id === 'string' && node.id.length > 0) out.id = node.id
        if (node.align != null) out.align = node.align
        if (node.latex != null) out.latex = node.latex
        if (node.expression != null) out.expression = node.expression
        if (node.sketchData != null) out.sketchData = node.sketchData
        if (node.codeContent != null) out.codeContent = typeof node.codeContent === 'string' ? node.codeContent : ''
        if (node.lineStyle != null) out.lineStyle = node.lineStyle
        if (node.type === 'image') {
            if (node.imageFit != null) out.imageFit = node.imageFit
            if (node.imageObjectPosition != null) out.imageObjectPosition = node.imageObjectPosition
        }
        if (node.type === 'table') {
            const rows = Math.max(1, Math.min(20, Number(node.rows) || 2))
            const cols = Math.max(1, Math.min(10, Number(node.cols) || 2))
            out.rows = rows
            out.cols = cols
            out.hasHeader = !!node.hasHeader
            out.headerCells = Array.isArray(node.headerCells)
                ? node.headerCells.slice(0, cols).map((c) => (c != null ? String(c) : ''))
                : Array(cols).fill('')
            if (out.headerCells.length < cols) out.headerCells = [...out.headerCells, ...Array(cols - out.headerCells.length).fill('')]
            const cells = Array.isArray(node.cells) ? node.cells : []
            out.cells = Array.from({ length: rows }, (_, r) =>
                Array.from({ length: cols }, (_, c) => (cells[r] && typeof cells[r][c] === 'string' ? cells[r][c] : ''))
            )
            if (Array.isArray(node.columnWidths) && node.columnWidths.length === cols) {
                out.columnWidths = node.columnWidths.map((w) => Math.max(60, Math.min(800, Number(w) || 120)))
            }
        }
        return out
    }
    return null
}

/** Validate that value is a non-empty array of elements; return sanitized value or null. */
function validateContent(value) {
    if (!Array.isArray(value) || value.length === 0) return null
    const sanitized = value.map(sanitizeNode).filter(Boolean)
    if (sanitized.length === 0) return null
    return sanitized
}

/** Recursively collect all block ids present in the document (so we can drop orphaned images). */
function collectBlockIds(nodes) {
    const ids = new Set()
    if (!Array.isArray(nodes)) return ids
    for (const node of nodes) {
        if (node && typeof node === 'object' && !Array.isArray(node) && typeof node.id === 'string') ids.add(node.id)
        if (node?.children) collectBlockIds(node.children).forEach(id => ids.add(id))
    }
    return ids
}

/**
 * Convert current document (Slate value) to raw data.
 * Use the result for saving (e.g. JSON.stringify and send to API or store in DB).
 *
 * @param {Array} value - Slate document value (e.g. editor.children or state value)
 * @returns {Array} Raw document data (plain objects, safe to serialize)
 */
function documentToRaw(value) {
    if (value == null) return JSON.parse(JSON.stringify(DEFAULT_VALUE))
    const sanitized = validateContent(value)
    return sanitized ?? JSON.parse(JSON.stringify(DEFAULT_VALUE))
}

function ensureNodeId(node) {
    if (isTextNode(node)) return node
    if (isElementNode(node)) {
        const children = node.children.map(ensureNodeId)
        const id = typeof node.id === 'string' && node.id.length > 0 ? node.id : generateCellId()
        return { ...node, children, id }
    }
    return node
}

/** Recursively ensure every element node has an id (for loading legacy docs). */
function ensureCellIds(nodes) {
    if (!Array.isArray(nodes)) return nodes
    return nodes.map(ensureNodeId)
}

/**
 * Convert raw data back into a document value for the editor.
 * Use the result as initialValue or to replace editor content.
 * Ensures every block has a cell id (generates one if missing).
 *
 * @param {Array|string|object} raw - Raw data: array of nodes, JSON string, or { content } payload
 * @returns {Array} Slate document value (ready to render in the editor)
 */
function rawToDocument(raw) {
    if (raw == null) return JSON.parse(JSON.stringify(DEFAULT_VALUE))
    let data = raw
    if (typeof raw === 'string') {
        try {
            data = JSON.parse(raw)
        } catch {
            return JSON.parse(JSON.stringify(DEFAULT_VALUE))
        }
    }
    const content = Array.isArray(data) ? data : data?.content ?? null
    const value = validateContent(content)
    const withIds = value ? ensureCellIds(JSON.parse(JSON.stringify(value))) : null
    return withIds ?? JSON.parse(JSON.stringify(DEFAULT_VALUE))
}

/**
 * Serialize document and images for saving (e.g. to backend or JSON).
 * Persists cellId, name, real_name, source — never base64 src or transient url.
 * @param {Array} value - Slate document value
 * @param {Array} images - Array of { cellId, name, real_name?, source?, url?, src? }
 * @returns {{ content: Array, images: Array }}
 */
export function editorBlockContentToRaw(value, images) {
    const content = documentToRaw(value)
    const blockIds = collectBlockIds(content)
    const imagesFiltered = Array.isArray(images)
        ? images
            .filter(img => blockIds.has(img.cellId))
            .map(img => {
                const out = { cellId: img.cellId, name: img.name }
                if (img.real_name != null && img.real_name !== '') out.real_name = img.real_name
                if (img.source != null && img.source !== '') out.source = img.source
                if (img.source == null && img.url != null && img.url !== '') out.url = img.url
                return out
            })
        : []
    return { content, images: imagesFiltered }
}

/**
 * Parse raw payload (from API or pasted JSON) into document value and images.
 * @param {Array|string|object} raw - { content, images } or content array or JSON string
 * @returns {{ value: Array, images: Array }}
 */
export function rawToEditorBlockContent(raw) {
    if (raw == null) return { value: rawToDocument(null), images: [] }
    let data = raw
    if (typeof raw === 'string') {
        try {
            data = JSON.parse(raw)
        } catch {
            return { value: rawToDocument(null), images: [] }
        }
    }
    const content = Array.isArray(data) ? data : data?.content ?? null
    const value = rawToDocument(content ?? data)
    const images = Array.isArray(data?.images) ? data.images : []
    return { value, images }
}

// --- Markdown export (same data as editorBlockContentToRaw, human-readable) ---

function textChildrenToMarkdown(children) {
    if (!Array.isArray(children)) return ''
    return children.map((node) => {
        if (isTextNode(node)) {
            let s = String(node.text ?? '')
            if (node.code) s = '`' + s.replace(/`/g, '\\`') + '`'
            else {
                if (node.bold) s = '**' + s + '**'
                if (node.italic) s = '*' + s + '*'
                if (node.strikethrough) s = '~~' + s + '~~'
                if (node.underline) s = '<u>' + s + '</u>'
            }
            return s
        }
        if (isElementNode(node) && node.type === 'inline-math') {
            const latex = typeof node.latex === 'string' ? node.latex.trim() : ''
            return '$' + latex + '$'
        }
        return ''
    }).join('')
}

function escapeTableCell(s) {
    return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

/** Strip markdown heading prefix (# to ######) and return content as bold for table cells. */
function headingCellToBold(s) {
    const t = String(s).trim()
    const match = t.match(/^#+\s+(.*)$/s)
    if (match) return '**' + match[1].trim() + '**'
    return t
}

/** Convert a block node to a single-line string for use in a table cell (headings become bold without #'s). */
function blockToTableCellContent(node, imagesByCellId, options) {
    const raw = nodeToMarkdown(node, imagesByCellId, options)
    const oneLine = raw.trim().replace(/\n+/g, ' ')
    const normalized = headingCellToBold(oneLine)
    return escapeTableCell(normalized)
}

function nodeToMarkdown(node, imagesByCellId, options = { listPrefix: '' }) {
    if (!node || !isElementNode(node)) return ''

    switch (node.type) {
        case 'paragraph': {
            const prefix = options.listPrefix ?? ''
            const text = prefix + textChildrenToMarkdown(node.children) || ''
            return text + '\n'
        }
        case 'h1':
            return '# ' + textChildrenToMarkdown(node.children) + '\n'
        case 'h2':
            return '## ' + textChildrenToMarkdown(node.children) + '\n'
        case 'h3':
            return '### ' + textChildrenToMarkdown(node.children) + '\n'
        case 'h4':
            return '#### ' + textChildrenToMarkdown(node.children) + '\n'
        case 'h5':
            return '##### ' + textChildrenToMarkdown(node.children) + '\n'
        case 'h6':
            return '###### ' + textChildrenToMarkdown(node.children) + '\n'
        case 'blockquote':
            return '> ' + textChildrenToMarkdown(node.children).replace(/\n/g, '\n> ') + '\n'
        case 'horizontal_line':
            return '---\n'
        case 'code': {
            const content = typeof node.codeContent === 'string' ? node.codeContent : ''
            return '```\n' + content + '\n```\n'
        }
        case 'math': {
            const latex = typeof node.latex === 'string' ? node.latex.trim() : ''
            if (!latex) return '\n'
            return (latex.includes('\n') ? '\n$$\n' + latex + '\n$$\n' : '\n$' + latex + '$\n')
        }
        case 'image': {
            if (options.includeImages === false) {
                const placeholder = options.imagePlaceholder ?? `**>>>> Image here: ${(imagesByCellId[node.id]?.real_name || imagesByCellId[node.id]?.name || 'image')} <<<<**`
                return placeholder + '\n'
            }
            const img = imagesByCellId[node.id]
            const baseUrl = options.baseUrl || ''
            const url = img?.url || (img?.source && baseUrl ? baseUrl + img.source : null) || img?.src || ''
            const alt = img?.real_name || img?.name || 'image'
            return `![${alt}](${url || '#'})\n`
        }
        case 'table': {
            const rows = Math.max(1, Number(node.rows) || 2)
            const cols = Math.max(1, Number(node.cols) || 2)
            const hasHeader = !!node.hasHeader
            const headerCells = Array.isArray(node.headerCells) ? node.headerCells.slice(0, cols) : []
            const cells = Array.isArray(node.cells) ? node.cells : []
            const lines = []
            if (hasHeader && headerCells.length > 0) {
                lines.push('| ' + headerCells.map(escapeTableCell).join(' | ') + ' |')
                lines.push('| ' + Array(cols).fill('---').join(' | ') + ' |')
            }
            for (let r = 0; r < rows; r++) {
                const row = cells[r] || []
                const vals = Array.from({ length: cols }, (_, c) => escapeTableCell(row[c] ?? ''))
                lines.push('| ' + vals.join(' | ') + ' |')
            }
            return lines.join('\n') + '\n'
        }
        case 'graph':
            return '\n*[Graph: ' + (node.expression || '') + ']*\n'
        case 'sketch':
            return '\n*[Sketch]*\n'
        case 'list-item': {
            const inner = (node.children || []).map((child) => nodeToMarkdown(child, imagesByCellId, { ...options })).join('').trim()
            return inner + '\n'
        }
        case 'bulleted-list': {
            const prefix = (options.listPrefix || '') + '- '
            return (node.children || []).map((child) => nodeToMarkdown(child, imagesByCellId, { ...options, listPrefix: prefix })).join('')
        }
        case 'numbered-list': {
            return (node.children || []).map((child, i) => nodeToMarkdown(child, imagesByCellId, { ...options, listPrefix: (options.listPrefix || '') + (i + 1) + '. ' })).join('')
        }
        case 'columns-container': {
            const columns = (node.children || []).filter((col) => isElementNode(col) && col.type === 'column')
            if (columns.length === 0) return '\n'
            const columnCells = columns.map((col) =>
                (col.children || []).map((block) => blockToTableCellContent(block, imagesByCellId, options))
            )
            const numRows = Math.max(1, ...columnCells.map((cells) => cells.length))
            const headerRow = columnCells.map((cells) => cells[0] ?? '')
            const lines = [
                '| ' + headerRow.join(' | ') + ' |',
                '| ' + Array(columns.length).fill('---').join(' | ') + ' |',
            ]
            for (let r = 1; r < numRows; r++) {
                const dataRow = columnCells.map((cells) => cells[r] ?? '')
                lines.push('| ' + dataRow.join(' | ') + ' |')
            }
            return lines.join('\n') + '\n'
        }
        case 'column':
            return (node.children || []).map((n) => nodeToMarkdown(n, imagesByCellId, options)).join('\n')
        default:
            return (options.listPrefix ?? '') + textChildrenToMarkdown(node.children) + '\n'
    }
}

/**
 * Convert document and images to markdown (same data as editorBlockContentToRaw, human-readable).
 * @param {Array} value - Slate document value
 * @param {Array} images - Array of { cellId, name, real_name?, source?, url?, src? }
 * @param {{ includeImages?: boolean, baseUrl?: string, imagePlaceholder?: string }} opts - baseUrl: prepend to source for full image URLs; imagePlaceholder: when includeImages is false, use this instead of image URLs
 * @returns {string} Markdown string
 */
export function editorBlockContentToMarkdown(value, images, opts = {}) {
    const includeImages = opts.includeImages !== false
    const content = Array.isArray(value) ? value : []
    const imagesByCellId = {}
    if (Array.isArray(images)) {
        for (const img of images) {
            if (img && typeof img.cellId === 'string') imagesByCellId[img.cellId] = img
        }
    }
    const out = content.map((node) => nodeToMarkdown(node, imagesByCellId, { includeImages, baseUrl: opts.baseUrl, imagePlaceholder: opts.imagePlaceholder })).join('\n')
    return out.trim() ? out.trim() + '\n' : ''
}

/**
 * Compact markdown for LLM consumption: reduce blank lines and whitespace to save tokens.
 * Preserves content and meaning; only removes redundant formatting.
 */
function compactMarkdownForAI(markdown) {
    if (!markdown || typeof markdown !== 'string') return ''
    // Collapse 3+ consecutive newlines to 2 (removes excess blank lines; keeps paragraph boundaries)
    let out = markdown.replace(/\n{3,}/g, '\n\n')
    // Trim trailing whitespace on each line (invisible to rendering, saves tokens)
    out = out.split('\n').map((line) => line.trimEnd()).join('\n')
    out = out.trim()
    return out ? out + '\n' : ''
}

/**
 * Same as editorBlockContentToMarkdown but optimized for AI/LLM: removes excess blank lines,
 * trims trailing whitespace, normalizes multiple spaces. Reduces token count without changing meaning.
 * @param {Array} value - Slate document value
 * @param {Array} images - Array of { cellId, name, real_name?, source?, url?, src? }
 * @param {{ includeImages?: boolean, baseUrl?: string, imagePlaceholder?: string }} opts
 * @returns {string} Compact markdown string
 */
export function editorBlockContentToMarkdownAiOptimized(value, images, opts = {}) {
    const markdown = editorBlockContentToMarkdown(value, images, opts)
    return compactMarkdownForAI(markdown)
}

// --- HTML export (same data as editorBlockContentToRaw) ---

const EDITOR_EXPORT_STYLES = `
.crapbook {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: #1f2937;
  max-width: 100%;
}
.crapbook p { margin: 0.5em 0 1em; }
.crapbook p:first-child { margin-top: 0; }
.crapbook h1 { font-size: 2rem; font-weight: 800; margin: 1.5rem 0 0.75rem; line-height: 1.2; }
.crapbook h2 { font-size: 1.5rem; font-weight: 700; margin: 1.25rem 0 0.5rem; line-height: 1.3; }
.crapbook h3 { font-size: 1.25rem; font-weight: 700; margin: 1rem 0 0.5rem; line-height: 1.35; }
.crapbook h4 { font-size: 1.125rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
.crapbook h5 { font-size: 1rem; font-weight: 600; margin: 0.5rem 0; }
.crapbook h6 { font-size: 0.875rem; font-weight: 600; margin: 0.5rem 0; text-transform: uppercase; letter-spacing: 0.05em; }
.crapbook blockquote { margin: 1rem 0; padding: 0.5rem 0 0.5rem 1rem; border-left: 4px solid #d1d5db; color: #4b5563; font-style: italic; }
.crapbook ul, .crapbook ol { margin: 0.75rem 0; padding-left: 1.5rem; }
.crapbook li { margin: 0.25rem 0; }
.crapbook hr { border: none; border-top: 2px solid #e5e7eb; margin: 1.5rem 0; }
.crapbook .highlight { padding: 0 2px; border-radius: 2px; }
.crapbook pre { margin: 1rem 0; padding: 1rem; background: #f3f4f6; border-radius: 0.5rem; overflow-x: auto; font-size: 0.875rem; }
.crapbook code { font-family: ui-monospace, monospace; font-size: 0.9em; }
.crapbook pre code { background: none; padding: 0; }
.crapbook .math { font-style: italic; }
.crapbook-table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9375rem; }
.crapbook-table th,
.crapbook-table td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
.crapbook-table th { font-weight: 700; background: #f9fafb; }
.crapbook-table tbody tr:nth-child(even) { background: #f9fafb; }
.crapbook .crapbook-table.crapbook-columns { table-layout: fixed; }
.crapbook .align-left { text-align: left; }
.crapbook .align-center { text-align: center; }
.crapbook .align-right { text-align: right; }
.crapbook .align-justify { text-align: justify; }
.crapbook-img-wrap { margin: 0.5rem 0; display: flex; justify-content: center; }
.crapbook-img-wrap.align-left { justify-content: flex-start; }
.crapbook-img-wrap.align-center { justify-content: center; }
.crapbook-img-wrap.align-right { justify-content: flex-end; }
.crapbook-img-wrap img { max-width: 100%; height: auto; object-fit: contain; display: block; vertical-align: middle; }
@media (max-width: 640px) {
  .crapbook-table { display: block; overflow-x: auto; }
  .crapbook-img-wrap img { max-width: 100%; }
}
`.trim()

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

function textChildrenToHTML(children) {
    if (!Array.isArray(children)) return ''
    return children.map((node) => {
        if (isTextNode(node)) {
            let s = escapeHtml(node.text ?? '')
            if (node.code) return '<code>' + s + '</code>'
            const parts = []
            if (node.bold) parts.push('strong')
            if (node.italic) parts.push('em')
            if (node.strikethrough) parts.push('s')
            if (node.underline) parts.push('u')
            let out = s
            for (const tag of ['u', 's', 'em', 'strong']) {
                if (parts.includes(tag)) out = `<${tag}>${out}</${tag}>`
            }
            if (node.highlight) {
                const bg = typeof node.highlight === 'string' && node.highlight ? node.highlight : '#fef08a'
                out = '<span class="highlight" style="background-color:' + escapeHtml(bg) + '">' + out + '</span>'
            }
            return out
        }
        if (isElementNode(node) && node.type === 'inline-math') {
            const latex = escapeHtml(typeof node.latex === 'string' ? node.latex.trim() : '')
            return '<span class="math">' + latex + '</span>'
        }
        return ''
    }).join('')
}

function alignClass(node) {
    const a = node.align
    if (a === 'center' || a === 'right' || a === 'justify') return ' align-' + a
    if (a === 'left') return ' align-left'
    return ''
}

function nodeToHTML(node, imagesByCellId, options = { listPrefix: '' }) {
    if (!node || !isElementNode(node)) return ''

    const prefix = options.listPrefix ?? ''
    const ac = alignClass(node)

    switch (node.type) {
        case 'paragraph': {
            const text = prefix + textChildrenToHTML(node.children) || ''
            return '<p class="align-block' + ac + '">' + (text || '<br>') + '</p>\n'
        }
        case 'h1':
            return '<h1 class="align-block' + ac + '">' + textChildrenToHTML(node.children) + '</h1>\n'
        case 'h2':
            return '<h2 class="align-block' + ac + '">' + textChildrenToHTML(node.children) + '</h2>\n'
        case 'h3':
            return '<h3 class="align-block' + ac + '">' + textChildrenToHTML(node.children) + '</h3>\n'
        case 'h4':
            return '<h4 class="align-block' + ac + '">' + textChildrenToHTML(node.children) + '</h4>\n'
        case 'h5':
            return '<h5 class="align-block' + ac + '">' + textChildrenToHTML(node.children) + '</h5>\n'
        case 'h6':
            return '<h6 class="align-block' + ac + '">' + textChildrenToHTML(node.children) + '</h6>\n'
        case 'blockquote':
            return '<blockquote class="align-block' + ac + '">' + textChildrenToHTML(node.children) + '</blockquote>\n'
        case 'horizontal_line':
            return '<hr>\n'
        case 'code': {
            const content = escapeHtml(typeof node.codeContent === 'string' ? node.codeContent : '')
            return '<pre class="align-block' + ac + '"><code>' + content + '</code></pre>\n'
        }
        case 'math': {
            const latex = escapeHtml(typeof node.latex === 'string' ? node.latex.trim() : '')
            if (!latex) return '\n'
            return '<span class="math">' + latex + '</span>\n'
        }
        case 'image': {
            if (options.includeImages === false) {
                const img = imagesByCellId[node.id]
                const name = escapeHtml(img?.real_name || img?.name || 'image')
                return '<p><em>Image here: ' + name + '</em></p>\n'
            }
            const img = imagesByCellId[node.id]
            const baseUrl = options.baseUrl || ''
            const url = img?.url || (img?.source && baseUrl ? baseUrl + img.source : null) || img?.src || '#'
            const alt = escapeHtml(img?.real_name || img?.name || 'image')
            return '<div class="crapbook-img-wrap align-block' + ac + '"><img src="' + escapeHtml(url) + '" alt="' + alt + '"></div>\n'
        }
        case 'table': {
            const rows = Math.max(1, Number(node.rows) || 2)
            const cols = Math.max(1, Number(node.cols) || 2)
            const hasHeader = !!node.hasHeader
            const headerCells = Array.isArray(node.headerCells) ? node.headerCells.slice(0, cols) : []
            const cells = Array.isArray(node.cells) ? node.cells : []
            let out = '<table class="crapbook-table">\n'
            if (hasHeader && headerCells.length > 0) {
                out += '<thead><tr>'
                for (const c of headerCells) out += '<th>' + escapeHtml(c ?? '') + '</th>'
                out += '</tr></thead>\n'
            }
            out += '<tbody>\n'
            for (let r = 0; r < rows; r++) {
                const row = cells[r] || []
                out += '<tr>'
                for (let c = 0; c < cols; c++) out += '<td>' + escapeHtml(row[c] ?? '') + '</td>'
                out += '</tr>\n'
            }
            out += '</tbody></table>\n'
            return out
        }
        case 'columns-container': {
            const columns = (node.children || []).filter((col) => isElementNode(col) && col.type === 'column')
            if (columns.length === 0) return '\n'
            const blockToCellHtml = (block) => {
                let html = nodeToHTML(block, imagesByCellId, options)
                html = html.replace(/<\/?p>\n?/g, '').trim()
                html = html.replace(/<h[1-6]>(.*?)<\/h[1-6]>/gi, '<strong>$1</strong>')
                return html
            }
            const columnCells = columns.map((col) =>
                (col.children || []).map(blockToCellHtml)
            )
            const numRows = Math.max(1, ...columnCells.map((cells) => cells.length))
            let out = '<table class="crapbook-table crapbook-columns">\n<thead><tr>'
            for (const cells of columnCells) out += '<th>' + (cells[0] ?? '') + '</th>'
            out += '</tr></thead>\n<tbody>\n'
            for (let r = 1; r < numRows; r++) {
                out += '<tr>'
                for (const cells of columnCells) out += '<td>' + (cells[r] ?? '') + '</td>'
                out += '</tr>\n'
            }
            out += '</tbody></table>\n'
            return out
        }
        case 'graph':
            return '<p><em>[Graph: ' + escapeHtml(node.expression || '') + ']</em></p>\n'
        case 'sketch':
            return '<p><em>[Sketch]</em></p>\n'
        case 'list-item': {
            const inner = (node.children || []).map((child) => nodeToHTML(child, imagesByCellId, { ...options })).join('').trim()
            return '<li>' + (inner || '') + '</li>\n'
        }
        case 'bulleted-list':
            return '<ul>\n' + (node.children || []).map((c) => nodeToHTML(c, imagesByCellId, { ...options })).join('') + '</ul>\n'
        case 'numbered-list':
            return '<ol>\n' + (node.children || []).map((c) => nodeToHTML(c, imagesByCellId, { ...options })).join('') + '</ol>\n'
        case 'column':
            return (node.children || []).map((n) => nodeToHTML(n, imagesByCellId, options)).join('')
        default:
            return '<p class="align-block' + ac + '">' + prefix + textChildrenToHTML(node.children) + '</p>\n'
    }
}

/**
 * Convert document and images to HTML (same data as editorBlockContentToRaw).
 * @param {Array} value - Slate document value
 * @param {Array} images - Array of { cellId, name, real_name?, source?, url?, src? }
 * @param {{ includeImages?: boolean, includeStyles?: boolean, baseUrl?: string }} opts - baseUrl: prepend to source for full image URLs
 * @returns {string} HTML string
 */
export function editorBlockContentToHTML(value, images, opts = {}) {
    const includeImages = opts.includeImages !== false
    const includeStyles = opts.includeStyles !== false
    const content = Array.isArray(value) ? value : []
    const imagesByCellId = {}
    if (Array.isArray(images)) {
        for (const img of images) {
            if (img && typeof img.cellId === 'string') imagesByCellId[img.cellId] = img
        }
    }
    const inner = content.map((node) => nodeToHTML(node, imagesByCellId, { includeImages, baseUrl: opts.baseUrl })).join('')
    const body = '<div class="crapbook">\n' + inner + '</div>'
    if (includeStyles) return '<style>\n' + EDITOR_EXPORT_STYLES + '\n</style>\n\n' + body
    return body
}
