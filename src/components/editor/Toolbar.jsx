import { useSlate } from 'slate-react'
import { CustomEditor, DEFAULT_HIGHLIGHT_COLOR, getLastHighlightColor, setLastHighlightColor } from './lib/utils'
import {
    Bold, Italic, Underline, Strikethrough, Highlighter,
    Quote,
    List, ListOrdered, ChevronDown, Type, Heading1, Heading2, Heading3,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Plus, Minus, Heading4, Heading5, Heading6, Code, Sigma
} from 'lucide-react'
import { cn } from './lib/utils'
import { Transforms } from 'slate'
import { useState, useEffect, useRef } from 'react'

const ToolbarButton = ({ active, children, onMouseDown, title }) => (
    <button
        onMouseDown={onMouseDown}
        title={title}
        className={cn(
            "p-2 rounded-md transition-all text-slate-500 hover:text-slate-900 hover:bg-slate-100",
            active && "bg-blue-100 text-blue-700"
        )}
    >
        {children}
    </button>
)

const BlockTypeSelector = () => {
    const editor = useSlate()
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef(null)

    const blockTypes = [
        { label: 'Paragraph', value: 'paragraph', icon: Type },
        { label: 'Heading 1', value: 'h1', icon: Heading1 },
        { label: 'Heading 2', value: 'h2', icon: Heading2 },
        { label: 'Heading 3', value: 'h3', icon: Heading3 },
        { label: 'Heading 4', value: 'h4', icon: Heading4 },
        { label: 'Heading 5', value: 'h5', icon: Heading5 },
        { label: 'Heading 6', value: 'h6', icon: Heading6 },
        { label: 'Quote', value: 'blockquote', icon: Quote },
        { label: 'Bulleted List', value: 'bulleted-list', icon: List },
        { label: 'Numbered List', value: 'numbered-list', icon: ListOrdered },
    ]

    const activeBlock = blockTypes.find(b => CustomEditor.isBlockActive(editor, b.value))?.label || 'Paragraph'

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div ref={containerRef}>
            <button
                onMouseDown={(e) => {
                    e.preventDefault()
                    setIsOpen(!isOpen)
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-sm font-medium text-slate-900 min-w-[130px] justify-between transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Type size={14} className="text-slate-500" />
                    <span>{activeBlock}</span>
                </div>
                <ChevronDown size={14} className={cn("transition-transform text-slate-500", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 overflow-y-auto max-h-80">
                    {blockTypes.map((block) => {
                        const Icon = block.icon
                        return (
                            <button
                                key={block.value}
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    CustomEditor.toggleBlock(editor, block.value)
                                    setIsOpen(false)
                                }}
                                className={cn(
                                    "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 rounded-md mx-1",
                                    activeBlock === block.label ? "text-blue-700 bg-blue-100/50 font-semibold" : "text-slate-900 hover:bg-slate-100 font-medium"
                                )}
                            >
                                {Icon && <Icon size={16} className={activeBlock === block.label ? "text-blue-700" : "text-slate-500"} />}
                                <span>{block.label}</span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

const HIGHLIGHT_COLORS = [
    { id: 'yellow', label: 'Yellow', value: DEFAULT_HIGHLIGHT_COLOR },
    { id: 'neon-green', label: 'Neon green', value: '#39ff14' },
    { id: 'blue', label: 'Blue', value: '#93c5fd' },
    { id: 'teal', label: 'Teal', value: '#5eead4' },
    { id: 'pink', label: 'Pink', value: '#f9a8d4' },
]

const HighlightColorSelector = () => {
    const editor = useSlate()
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef(null)
    const currentColor = CustomEditor.getHighlightColor(editor)
    const isHighlightActive = !!currentColor
    const lastColor = getLastHighlightColor()

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const onIconClick = (e) => {
        e.preventDefault()
        const current = CustomEditor.getHighlightColor(editor)
        if (current) {
            CustomEditor.setHighlight(editor, null)
        } else {
            CustomEditor.setHighlight(editor, lastColor)
        }
    }

    const openDropdown = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsOpen(!isOpen)
    }

    return (
        <div ref={containerRef} className="relative flex items-center rounded-lg border border-slate-200 overflow-visible">
            <button
                type="button"
                onMouseDown={onIconClick}
                className={cn(
                    "flex items-center gap-1.5 px-2 py-1.5 transition-colors hover:bg-slate-100 text-slate-500 rounded-l-md",
                    isHighlightActive && "bg-blue-100/50 text-blue-700"
                )}
                title="Apply highlight or remove if already highlighted"
            >
                <Highlighter size={18} />
                <span
                    className="w-4 h-4 rounded border border-slate-200 shrink-0"
                    style={{ backgroundColor: lastColor }}
                />
            </button>
            <button
                type="button"
                onMouseDown={openDropdown}
                className="p-1.5 border-l border-slate-200 hover:bg-slate-100 text-slate-500 transition-colors rounded-r-md"
                title="Choose highlight color"
            >
                <ChevronDown size={14} className={cn("transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div
                    className="absolute top-full left-0 mt-1.5 px-2 py-2 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-row items-center gap-1.5"
                    style={{ zIndex: 9999 }}
                    contentEditable={false}
                >
                    {HIGHLIGHT_COLORS.map(({ id, value }) => (
                        <button
                            key={id}
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setLastHighlightColor(value)
                                CustomEditor.setHighlight(editor, value)
                                setIsOpen(false)
                            }}
                            className={cn(
                                "w-5 h-5 rounded-md border border-slate-200 shrink-0 transition-all hover:scale-110",
                                currentColor === value && "ring-2 ring-offset-1 ring-blue-600"
                            )}
                            style={{ backgroundColor: value }}
                            title={HIGHLIGHT_COLORS.find(c => c.id === id)?.label}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

const FontSizeControl = () => {
    const editor = useSlate()
    const currentSize = CustomEditor.getFontSize(editor)
    const sizeValue = parseInt(currentSize) || 14

    const decreaseSize = (e) => {
        e.preventDefault()
        const newSize = Math.max(12, sizeValue - 2)
        CustomEditor.setFontSize(editor, `${newSize}px`)
    }

    const increaseSize = (e) => {
        e.preventDefault()
        const newSize = Math.min(72, sizeValue + 2)
        CustomEditor.setFontSize(editor, `${newSize}px`)
    }

    return (
        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
                onMouseDown={decreaseSize}
                className="px-2 py-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors border-r border-slate-200"
                title="Decrease font size"
            >
                <Minus size={14} />
            </button>
            <div className="px-3 py-1.5 text-sm font-medium text-slate-500 min-w-[50px] text-center bg-slate-100/50">
                {sizeValue}px
            </div>
            <button
                onMouseDown={increaseSize}
                className="px-2 py-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors border-l border-slate-200"
                title="Increase font size"
            >
                <Plus size={14} />
            </button>
        </div>
    )
}

export const Toolbar = () => {
    const editor = useSlate()

    return (
        <div className="editor-toolbar border-b border-slate-200 p-2.5 flex items-center gap-1.5 mb-4 sticky top-0 bg-white/90 backdrop-blur-md z-[60]">
            <ToolbarButton
                active={false}
                onMouseDown={event => {
                    event.preventDefault()
                    Transforms.insertNodes(editor, { type: 'paragraph', children: [{ text: '' }] })
                }}
                title="Insert Block"
            >
                <Plus size={18} />
            </ToolbarButton>

            <BlockTypeSelector />

            <FontSizeControl />

            <ToolbarButton
                active={CustomEditor.isMarkActive(editor, 'bold')}
                onMouseDown={event => {
                    event.preventDefault()
                    CustomEditor.toggleMark(editor, 'bold')
                }}
                title="Bold (Ctrl+B)"
            >
                <Bold size={18} />
            </ToolbarButton>

            <ToolbarButton
                active={CustomEditor.isMarkActive(editor, 'italic')}
                onMouseDown={event => {
                    event.preventDefault()
                    CustomEditor.toggleMark(editor, 'italic')
                }}
                title="Italic (Ctrl+I)"
            >
                <Italic size={18} />
            </ToolbarButton>

            <ToolbarButton
                active={CustomEditor.isMarkActive(editor, 'underline')}
                onMouseDown={event => {
                    event.preventDefault()
                    CustomEditor.toggleMark(editor, 'underline')
                }}
                title="Underline (Ctrl+U)"
            >
                <Underline size={18} />
            </ToolbarButton>

            <ToolbarButton
                active={CustomEditor.isMarkActive(editor, 'strikethrough')}
                onMouseDown={event => {
                    event.preventDefault()
                    CustomEditor.toggleMark(editor, 'strikethrough')
                }}
                title="Strikethrough"
            >
                <Strikethrough size={18} />
            </ToolbarButton>

            <ToolbarButton
                active={CustomEditor.isMarkActive(editor, 'code')}
                onMouseDown={event => {
                    event.preventDefault()
                    CustomEditor.toggleMark(editor, 'code')
                }}
                title="Inline code (Ctrl+`)"
            >
                <Code size={18} />
            </ToolbarButton>

            <ToolbarButton
                active={CustomEditor.isInlineMathActive(editor)}
                onMouseDown={event => {
                    event.preventDefault()
                    CustomEditor.toggleInlineMath(editor)
                }}
                title="Inline math (select text like x^2 and toggle)"
            >
                <Sigma size={18} />
            </ToolbarButton>

            <HighlightColorSelector />

            <div className="h-6 w-px bg-slate-200 mx-0.5" />

            <ToolbarButton
                active={CustomEditor.isAlignActive(editor, 'left')}
                onMouseDown={event => {
                    event.preventDefault()
                    CustomEditor.toggleAlign(editor, 'left')
                }}
                title="Align Left"
            >
                <AlignLeft size={18} />
            </ToolbarButton>

            <ToolbarButton
                active={CustomEditor.isAlignActive(editor, 'center')}
                onMouseDown={event => {
                    event.preventDefault()
                    CustomEditor.toggleAlign(editor, 'center')
                }}
                title="Align Center"
            >
                <AlignCenter size={18} />
            </ToolbarButton>

            <ToolbarButton
                active={CustomEditor.isAlignActive(editor, 'right')}
                onMouseDown={event => {
                    event.preventDefault()
                    CustomEditor.toggleAlign(editor, 'right')
                }}
                title="Align Right"
            >
                <AlignRight size={18} />
            </ToolbarButton>

            <ToolbarButton
                active={CustomEditor.isAlignActive(editor, 'justify')}
                onMouseDown={event => {
                    event.preventDefault()
                    CustomEditor.toggleAlign(editor, 'justify')
                }}
                title="Justify"
            >
                <AlignJustify size={18} />
            </ToolbarButton>
        </div>
    )
}
