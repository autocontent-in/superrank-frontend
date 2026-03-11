import { createContext, useMemo, useCallback, useState } from 'react'
import { Editor as SlateEditor, Element as SlateElement, Transforms } from 'slate'
import { Slate, ReactEditor } from 'slate-react'
import { createCrapEditor } from '../editor/lib/editorCore'
import { createParagraphNode, createBlockNode, createImageNode, DEFAULT_BLOCK_MENU_ITEMS } from '../editor/lib/editorBlocks'
import { generateCellId } from '../editor/lib/utils'
import { CellImagesContext } from '../editor/CellImagesContext'
import { SlashMenuContext } from '../editor/SlashMenuContext'

/**
 * B2B embeddable editor context (editorb2b).
 * Use CrapEditorProvider to wrap your layout; place CrapToolbar and CrapEditor wherever you want.
 */
export const CrapEditorContext = createContext(null)

const DEFAULT_VALUE = [createParagraphNode()]

/**
 * Blocks shown in the slash menu. When `assignedBlocks` is non-empty, use exactly that order and set;
 * otherwise use default menu items.
 */
function getBlocksForMenu(assignedBlocks) {
  if (!Array.isArray(assignedBlocks) || assignedBlocks.length === 0) {
    return DEFAULT_BLOCK_MENU_ITEMS.map(b => ({ ...b, createNode: () => createBlockNode(b.id) }))
  }
  return assignedBlocks
    .filter(b => b && b.id)
    .map(b => ({
      id: b.id,
      label: b.label ?? b.id,
      icon: b.icon ?? null,
      description: b.description ?? '',
      createNode: typeof b.createNode === 'function' ? b.createNode : () => createBlockNode(b.id),
    }))
}

/**
 * Provider that glues CrapToolbar and CrapEditor via shared Slate state.
 * @param {Array} [props.initialValue]
 * @param {(value: Array) => void} [props.onChange]
 * @param {Array} [props.blocks]
 * @param {Array} [props.images]
 * @param {(images: Array) => void} [props.onImagesChange]
 * @param {string} [props.documentId] - When set, enables image upload to POST /documents/:id/content/image
 * @param {(params: { file: File, cellId: string, dataURL: string }) => void} [props.onRequestImageUpload] - Async handler for image upload
 */
export function CrapEditorProvider({
  initialValue: initialValueProp,
  onChange: onChangeProp,
  blocks: blocksProp,
  images: imagesProp = [],
  onImagesChange: onImagesChangeProp,
  documentId,
  onRequestImageUpload,
  children,
}) {
  const editor = useMemo(() => createCrapEditor(), [])
  const [value, setValue] = useState(() => {
    if (Array.isArray(initialValueProp) && initialValueProp.length > 0) return initialValueProp
    return JSON.parse(JSON.stringify(DEFAULT_VALUE))
  })
  const slateValue = Array.isArray(value) && value.length > 0 ? value : DEFAULT_VALUE

  const blocks = useMemo(() => getBlocksForMenu(blocksProp), [blocksProp])

  const [menuState, setMenuState] = useState({ open: false, position: { top: 0, left: 0 } })

  const handleChange = useCallback(
    (newValue) => {
      setValue(newValue)
      onChangeProp?.(newValue)
    },
    [onChangeProp]
  )

  const createBlockNodeForId = useCallback((type) => {
    const block = blocks.find((b) => b.id === type)
    return block ? block.createNode() : createBlockNode(type)
  }, [blocks])

  const openSlashMenu = useCallback((position) => {
    setMenuState({ open: true, position })
  }, [])

  const onSelectBlock = useCallback(
    (type) => {
      const { selection } = editor
      if (!selection) return

      const [match] = SlateEditor.nodes(editor, {
        at: selection,
        match: (n) => !SlateEditor.isEditor(n) && SlateElement.isElement(n) && n.type === 'paragraph',
      })
      if (!match) return

      const [node, path] = match

      if (type === 'columns') {
        const [inColumn] = SlateEditor.nodes(editor, {
          at: path,
          match: (n) => !SlateEditor.isEditor(n) && SlateElement.isElement(n) && n.type === 'column',
        })
        if (inColumn) {
          setMenuState((s) => ({ ...s, open: false }))
          return
        }
      }

      if (type === 'columns') {
        const columnNodes = [
          {
            type: 'columns-container',
            id: generateCellId(),
            children: [
              { type: 'column', id: generateCellId(), children: [createParagraphNode()] },
              { type: 'column', id: generateCellId(), children: [createParagraphNode()] },
            ],
          },
        ]
        Transforms.removeNodes(editor, { at: path })
        Transforms.insertNodes(editor, columnNodes, { at: path })
        const rootExitPath = [path[0] + 1]
        if (rootExitPath[0] >= editor.children.length) {
          Transforms.insertNodes(editor, createParagraphNode(), { at: rootExitPath })
        }
        const firstParaPath = [...path, 0, 0]
        Transforms.select(editor, SlateEditor.start(editor, firstParaPath))
      } else if (type === 'image') {
        Transforms.removeNodes(editor, { at: path })
        Transforms.insertNodes(editor, createImageNode(), { at: path })
        const nextPath = [...path]
        nextPath[nextPath.length - 1] += 1
        const parentPath = path.slice(0, -1)
        const parent = parentPath.length === 0 ? editor : SlateEditor.node(editor, parentPath)[0]
        if (nextPath[nextPath.length - 1] >= parent.children.length) {
          Transforms.insertNodes(editor, createParagraphNode(), { at: nextPath })
        }
        Transforms.select(editor, SlateEditor.start(editor, path))
      } else {
        const parentPath = path.slice(0, -1)
        const parent = parentPath.length === 0 ? editor : SlateEditor.node(editor, parentPath)[0]
        const hadNextSibling = path[path.length - 1] < parent.children.length - 1
        Transforms.removeNodes(editor, { at: path })
        Transforms.insertNodes(editor, createBlockNodeForId(type), { at: path })
        if (!hadNextSibling) {
          Transforms.insertNodes(editor, createParagraphNode(), { at: [...path.slice(0, -1), path[path.length - 1] + 1] })
        }
        Transforms.select(editor, SlateEditor.start(editor, path))
      }

      ReactEditor.focus(editor)
      setMenuState((s) => ({ ...s, open: false }))
    },
    [editor, createBlockNodeForId]
  )

  const cellImagesValue = useMemo(
    () => ({
      images: imagesProp,
      onAddImage: (entry) => {
        if (!onImagesChangeProp) return
        const next = imagesProp.filter((img) => img.cellId !== entry.cellId)
        next.push(entry)
        onImagesChangeProp(next)
      },
      documentId,
      onRequestImageUpload,
    }),
    [imagesProp, onImagesChangeProp, documentId, onRequestImageUpload]
  )

  const slashMenuContextValue = useMemo(
    () => ({
      openSlashMenu,
      blocks,
      onSelectBlock,
      menuState,
      setMenuState,
    }),
    [openSlashMenu, blocks, onSelectBlock, menuState]
  )

  return (
    <CrapEditorContext.Provider value={{ editor, value: slateValue, setValue: handleChange, blocks }}>
      <CellImagesContext.Provider value={cellImagesValue}>
        <SlashMenuContext.Provider value={slashMenuContextValue}>
          <Slate editor={editor} initialValue={slateValue} onChange={handleChange}>
            {children}
          </Slate>
        </SlashMenuContext.Provider>
      </CellImagesContext.Provider>
    </CrapEditorContext.Provider>
  )
}
