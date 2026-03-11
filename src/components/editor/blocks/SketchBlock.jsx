import { useSelected, useFocused } from 'slate-react'
import { cn } from '../lib/utils'
import { Excalidraw, exportToSvg, restoreElements } from '@excalidraw/excalidraw'
import { Transforms } from 'slate'
import { ReactEditor, useSlateStatic } from 'slate-react'
import { useRef, useState, useEffect, Component } from 'react'
import { createPortal } from 'react-dom'
import "@excalidraw/excalidraw/index.css"

const sanitizeElements = (elements) => {
    if (!Array.isArray(elements)) return []
    const restored = restoreElements(elements, null)

    return restored.map((el) => {
        const cap = (val) => Math.max(-5000, Math.min(5000, val))

        const base = {
            ...el,
            x: typeof el.x === 'number' ? cap(el.x) : 0,
            y: typeof el.y === 'number' ? cap(el.y) : 0,
            width: typeof el.width === 'number' ? Math.max(0, Math.min(5000, el.width)) : 0,
            height: typeof el.height === 'number' ? Math.max(0, Math.min(5000, el.height)) : 0,
        }

        if (el.points && Array.isArray(el.points)) {
            base.points = el.points.map((p) => [cap(p[0]), cap(p[1])])
        }

        return base
    }).filter(el => el && el.type)
}

class ExcalidrawErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error("Excalidraw crashed:", error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full bg-gray-50 text-gray-900 p-8 text-center overflow-auto">
                    <p className="font-bold text-xl uppercase tracking-tight">Technical Error Encountered</p>
                    <div className="text-sm mt-2 max-w-md bg-white p-4 rounded-xl border border-gray-200 font-mono text-left shadow-sm">
                        {this.state.error?.message || "Unknown rendering error"}
                    </div>
                    <p className="text-xs mt-4 text-gray-500 max-w-xs leading-relaxed">
                        The browser's canvas limits were reached. This often happens if hardware acceleration is disabled or coordinates are unstable.
                    </p>
                    <div className="flex gap-4 mt-8">
                        <button
                            onClick={() => this.setState({ hasError: false })}
                            className="px-6 py-2 bg-black text-white rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-all active:scale-95"
                        >
                            Retry
                        </button>
                        <button
                            onClick={() => {
                                this.props.onReset()
                                this.setState({ hasError: false, error: undefined })
                            }}
                            className="px-6 py-2 bg-white text-gray-600 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all active:scale-95"
                        >
                            Wipe Scene Data
                        </button>
                    </div>
                </div>
            )
        }
        return this.props.children
    }
}

export const SketchBlock = ({ element }) => {
    const selected = useSelected()
    const focused = useFocused()
    const editor = useSlateStatic()
    const [isEditing, setIsEditing] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const previewRef = useRef(null)

    const excalidrawRef = useRef(null)

    const rawElements = element.sketchData?.elements || []
    const elements = sanitizeElements(rawElements)
    const files = element.sketchData?.files || {}

    useEffect(() => {
        if (isEditing) {
            const timer = setTimeout(() => setIsMounted(true), 500)
            return () => {
                clearTimeout(timer)
                setIsMounted(false)
            }
        }
    }, [isEditing])

    useEffect(() => {
        if (!isEditing) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = prev }
    }, [isEditing])

    useEffect(() => {
        if (!isEditing && elements.length > 0) {
            const generatePreview = async () => {
                try {
                    const svg = await exportToSvg({
                        elements,
                        appState: {
                            exportWithDarkMode: false,
                            viewBackgroundColor: "#ffffff",
                        },
                        files,
                    })
                    if (previewRef.current) {
                        previewRef.current.innerHTML = ''
                        svg.setAttribute('width', '100%')
                        svg.setAttribute('height', '100%')
                        previewRef.current.appendChild(svg)
                    }
                } catch (e) {
                    console.error("Failed to generate preview", e)
                }
            }
            const id = requestAnimationFrame(() => {
                generatePreview()
            })
            return () => cancelAnimationFrame(id)
        }
    }, [isEditing, JSON.stringify(elements)])

    const onSave = (newElements, newAppState, newFiles) => {
        try {
            const sanitizedNewElements = sanitizeElements(newElements)
            const path = ReactEditor.findPath(editor, element)
            Transforms.setNodes(editor, {
                sketchData: {
                    elements: sanitizedNewElements,
                    appState: {
                        viewBackgroundColor: newAppState.viewBackgroundColor || "#ffffff",
                    },
                    files: newFiles
                }
            }, { at: path })
        } catch (e) {
            console.error("Failed to save sketch data", e)
        }
    }

    const onDone = () => {
        if (excalidrawRef.current) {
            const newElements = excalidrawRef.current.getSceneElements()
            const newAppState = excalidrawRef.current.getAppState()
            const newFiles = excalidrawRef.current.getFiles()
            onSave(newElements, newAppState, newFiles)
        }
        setIsEditing(false)
    }

    const onReset = () => {
        if (excalidrawRef.current) {
            excalidrawRef.current.updateScene({ elements: [] })
        }
        const path = ReactEditor.findPath(editor, element)
        Transforms.setNodes(editor, { sketchData: { elements: [], appState: {}, files: {} } }, { at: path })
    }

    const editorOverlay = isEditing ? createPortal(
        <div className="fixed inset-0 z-[10000] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="w-full max-w-5xl h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
                <div className="h-16 border-b bg-white flex items-center justify-between px-8 shrink-0">
                    <div className="flex flex-col">
                        <span className="font-extrabold text-gray-900 text-lg uppercase tracking-tight">Sketch Editor</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onReset}
                            className="text-gray-500 font-semibold px-4 py-2 rounded-md text-sm transition-all underline decoration-dashed underline-offset-4 hover:decoration-gray-400 hover:text-gray-900"
                        >
                            Reset Canvas
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="text-gray-500 font-semibold px-4 py-2 rounded-md text-sm transition-all underline decoration-dashed underline-offset-4 hover:decoration-gray-400 hover:text-gray-900"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onDone}
                            className="px-6 py-2 rounded-md text-sm font-semibold border border-gray-300 bg-gray-50 hover:text-gray-900 hover:bg-gray-200 cursor-pointer"
                        >
                            Save
                        </button>
                    </div>
                </div>
                <div className="flex-1 relative bg-gray-100 flex items-center justify-center">
                    {isMounted && (
                        <ExcalidrawErrorBoundary onReset={onReset}>
                            <div className="w-full h-full">
                                <Excalidraw
                                    excalidrawAPI={(api) => excalidrawRef.current = api}
                                    initialData={{
                                        elements: elements,
                                        appState: {
                                            viewBackgroundColor: "#ffffff",
                                            scrollX: 0,
                                            scrollY: 0,
                                            zoom: { value: 1 },
                                            theme: "light",
                                            gridSize: 20,
                                            name: "Safe_Sketch"
                                        },
                                        files
                                    }}
                                    detectScroll={false}
                                    autoFocus={true}
                                />
                            </div>
                        </ExcalidrawErrorBoundary>
                    )}
                </div>
            </div>
        </div>,
        document.body
    ) : null

    const onOpen = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsEditing(true)
    }

    const stopPropagation = (e) => {
        e.stopPropagation()
        if (e.nativeEvent) {
            e.nativeEvent.stopImmediatePropagation()
        }
    }

    const containerRef = useRef(null)

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const stopNative = (e) => {
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

    return (
        <div className="editor-sketch-block relative bg-white group">
            <div
                ref={containerRef}
                contentEditable={false}
                onKeyDownCapture={stopPropagation}
                onKeyUpCapture={stopPropagation}
                className={cn(
                    "rounded-xl overflow-hidden relative transition-all duration-300 h-[370px] w-full bg-white border border-gray-200/50",
                    selected && focused ? "border-blue-300" : "border-gray-300 hover:border-gray-400"
                )}
            >
                {elements.length === 0 && (
                    <div
                        onMouseDown={onOpen}
                        className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer hover:bg-gray-50/50 transition-colors"
                    >
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 shadow-sm text-gray-400 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Click to Edit Sketchbook</span>
                        </div>
                    </div>
                )}

                {elements.length > 0 && (
                    <div className="absolute bottom-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                            onMouseDown={onOpen}
                            className="text-[10px] font-black uppercase tracking-tighter text-gray-400 hover:text-black transition-colors bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md border border-gray-100 shadow-sm"
                        >
                            Edit Sketchbook
                        </button>
                    </div>
                )}

                <div className="editor-sketch-preview w-full h-full min-h-[280px] flex items-center justify-center text-gray-200 overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]" ref={previewRef} />

                {editorOverlay}
            </div>
        </div>
    )
}
