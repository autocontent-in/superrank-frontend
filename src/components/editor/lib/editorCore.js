/**
 * Slate editor plugin: withBlocks (normalize, void elements, insertBreak, deleteBackward).
 * Shared by Editor and CrapEditorProvider.
 */
import { createEditor, Editor as SlateEditor, Element as SlateElement, Transforms, Range } from 'slate'
import { withHistory } from 'slate-history'
import { withReact } from 'slate-react'
import { createParagraphNode } from './editorBlocks'

export { createParagraphNode }

export function withBlocks(editor) {
  const { insertBreak, deleteBackward, isVoid, isInline, normalizeNode } = editor

  editor.isInline = (element) => {
    return element.type === 'inline-math' || isInline(element)
  }

  editor.normalizeNode = (entry) => {
    const [node, path] = entry
    if (path.length === 0 && node.children && node.children.length === 0) {
      Transforms.insertNodes(editor, createParagraphNode(), { at: [0] })
      return
    }
    normalizeNode(entry)
  }

  editor.isVoid = (element) => {
    return ['math', 'sketch', 'graph', 'horizontal_line', 'image', 'code', 'table'].includes(element.type) || isVoid(element)
  }

  editor.insertBreak = () => {
    const { selection } = editor
    if (selection) {
      const [voidMatch] = SlateEditor.nodes(editor, {
        match: n => !SlateEditor.isEditor(n) && SlateElement.isElement(n) && ['math', 'sketch', 'graph', 'horizontal_line', 'image', 'code', 'table'].includes(n.type),
      })
      if (voidMatch) {
        Transforms.insertNodes(editor, createParagraphNode())
        return
      }

      const [paraMatch] = SlateEditor.nodes(editor, {
        match: n => !SlateEditor.isEditor(n) && SlateElement.isElement(n) && n.type === 'paragraph',
      })
      if (paraMatch) {
        Transforms.insertText(editor, '\n')
        return
      }
    }
    insertBreak()
  }

  editor.deleteBackward = (unit) => {
    const { selection } = editor
    if (selection && Range.isCollapsed(selection)) {
      const [cell] = SlateEditor.nodes(editor, {
        match: n => !SlateEditor.isEditor(n) && SlateElement.isElement(n) && ['math', 'sketch', 'graph', 'horizontal_line', 'image', 'code', 'table', 'paragraph'].includes(n.type),
      })

      if (cell) {
        const [node, path] = cell
        if (node.type === 'paragraph' && selection.anchor.offset === 0) {
          const isEmpty = SlateElement.isElement(node) &&
            node.children.length === 1 &&
            node.children[0].text === ''

          if (isEmpty && path.length === 3) {
            const [containerIndex, columnIndex, paraIndex] = path
            const containerNode = SlateEditor.node(editor, [containerIndex])[0]
            if (containerNode?.type === 'columns-container' && columnIndex === 0 && paraIndex === 0) {
              Transforms.removeNodes(editor, { at: [containerIndex] })
              Transforms.insertNodes(editor, createParagraphNode(), { at: [containerIndex] })
              Transforms.select(editor, SlateEditor.start(editor, [containerIndex]))
              return
            }
          }

          if (isEmpty) {
            const prev = SlateEditor.previous(editor, { at: path })
            if (prev) {
              const [prevNode, prevPath] = prev
              if (['math', 'sketch', 'graph', 'horizontal_line', 'code', 'table'].includes(prevNode.type)) {
                Transforms.removeNodes(editor, { at: path })
                Transforms.select(editor, prevPath)
                return
              }
            }
          }
        }
      }
    }
    deleteBackward(unit)
  }

  return editor
}

/** Create a Slate editor instance with plugins (for B2B provider). */
export function createCrapEditor() {
  return withBlocks(withHistory(withReact(createEditor())))
}
