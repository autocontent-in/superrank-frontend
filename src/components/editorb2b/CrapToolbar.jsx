import { useContext, useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSlate } from 'slate-react'
import { CustomEditor, DEFAULT_HIGHLIGHT_COLOR, getLastHighlightColor, setLastHighlightColor } from '../editor/lib/utils'
import {
  Bold, Italic, Underline, Strikethrough, Highlighter,
  Quote, List, ListOrdered, ChevronDown, Type, Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Plus, Minus, Heading4, Heading5, Heading6, Code, Sigma,
} from 'lucide-react'
import { cn } from '../editor/lib/utils'
import { Transforms } from 'slate'
import { CrapEditorContext } from './CrapEditorContext'

/** Default classes: empty so styling is fully custom via your CSS or `classes` prop. */
export const DEFAULT_TOOLBAR_CLASSES = {
  root: '',
  button: '',
  buttonActive: '',
  blockSelectorRoot: '',
  blockSelectorTrigger: '',
  blockSelectorTriggerIcon: '',
  blockSelectorChevron: '',
  blockSelectorChevronOpen: '',
  blockSelectorDropdown: '',
  blockSelectorItem: '',
  blockSelectorItemActive: '',
  blockSelectorItemIcon: '',
  blockSelectorItemIconActive: '',
  divider: '',
  fontSizeRoot: '',
  fontSizeDecreaseButton: '',
  fontSizeDisplay: '',
  fontSizeIncreaseButton: '',
  highlightRoot: '',
  highlightMainButton: '',
  highlightMainButtonActive: '',
  highlightSwatch: '',
  highlightDropdownButton: '',
  highlightDropdown: '',
  highlightColorSwatch: '',
  highlightColorSwatchActive: '',
}

function useClasses(custom) {
  return useMemo(() => {
    const out = { ...DEFAULT_TOOLBAR_CLASSES }
    if (custom && typeof custom === 'object') {
      for (const [k, v] of Object.entries(custom)) {
        if (v != null && v !== '') out[k] = v
      }
    }
    return out
  }, [custom])
}

const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: 'Yellow', value: DEFAULT_HIGHLIGHT_COLOR },
  { id: 'neon-green', label: 'Neon green', value: '#39ff14' },
  { id: 'blue', label: 'Blue', value: '#93c5fd' },
  { id: 'teal', label: 'Teal', value: '#5eead4' },
  { id: 'pink', label: 'Pink', value: '#f9a8d4' },
]

const BLOCK_TYPES = [
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

/**
 * B2B customizable toolbar. Must be used inside CrapEditorProvider.
 * @param {Object} props
 * @param {string} [props.className] - Extra class for the root wrapper
 * @param {boolean} [props.sticky] - Sticky top (default true)
 * @param {Object} [props.classes] - Override Tailwind/classes per element. Keys: root, button, buttonActive, blockSelectorTrigger, blockSelectorDropdown, blockSelectorItem, blockSelectorItemActive, divider, fontSizeRoot, fontSizeDecreaseButton, fontSizeDisplay, fontSizeIncreaseButton, highlightRoot, highlightMainButton, highlightMainButtonActive, highlightSwatch, highlightDropdownButton, highlightDropdown, highlightColorSwatch, highlightColorSwatchActive, etc. See DEFAULT_TOOLBAR_CLASSES.
 */
export function CrapToolbar({ className, sticky = true, classes: classesProp }) {
  const context = useContext(CrapEditorContext)
  const editor = useSlate()
  const c = useClasses(classesProp)

  if (!context) throw new Error('CrapToolbar must be used inside CrapEditorProvider')

  const [blockSelectorOpen, setBlockSelectorOpen] = useState(false)
  const [highlightOpen, setHighlightOpen] = useState(false)
  const [highlightDropdownPosition, setHighlightDropdownPosition] = useState(null)
  const blockSelectorRef = useRef(null)
  const highlightRef = useRef(null)

  useEffect(() => {
    const handle = (e) => {
      if (blockSelectorRef.current && !blockSelectorRef.current.contains(e.target)) setBlockSelectorOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])
  useEffect(() => {
    const handle = (e) => {
      if (highlightRef.current && !highlightRef.current.contains(e.target)) setHighlightOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useLayoutEffect(() => {
    if (!highlightOpen || !highlightRef.current) {
      setHighlightDropdownPosition(null)
      return
    }
    const updatePosition = () => {
      const el = highlightRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setHighlightDropdownPosition({ top: rect.bottom + 4, left: rect.left })
    }
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [highlightOpen])

  const activeBlock = BLOCK_TYPES.find(b => CustomEditor.isBlockActive(editor, b.value))?.label || 'Paragraph'
  const currentHighlight = CustomEditor.getHighlightColor(editor)
  const isHighlightActive = !!currentHighlight
  const lastColor = getLastHighlightColor()
  const currentSize = CustomEditor.getFontSize(editor)
  const sizeValue = parseInt(currentSize) || 14

  const ToolbarButton = ({ active, onMouseDown, title, children }) => (
    <button
      onMouseDown={onMouseDown}
      title={title}
      className={cn('crapeditor-b2b-toolbar__btn', c.button, active && 'crapeditor-b2b-toolbar__btn--active', active && c.buttonActive)}
    >
      {children}
    </button>
  )

  return (
    <div
      className={cn(
        'crapeditor-b2b crapeditor-b2b-toolbar',
        c.root,
        sticky && 'crapeditor-b2b-toolbar--sticky',
        className
      )}
    >
      <ToolbarButton
        active={false}
        onMouseDown={(e) => { e.preventDefault(); Transforms.insertNodes(editor, { type: 'paragraph', children: [{ text: '' }] }) }}
        title="Insert Block"
      >
        <Plus size={18} />
      </ToolbarButton>

      <div ref={blockSelectorRef} className={cn('crapeditor-b2b-toolbar__block-selector', c.blockSelectorRoot)}>
        <button
          onMouseDown={(e) => { e.preventDefault(); setBlockSelectorOpen(!blockSelectorOpen) }}
          className={cn('crapeditor-b2b-toolbar__block-trigger', c.blockSelectorTrigger)}
        >
          <div className="flex items-center gap-2">
            <Type size={14} className={cn('crapeditor-b2b-toolbar__block-trigger-icon', c.blockSelectorTriggerIcon)} />
            <span>{activeBlock}</span>
          </div>
          <ChevronDown size={14} className={cn('crapeditor-b2b-toolbar__block-chevron', c.blockSelectorChevron, blockSelectorOpen && 'crapeditor-b2b-toolbar__block-chevron--open', blockSelectorOpen && c.blockSelectorChevronOpen)} />
        </button>
        {blockSelectorOpen && (
          <div className={cn('crapeditor-b2b-toolbar__block-dropdown', c.blockSelectorDropdown)}>
            {BLOCK_TYPES.map((block) => {
              const Icon = block.icon
              const active = activeBlock === block.label
              return (
                <button
                  key={block.value}
                  onMouseDown={(e) => { e.preventDefault(); CustomEditor.toggleBlock(editor, block.value); setBlockSelectorOpen(false) }}
                  className={cn('crapeditor-b2b-toolbar__block-item', c.blockSelectorItem, active && 'crapeditor-b2b-toolbar__block-item--active', active && c.blockSelectorItemActive)}
                >
                  {Icon && <Icon size={16} className={cn('crapeditor-b2b-toolbar__block-item-icon', active ? c.blockSelectorItemIconActive : c.blockSelectorItemIcon)} />}
                  <span>{block.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className={cn('crapeditor-b2b-toolbar__font-size', c.fontSizeRoot)}>
        <button onMouseDown={(e) => { e.preventDefault(); CustomEditor.setFontSize(editor, `${Math.max(12, sizeValue - 2)}px`) }} className={cn('crapeditor-b2b-toolbar__font-size-btn', c.fontSizeDecreaseButton)} title="Decrease font size">
          <Minus size={14} />
        </button>
        <div className={cn('crapeditor-b2b-toolbar__font-size-display', c.fontSizeDisplay)}>{sizeValue}px</div>
        <button onMouseDown={(e) => { e.preventDefault(); CustomEditor.setFontSize(editor, `${Math.min(72, sizeValue + 2)}px`) }} className={cn('crapeditor-b2b-toolbar__font-size-btn', c.fontSizeIncreaseButton)} title="Increase font size">
          <Plus size={14} />
        </button>
      </div>

      <ToolbarButton active={CustomEditor.isMarkActive(editor, 'bold')} onMouseDown={(e) => { e.preventDefault(); CustomEditor.toggleMark(editor, 'bold') }} title="Bold (Ctrl+B)"><Bold size={18} /></ToolbarButton>
      <ToolbarButton active={CustomEditor.isMarkActive(editor, 'italic')} onMouseDown={(e) => { e.preventDefault(); CustomEditor.toggleMark(editor, 'italic') }} title="Italic (Ctrl+I)"><Italic size={18} /></ToolbarButton>
      <ToolbarButton active={CustomEditor.isMarkActive(editor, 'underline')} onMouseDown={(e) => { e.preventDefault(); CustomEditor.toggleMark(editor, 'underline') }} title="Underline (Ctrl+U)"><Underline size={18} /></ToolbarButton>
      <ToolbarButton active={CustomEditor.isMarkActive(editor, 'strikethrough')} onMouseDown={(e) => { e.preventDefault(); CustomEditor.toggleMark(editor, 'strikethrough') }} title="Strikethrough"><Strikethrough size={18} /></ToolbarButton>
      <ToolbarButton active={CustomEditor.isMarkActive(editor, 'code')} onMouseDown={(e) => { e.preventDefault(); CustomEditor.toggleMark(editor, 'code') }} title="Inline code (Ctrl+`)"><Code size={18} /></ToolbarButton>
      <ToolbarButton active={CustomEditor.isInlineMathActive(editor)} onMouseDown={(e) => { e.preventDefault(); CustomEditor.toggleInlineMath(editor) }} title="Inline math (select text like x^2 and toggle)"><Sigma size={18} /></ToolbarButton>

      <div ref={highlightRef} className={cn('crapeditor-b2b-toolbar__highlight', c.highlightRoot)}>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); if (currentHighlight) CustomEditor.setHighlight(editor, null); else CustomEditor.setHighlight(editor, lastColor) }}
          className={cn('crapeditor-b2b-toolbar__highlight-btn', c.highlightMainButton, isHighlightActive && 'crapeditor-b2b-toolbar__highlight-btn--active', isHighlightActive && c.highlightMainButtonActive)}
          title="Apply highlight or remove if already highlighted"
        >
          <Highlighter size={18} />
          <span className={cn('crapeditor-b2b-toolbar__highlight-swatch', c.highlightSwatch)} style={{ backgroundColor: lastColor }} />
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setHighlightOpen(!highlightOpen) }} className={cn('crapeditor-b2b-toolbar__highlight-dropdown-btn', c.highlightDropdownButton)} title="Choose highlight color">
          <ChevronDown size={14} className={cn('transition-transform', highlightOpen && 'rotate-180')} />
        </button>
        {highlightOpen && highlightDropdownPosition && createPortal(
          <div
            className={cn('crapeditor-b2b-toolbar__highlight-dropdown', c.highlightDropdown)}
            style={{
              position: 'fixed',
              top: highlightDropdownPosition.top,
              left: highlightDropdownPosition.left,
              zIndex: 99999,
              marginTop: 0,
            }}
            contentEditable={false}
          >
            {HIGHLIGHT_COLORS.map(({ id, value }) => (
              <button
                key={id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setLastHighlightColor(value); CustomEditor.setHighlight(editor, value); setHighlightOpen(false) }}
                className={cn('crapeditor-b2b-toolbar__highlight-swatch-btn', c.highlightColorSwatch, currentHighlight === value && 'crapeditor-b2b-toolbar__highlight-swatch-btn--active', currentHighlight === value && c.highlightColorSwatchActive)}
                style={{ backgroundColor: value }}
                title={HIGHLIGHT_COLORS.find(x => x.id === id)?.label}
              />
            ))}
          </div>,
          document.body
        )}
      </div>

      <div className={cn('crapeditor-b2b-toolbar__divider', c.divider)} />

      <ToolbarButton active={CustomEditor.isAlignActive(editor, 'left')} onMouseDown={(e) => { e.preventDefault(); CustomEditor.toggleAlign(editor, 'left') }} title="Align Left"><AlignLeft size={18} /></ToolbarButton>
      <ToolbarButton active={CustomEditor.isAlignActive(editor, 'center')} onMouseDown={(e) => { e.preventDefault(); CustomEditor.toggleAlign(editor, 'center') }} title="Align Center"><AlignCenter size={18} /></ToolbarButton>
      <ToolbarButton active={CustomEditor.isAlignActive(editor, 'right')} onMouseDown={(e) => { e.preventDefault(); CustomEditor.toggleAlign(editor, 'right') }} title="Align Right"><AlignRight size={18} /></ToolbarButton>
      <ToolbarButton active={CustomEditor.isAlignActive(editor, 'justify')} onMouseDown={(e) => { e.preventDefault(); CustomEditor.toggleAlign(editor, 'justify') }} title="Justify"><AlignJustify size={18} /></ToolbarButton>
    </div>
  )
}
