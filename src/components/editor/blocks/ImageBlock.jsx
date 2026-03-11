import { useRef, useState, useEffect } from 'react'
import { useSlateStatic, ReactEditor } from 'slate-react'
import { Image as ImageIcon, AlertCircle, Maximize2, Expand, Crop, AlignStartVertical, Square, AlignEndVertical, AlignStartHorizontal, AlignEndHorizontal } from 'lucide-react'
import { Transforms } from 'slate'
import { cn } from '../lib/utils'
import { useCellImages } from '../CellImagesContext'

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp'

const FIT_OPTIONS = [
    { value: 'fullWidth', icon: Maximize2, label: 'Full width' },
    { value: 'contain', icon: Expand, label: 'Show complete' },
    { value: 'cover', icon: Crop, label: 'Fill / Zoomed' },
]

const OBJECT_POSITION_OPTIONS = [
    { value: 'top', icon: AlignStartVertical, label: 'Top' },
    { value: 'center', icon: Square, label: 'Center' },
    { value: 'bottom', icon: AlignEndVertical, label: 'Bottom' },
    { value: 'left', icon: AlignStartHorizontal, label: 'Left' },
    { value: 'right', icon: AlignEndHorizontal, label: 'Right' },
]

export function ImageBlock({ attributes, children, element }) {
    const editor = useSlateStatic()
    const { images, onAddImage, documentId, onRequestImageUpload } = useCellImages()
    const inputRef = useRef(null)
    const cellId = element?.id
    const image = cellId ? images.find(img => img.cellId === cellId) : null
    const baseUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_BACKEND_API ? import.meta.env.VITE_APP_BACKEND_API : ''
    const displaySrc = image?.uploading ? image?.src : (image?.url ?? (image?.source && baseUrl ? baseUrl + image.source : null) ?? image?.src)
    const isUploading = !!image?.uploading

    const [imageLoadError, setImageLoadError] = useState(false)
    useEffect(() => setImageLoadError(false), [displaySrc])

    const imageFit = element.imageFit ?? 'contain'
    const imageObjectPosition = element.imageObjectPosition ?? 'center'

    const handleUploadClick = (e) => {
        e.preventDefault()
        inputRef.current?.click()
    }

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (!file || !cellId) return
        if (documentId && onRequestImageUpload) {
            const reader = new FileReader()
            reader.onload = () => {
                onRequestImageUpload({ file, cellId, dataURL: reader.result })
            }
            reader.readAsDataURL(file)
        } else if (onAddImage) {
            const reader = new FileReader()
            reader.onload = () => {
                onAddImage({ cellId, name: file.name, src: reader.result })
            }
            reader.readAsDataURL(file)
        }
        e.target.value = ''
    }

    const setImageFit = (e, fit) => {
        e.preventDefault()
        e.stopPropagation()
        const path = ReactEditor.findPath(editor, element)
        if (path != null) Transforms.setNodes(editor, { imageFit: fit }, { at: path })
    }

    const setObjectPosition = (e, position) => {
        e.preventDefault()
        e.stopPropagation()
        const path = ReactEditor.findPath(editor, element)
        if (path != null) Transforms.setNodes(editor, { imageObjectPosition: position }, { at: path })
    }

    const imgWrapperClass = cn(
        'w-full flex justify-center',
        imageFit === 'fullWidth' && 'w-full',
        imageFit === 'cover' && 'h-[280px] overflow-hidden rounded-md'
    )

    const imgClass = cn(
        'rounded-md',
        imageFit === 'contain' && 'max-w-full max-h-[320px] object-contain',
        imageFit === 'fullWidth' && 'w-full h-auto object-contain',
        imageFit === 'cover' && 'w-full h-full object-cover',
        imageFit === 'cover' && imageObjectPosition === 'top' && 'object-top',
        imageFit === 'cover' && imageObjectPosition === 'bottom' && 'object-bottom',
        imageFit === 'cover' && imageObjectPosition === 'left' && 'object-left',
        imageFit === 'cover' && imageObjectPosition === 'right' && 'object-right',
        imageFit === 'cover' && imageObjectPosition === 'center' && 'object-center'
    )

    return (
        <div
            {...attributes}
            className="editor-image-block w-full rounded-md bg-gray-50/50 overflow-hidden group"
        >
            <div contentEditable={false} className="relative flex flex-col items-center justify-center min-h-[140px]">
                {displaySrc ? (
                    imageLoadError ? (
                        <div className="flex flex-col items-center justify-center gap-2 text-amber-600 min-h-[120px]">
                            <AlertCircle className="w-10 h-10" strokeWidth={1.5} />
                            <span className="text-sm font-medium">Error in loading image</span>
                        </div>
                    ) : (
                        <div className={imgWrapperClass}>
                            <img
                                src={displaySrc}
                                alt={image?.real_name ?? image?.name ?? ''}
                                className={cn(imgClass, isUploading && 'opacity-50')}
                                onError={() => setImageLoadError(true)}
                                onLoad={() => setImageLoadError(false)}
                            />
                        </div>
                    )
                ) : (
                    <>
                        <input
                            ref={inputRef}
                            type="file"
                            accept={ACCEPT}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onMouseDown={handleUploadClick}
                            className="flex flex-col items-center justify-center gap-3 min-h-[140px] w-full rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-gray-300 hover:bg-gray-50/50 hover:text-gray-500 transition-colors"
                        >
                            <ImageIcon className="w-12 h-12" strokeWidth={1.5} />
                            <span className="text-sm font-medium">Click to upload image</span>
                        </button>
                    </>
                )}
                {displaySrc && !imageLoadError && (
                    <div className="editor-image-toolbar absolute left-1/2 -translate-x-1/2 bottom-2 flex items-center gap-0.5 py-1 px-2 rounded-md bg-white/95 border border-gray-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {FIT_OPTIONS.map(({ value, icon: Icon, label }) => (
                            <button
                                key={value}
                                type="button"
                                onMouseDown={(e) => setImageFit(e, value)}
                                className={cn(
                                    "p-1.5 rounded-md transition-colors",
                                    imageFit === value
                                        ? "bg-gray-200 text-gray-900"
                                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                                )}
                                title={label}
                            >
                                <Icon size={16} />
                            </button>
                        ))}
                        {imageFit === 'cover' && (
                            <>
                                <div className="w-px h-4 bg-gray-200 mx-0.5" />
                                {OBJECT_POSITION_OPTIONS.map(({ value, icon: Icon, label }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onMouseDown={(e) => setObjectPosition(e, value)}
                                        className={cn(
                                            "p-1.5 rounded-md transition-colors",
                                            imageObjectPosition === value
                                                ? "bg-gray-200 text-gray-900"
                                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                                        )}
                                        title={`Position: ${label}`}
                                    >
                                        <Icon size={14} />
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>
            <div className="hidden">{children}</div>
        </div>
    )
}
