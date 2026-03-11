import { useCallback, useContext, useMemo } from 'react'
import { Editable } from 'slate-react'
import { Editor as SlateEditor, Element as SlateElement, Transforms } from 'slate'
import { Element } from '../editor/Element'
import { Leaf } from '../editor/Leaf'
import { SlashMenu } from '../editor/SlashMenu'
import { CustomEditor, getLastHighlightColor } from '../editor/lib/utils'
import { CrapEditorContext } from './CrapEditorContext'
import { SlashMenuContext } from '../editor/SlashMenuContext'
import { cn } from '../editor/lib/utils'

/** Default classes: empty so styling is fully custom via your CSS or `classes` prop. */
export const DEFAULT_EDITOR_CLASSES = {
  root: '',
  rootReadOnly: 'pointer-events-none',
  editable: '',
  placeholder: '',
  slashMenuRoot: '',
  slashMenuItem: '',
  slashMenuItemSelected: '',
  slashMenuItemIcon: '',
  slashMenuItemIconSelected: '',
  slashMenuItemLabel: '',
  slashMenuItemDescription: '',
  slashMenuItemDescriptionSelected: '',
}

function useClasses(custom) {
  return useMemo(() => {
    const out = { ...DEFAULT_EDITOR_CLASSES }
    if (custom && typeof custom === 'object') {
      for (const [k, v] of Object.entries(custom)) {
        if (v != null && v !== '') out[k] = v
      }
    }
    return out
  }, [custom])
}

/**
 * B2B customizable content area. Must be used inside CrapEditorProvider.
 * @param {Object} props
 * @param {string} [props.className] - Extra class for the root wrapper
 * @param {boolean} [props.readOnly] - Read-only mode
 * @param {string} [props.placeholder] - Placeholder when empty
 * @param {Object} [props.classes] - Override Tailwind/classes. Keys: root, rootReadOnly, editable, placeholder, slashMenuRoot, slashMenuItem, slashMenuItemSelected, slashMenuItemIcon, slashMenuItemIconSelected, slashMenuItemLabel, slashMenuItemDescription, slashMenuItemDescriptionSelected. See DEFAULT_EDITOR_CLASSES.
 */
export function CrapEditor({ className, readOnly = false, placeholder, classes: classesProp }) {
  const crapContext = useContext(CrapEditorContext)
  const slashContext = useContext(SlashMenuContext)
  const c = useClasses(classesProp)

  if (!crapContext) throw new Error('CrapEditor must be used inside CrapEditorProvider')

  const { editor } = crapContext
  const menuState = slashContext?.menuState ?? { open: false, position: { top: 0, left: 0 } }
  const setMenuState = slashContext?.setMenuState ?? (() => {})

  const renderElement = useCallback((props) => <Element {...props} isPrintPreview={readOnly} />, [readOnly])
  const renderLeaf = useCallback((props) => <Leaf {...props} />, [])

  return (
    <div
      className={cn(
        'crapeditor-b2b crapeditor-b2b-content',
        c.root,
        readOnly && 'crapeditor-b2b-content--readonly',
        readOnly && c.rootReadOnly,
        className
      )}
    >
      <Editable
        readOnly={readOnly}
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        spellCheck={!readOnly}
        autoFocus={!readOnly}
        className={cn('crapeditor-b2b-editable', c.editable)}
        placeholder={placeholder}
        onKeyDown={(event) => {
          if (readOnly) return
          const { selection } = editor
          if (!selection) return

          if (event.key === '/') {
            const [match] = SlateEditor.nodes(editor, {
              match: (n) => !SlateEditor.isEditor(n) && SlateElement.isElement(n) && n.type === 'paragraph',
            })
            if (match) {
              const text = SlateEditor.string(editor, selection.anchor.path)
              if (text.trim() === '') {
                const domSelection = window.getSelection()
                if (domSelection && domSelection.rangeCount > 0) {
                  const range = domSelection.getRangeAt(0)
                  const rect = range.getBoundingClientRect()
                  setMenuState({ open: true, position: { top: rect.top, left: rect.left } })
                }
              }
            }
          }

          if (menuState.open && !['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) {
            setMenuState({ ...menuState, open: false })
          }

          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
            event.preventDefault()
            const [block] = SlateEditor.nodes(editor, {
              match: (n) => !SlateEditor.isEditor(n) && SlateElement.isElement(n),
              at: selection,
            })
            if (block) {
              const [, path] = block
              Transforms.select(editor, {
                anchor: SlateEditor.start(editor, path),
                focus: SlateEditor.end(editor, path),
              })
            }
            return
          }

          if (!event.ctrlKey && !event.metaKey) return
          switch (event.key) {
            case 'b':
              event.preventDefault()
              CustomEditor.toggleMark(editor, 'bold')
              break
            case 'i':
              event.preventDefault()
              CustomEditor.toggleMark(editor, 'italic')
              break
            case 'u':
              event.preventDefault()
              CustomEditor.toggleMark(editor, 'underline')
              break
            case '`':
              event.preventDefault()
              CustomEditor.toggleMark(editor, 'code')
              break
            case 'h':
              event.preventDefault()
              const current = CustomEditor.getHighlightColor(editor)
              if (current) CustomEditor.setHighlight(editor, null)
              else CustomEditor.setHighlight(editor, getLastHighlightColor())
              break
            default:
              break
          }
        }}
      />
      {slashContext?.blocks && slashContext?.onSelectBlock && menuState.open && !readOnly && (
        <SlashMenu
          position={menuState.position}
          onSelect={slashContext.onSelectBlock}
          onClose={() => setMenuState((s) => ({ ...s, open: false }))}
          menuItems={slashContext.blocks}
        />
      )}
    </div>
  )
}
