import { useSelected, useFocused } from 'slate-react'
import { cn } from '../lib/utils'
import { Transforms } from 'slate'
import { ReactEditor, useSlateStatic } from 'slate-react'
import { useEffect, useRef } from 'react'
import functionPlot from 'function-plot'
import ReactMathQuill, { addStyles } from 'react-mathquill'
import katex from 'katex'
import 'katex/dist/katex.min.css'

addStyles()

/** Find matching closing brace for an opening brace at start. Returns end index (of the closing }) or -1. */
function findMatchingBrace(str, start) {
    if (str[start] !== '{') return -1
    let depth = 1
    for (let i = start + 1; i < str.length; i++) {
        if (str[i] === '{') depth++
        else if (str[i] === '}') {
            depth--
            if (depth === 0) return i
        }
    }
    return -1
}

/** Insert * internally only for evaluation - keeps stored/displayed expression clean (no visible *). */
function exprForEval(expr) {
    if (typeof expr !== 'string') return ''
    return expr
        .replace(/(\d)([a-zA-Z])/g, '$1*$2')           // 2x -> 2*x
        .replace(/\bmx\b/gi, 'm*x')                   // mx -> m*x (y=mx+c)
        .replace(/\bax\b/gi, 'a*x')                   // ax -> a*x (ax^2+bx+c)
        .replace(/\bbx\b/gi, 'b*x')
        .replace(/\bkx\b/gi, 'k*x')
        .replace(/\bcx\b/gi, 'c*x')                   // cx -> c*x (careful: only whole word)
}

/** Convert LaTeX from MathQuill to the expression format expected by function-plot (e.g. sin(x), x^2). */
function latexToExpression(latex) {
    if (typeof latex !== 'string') return ''
    let s = latex.trim()
    // Convert \frac{num}{den} to (num)/(den) so function-plot and display work (before stripping \)
    while (s.includes('\\frac')) {
        const i = s.indexOf('\\frac{')
        if (i === -1) break
        const open = i + 5  // after "\frac"
        if (s[open] !== '{') break
        const firstEnd = findMatchingBrace(s, open)
        if (firstEnd === -1 || s[firstEnd + 1] !== '{') break
        const secondEnd = findMatchingBrace(s, firstEnd + 1)
        if (secondEnd === -1) break
        const num = s.slice(open + 1, firstEnd)
        const den = s.slice(firstEnd + 2, secondEnd)
        const repl = `(${latexToExpression(num)})/(${latexToExpression(den)})`
        s = s.slice(0, i) + repl + s.slice(secondEnd + 1)
    }
    // Normalize \left( \right) etc. to plain brackets so we don't get "left(" and "right)" after stripping backslashes
    const bracketPairs = [
        ['\\left(', '('], ['\\right)', ')'],
        ['\\left[', '['], ['\\right]', ']'],
        ['\\left\\{', '{'], ['\\right\\}', '}'],
    ]
    for (const [from, to] of bracketPairs) {
        s = s.split(from).join(to)
    }
    const replacements = [
        ['\\sin', 'sin'],
        ['\\cos', 'cos'],
        ['\\tan', 'tan'],
        ['\\sqrt', 'sqrt'],
        ['\\log', 'log'],
        ['\\ln', 'ln'],
        ['\\exp', 'exp'],
        ['\\pi', 'pi'],
    ]
    for (const [from, to] of replacements) {
        s = s.split(from).join(to)
    }
    return s.replace(/\\/g, '')
}

/** Convert stored expression to LaTeX for MathQuill display (e.g. sin(x) -> \sin(x)). */
function expressionToLatex(expr) {
    if (typeof expr !== 'string') return ''
    let s = expr.trim()
    const replacements = [
        ['sin', '\\sin'],
        ['cos', '\\cos'],
        ['tan', '\\tan'],
        ['sqrt', '\\sqrt'],
        ['log', '\\log'],
        ['ln', '\\ln'],
        ['exp', '\\exp'],
    ]
    for (const [from, to] of replacements) {
        s = s.replace(new RegExp(`\\b${from}\\b`, 'g'), to)
    }
    return s
}

export const GraphBlock = ({ element, isPrintPreview }) => {
    const selected = useSelected()
    const focused = useFocused()
    const editor = useSlateStatic()
    const graphRef = useRef(null)
    const containerRef = useRef(null)
    const mathInputRef = useRef(null)
    const katexRef = useRef(null)

    // Don't auto-focus the input when the block is selected; user must click the input to type.
    // This avoids trapping focus so clicking another block moves selection without needing to click outside.

    // Default values for common parameters (m, c, a, b, k) so expressions like "m*x + c" work
    const DEFAULT_SCOPE = { m: 1, c: 0, a: 1, b: 0, k: 1, n: 2 }

    useEffect(() => {
        if (!graphRef.current) return
        const raw = element?.expression
        const fn = (typeof raw === 'string' && raw.trim() !== '') ? exprForEval(raw.trim()) : 'x^2'
        try {
            functionPlot({
                target: graphRef.current,
                width: 400,
                height: 300,
                yAxis: { domain: [-5, 5] },
                grid: true,
                data: [{ fn, scope: DEFAULT_SCOPE }]
            })
        } catch (e) {
            try {
                functionPlot({
                    target: graphRef.current,
                    width: 400,
                    height: 300,
                    yAxis: { domain: [-5, 5] },
                    grid: true,
                    data: [{ fn: 'x^2' }]
                })
            } catch (fallbackErr) {
                console.error("Graph plotting error:", e)
            }
        }
    }, [element?.expression])

    const displayLatex = element?.latex?.trim() || expressionToLatex(element?.expression ?? '') || 'x^2'

    useEffect(() => {
        if (!isPrintPreview || !katexRef.current) return
        try {
            katex.render(displayLatex, katexRef.current, { displayMode: false, throwOnError: false })
        } catch (_) {
            katexRef.current.textContent = element?.expression?.trim() || 'x^2'
        }
    }, [isPrintPreview, displayLatex, element?.expression])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const stopNative = (e) => {
            if (mathInputRef.current?.contains(e.target)) return
            e.stopPropagation()
            e.stopImmediatePropagation()
        }

        el.addEventListener('keydown', stopNative, { capture: true })
        el.addEventListener('keyup', stopNative, { capture: true })
        el.addEventListener('keypress', stopNative, { capture: true })

        return () => {
            el.removeEventListener('keydown', stopNative, { capture: true })
            el.removeEventListener('keyup', stopNative, { capture: true })
            el.removeEventListener('keypress', stopNative, { capture: true })
        }
    }, [])

    // When user clicks outside the graph block, release focus so Slate can take selection
    useEffect(() => {
        const handleDocMouseDown = (e) => {
            const container = containerRef.current
            if (!container) return
            if (container.contains(e.target)) return
            if (!container.contains(document.activeElement)) return
            const mqField = mathInputRef.current?.querySelector('.mq-editable-field')
            if (mqField?.querySelector('textarea')) mqField.querySelector('textarea').blur()
            ReactEditor.focus(editor)
        }
        document.addEventListener('mousedown', handleDocMouseDown, true)
        return () => document.removeEventListener('mousedown', handleDocMouseDown, true)
    }, [editor])

    const onMathChange = (mathField) => {
        const latex = mathField.latex()
        const expression = latexToExpression(latex)
        const path = ReactEditor.findPath(editor, element)
        Transforms.setNodes(editor, { expression, latex }, { at: path })
    }

    const onMouseDown = (e) => {
        e.nativeEvent.stopImmediatePropagation()
        const path = ReactEditor.findPath(editor, element)
        if (editor.selection?.anchor.path[0] !== path[0]) {
            Transforms.select(editor, path)
        }
    }

    const stopPropagation = (e) => {
        if (mathInputRef.current?.contains(e.target)) return
        e.stopPropagation()
        if (e.nativeEvent) {
            e.nativeEvent.stopImmediatePropagation()
        }
    }

    return (
        <div>
            <div
                ref={containerRef}
                contentEditable={false}
                onMouseDown={onMouseDown}
                onKeyDownCapture={stopPropagation}
                onKeyUpCapture={stopPropagation}
                onKeyDown={stopPropagation}
                onKeyUp={stopPropagation}
                onBeforeInput={stopPropagation}
                onInput={stopPropagation}
                onCompositionStart={stopPropagation}
                onPaste={stopPropagation}
                className={cn(
                    "rounded-xl p-0 flex flex-col items-center gap-2 transition-all bg-white group",
                    selected && focused ? "bg-transparent" : "bg-transparent"
                )}
            >
                <div ref={graphRef} className="bg-white" />
                <div className="w-full flex gap-2 items-center justify-center">
                    {isPrintPreview ? (
                        <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                            y = <span ref={katexRef} className="katex-equation" />
                        </span>
                    ) : (
                        <>
                            <label className="text-sm font-bold text-gray-700 shrink-0">y = </label>
                            <div ref={mathInputRef} className="flex-1 max-w-xs min-w-0 border border-gray-200 rounded bg-white group-hover:border-gray-300 [&_.mq-editable-field]:min-h-[28px] [&_.mq-editable-field]:text-sm [&_.mq-editable-field]:rounded [&_.mq-editable-field]:border-0 [&_.mq-editable-field]:bg-transparent [&_.mq-editable-field]:px-2 [&_.mq-editable-field]:py-1 text-center">
                                <ReactMathQuill
                                    latex={(expressionToLatex(element?.expression ?? '')) || (element?.expression ?? '')}
                                    onChange={onMathChange}
                                    config={{
                                        autoCommands: 'pi theta sqrt',
                                        autoOperatorNames: 'sin cos tan log ln exp',
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
