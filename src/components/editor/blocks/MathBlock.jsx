import { useSelected, useFocused } from 'slate-react'
import { cn } from '../lib/utils'
import ReactMathQuill, { addStyles } from 'react-mathquill'
import { Transforms } from 'slate'
import { ReactEditor, useSlateStatic } from 'slate-react'
import { useRef, useEffect } from 'react'

addStyles()

export const MathBlock = ({ element }) => {
    const selected = useSelected()
    const focused = useFocused()
    const editor = useSlateStatic()
    const containerRef = useRef(null)

    const onChange = (mathField) => {
        const latex = mathField.latex()
        const path = ReactEditor.findPath(editor, element)
        Transforms.setNodes(editor, { latex }, { at: path })
    }

    const onMouseDown = (e) => {
        e.nativeEvent.stopImmediatePropagation()
        const path = ReactEditor.findPath(editor, element)
        if (editor.selection?.anchor.path[0] !== path[0]) {
            Transforms.select(editor, path)
        }
    }

    const stopPropagation = (e) => {
        e.stopPropagation()
    }

    useEffect(() => {
        if (selected && focused && containerRef.current) {
            const mqInput = containerRef.current.querySelector('.mq-editable-field textarea, .mq-editable-field')
            if (mqInput) {
                mqInput.focus()
            }
        }
    }, [selected, focused])

    const MQComponent = ReactMathQuill
    const isEmpty = !element.latex || String(element.latex).trim() === ''

    return (
        <div className="w-full relative">
            {isEmpty && (
                <div
                    className="absolute inset-0 flex items-center pointer-events-none text-gray-400 text-sm"
                    aria-hidden
                >
                    Enter math expression
                </div>
            )}
            <div
                ref={containerRef}
                contentEditable={false}
                onMouseDown={onMouseDown}
                onKeyDown={stopPropagation}
                onKeyUp={stopPropagation}
                onBeforeInput={stopPropagation}
                onInput={stopPropagation}
                onCompositionStart={stopPropagation}
                onPaste={stopPropagation}
                className={cn(
                    "rounded-lg transition-all block w-full relative",
                    selected && focused ? "bg-black/5" : "bg-transparent"
                )}
            >
                <MQComponent
                    latex={element.latex || ''}
                    onChange={onChange}
                    config={{
                        autoCommands: 'pi theta sqrt sum prod alpha beta gamma delta',
                        autoOperatorNames: 'sin cos tan',
                    }}
                />
            </div>
        </div>
    )
}
