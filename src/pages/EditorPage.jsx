import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Editor } from '../components/editor/Editor'
import { rawToEditorBlockContent } from '../components/editor/lib/editorStorage'

const { value: DEFAULT_DOC } = rawToEditorBlockContent(null)

export function EditorPage() {
  const [value, setValue] = useState(DEFAULT_DOC)
  const [images, setImages] = useState([])

  const handleChange = useCallback((newValue) => {
    setValue(newValue)
  }, [])

  const handleImagesChange = useCallback((newImages) => {
    setImages(newImages)
  }, [])

  return (
    <div className="app-root min-h-screen flex flex-col items-center py-8 px-4 sm:py-12 sm:px-6 bg-slate-50 bg-gradient-to-b from-blue-50/60 to-slate-50">
      <Link to="/" className="self-start mb-4 text-slate-600 hover:text-slate-900 text-sm font-medium">
        ← Back to home
      </Link>
      <div className="editor-page-container w-full max-w-4xl bg-white rounded-2xl border border-slate-200 min-h-[500px] shadow-lg">
        <Editor
          title={import.meta.env.VITE_APP_NAME ?? 'Crapbook'}
          initialValue={value}
          onChange={handleChange}
          images={images}
          onImagesChange={handleImagesChange}
        />
      </div>
    </div>
  )
}
