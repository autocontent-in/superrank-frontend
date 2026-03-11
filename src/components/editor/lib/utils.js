import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Editor, Transforms, Element as SlateElement } from 'slate'

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

/** Generate a 16-character-style cell id (e.g. "a1b2-c3d4-e5f6-g7h8"). */
export function generateCellId() {
    const segment = () => Math.random().toString(36).slice(2, 6)
    return `${segment()}-${segment()}-${segment()}-${segment()}`
}

/**
 * Generate a 64-character storage name for uploaded images.
 * Must start with an alphabet character; uses alphanumeric (a-zA-Z0-9) and underscore.
 * @param {string} extension - File extension (e.g. ".png", "jpg")
 * @returns {string} e.g. "aB3x_9Zk2...png" (64 chars + extension)
 */
export function generateImageStorageName(extension) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_'
    const firstChar = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    let result = firstChar[Math.floor(Math.random() * firstChar.length)]
    for (let i = 0; i < 63; i++) {
        result += chars[Math.floor(Math.random() * chars.length)]
    }
    const ext = String(extension || '').trim()
    const normalized = ext.startsWith('.') ? ext : ext ? `.${ext}` : ''
    return result + normalized
}

const LIST_TYPES = ['bulleted-list', 'numbered-list']

export const DEFAULT_HIGHLIGHT_COLOR = '#fef08a' // yellow

let lastHighlightColor = DEFAULT_HIGHLIGHT_COLOR

export function getLastHighlightColor() {
    return lastHighlightColor
}

export function setLastHighlightColor(color) {
    if (color != null && color !== '') lastHighlightColor = color
}

export const CustomEditor = {
    isMarkActive(editor, format) {
        const marks = Editor.marks(editor)
        if (format === 'highlight') return marks ? !!marks.highlight : false
        return marks ? marks[format] === true : false
    },

    toggleMark(editor, format, value) {
        if (format === 'highlight' && value !== undefined) {
            CustomEditor.setHighlight(editor, value)
            return
        }
        const isActive = CustomEditor.isMarkActive(editor, format)
        if (isActive) {
            Editor.removeMark(editor, format)
        } else {
            Editor.addMark(editor, format, true)
        }
    },

    getHighlightColor(editor) {
        const marks = Editor.marks(editor)
        const v = marks?.highlight
        return v === true ? DEFAULT_HIGHLIGHT_COLOR : v || null
    },

    setHighlight(editor, color) {
        if (color == null || color === '') {
            Editor.removeMark(editor, 'highlight')
        } else {
            Editor.addMark(editor, 'highlight', color)
        }
    },

    isBlockActive(editor, format) {
        const { selection } = editor
        if (!selection) return false

        const [match] = Array.from(
            Editor.nodes(editor, {
                at: Editor.unhangRange(editor, selection),
                match: n =>
                    !Editor.isEditor(n) &&
                    SlateElement.isElement(n) &&
                    n.type === format,
            })
        )

        return !!match
    },

    toggleBlock(editor, format) {
        const isActive = CustomEditor.isBlockActive(editor, format)
        const isList = LIST_TYPES.includes(format)

        Transforms.unwrapNodes(editor, {
            match: n =>
                !Editor.isEditor(n) &&
                SlateElement.isElement(n) &&
                LIST_TYPES.includes(n.type),
            split: true,
        })

        const newProperties = {
            type: isActive ? 'paragraph' : isList ? 'list-item' : format,
        }
        Transforms.setNodes(editor, newProperties)

        if (!isActive && isList) {
            const block = { type: format, children: [] }
            Transforms.wrapNodes(editor, block)
        }
    },

    isAlignActive(editor, align) {
        const { selection } = editor
        if (!selection) return false

        const [match] = Array.from(
            Editor.nodes(editor, {
                at: Editor.unhangRange(editor, selection),
                match: n =>
                    !Editor.isEditor(n) &&
                    SlateElement.isElement(n) &&
                    n.align === align,
            })
        )

        return !!match
    },

    toggleAlign(editor, align) {
        const isActive = CustomEditor.isAlignActive(editor, align)

        const newProperties = {
            align: isActive ? undefined : align,
        }

        Transforms.setNodes(editor, newProperties, {
            match: n => !Editor.isEditor(n) && SlateElement.isElement(n)
        })
    },

    getFontSize(editor) {
        const marks = Editor.marks(editor)
        return marks?.fontSize || '14px'
    },

    setFontSize(editor, fontSize) {
        Editor.addMark(editor, 'fontSize', fontSize)
    },

    isBoldMarkActive(editor) { return CustomEditor.isMarkActive(editor, 'bold') },
    toggleBoldMark(editor) { return CustomEditor.toggleMark(editor, 'bold') },

    isInlineMathActive(editor) {
        const { selection } = editor
        if (!selection) return false
        const [match] = Array.from(
            Editor.nodes(editor, {
                at: Editor.unhangRange(editor, selection),
                match: n =>
                    !Editor.isEditor(n) &&
                    SlateElement.isElement(n) &&
                    n.type === 'inline-math',
            })
        )
        return !!match
    },

    toggleInlineMath(editor) {
        const { selection } = editor
        if (!selection) return
        const isActive = CustomEditor.isInlineMathActive(editor)
        if (isActive) {
            Transforms.unwrapNodes(editor, {
                match: n =>
                    !Editor.isEditor(n) &&
                    SlateElement.isElement(n) &&
                    n.type === 'inline-math',
                split: true,
            })
        } else {
            const selectedText = Editor.string(editor, selection)
            if (!selectedText) return
            const inlineMathNode = {
                type: 'inline-math',
                latex: selectedText,
                children: [{ text: selectedText }],
            }
            Transforms.wrapNodes(editor, inlineMathNode, { split: true })
        }
    },
}
