import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { CrapEditorProvider, CrapEditor, CrapToolbar } from '../components/editorb2b'
import '../components/editorb2b/editorb2b.css'
import { rawToEditorBlockContent } from '../components/editor/lib/editorStorage'
import { DEFAULT_BLOCK_MENU_ITEMS } from '../components/editor/lib/editorBlocks'
import { ArrowLeft, Code2, LayoutDashboard } from 'lucide-react'

const { value: DEFAULT_DOC } = rawToEditorBlockContent(null)

/** Slash menu shows only these blocks, in this order (graph then code). */
const B2B_BLOCKS = (() => {
  const byId = Object.fromEntries(DEFAULT_BLOCK_MENU_ITEMS.map(b => [b.id, b]))
  return [byId.graph, byId.sketch, byId.code].filter(Boolean)
})()

export function B2BPage() {
  const [value, setValue] = useState(DEFAULT_DOC)
  const [images, setImages] = useState([])

  const handleChange = useCallback((newValue) => setValue(newValue), [])
  const handleImagesChange = useCallback((newImages) => setImages(newImages), [])

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header: back link + title */}
      <header className="border-b border-slate-200 bg-white px-4 py-3 flex items-center gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors"
        >
          <ArrowLeft size={18} />
          Back to app
        </Link>
        <h1 className="text-lg font-semibold text-slate-900">B2B Embeddable Editor</h1>
      </header>

      <div className="flex-1 flex flex-col md:flex-row gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {/* Demo area: your layout, your placement of toolbar + content */}
        <section className="flex-1 flex flex-col min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
            <LayoutDashboard size={16} />
            Demo: toolbar on top, content below (customize as you like)
          </h2>
          <CrapEditorProvider
            initialValue={value}
            onChange={handleChange}
            blocks={B2B_BLOCKS}
            images={images}
            onImagesChange={handleImagesChange}
          >
            <CrapToolbar className="border border-slate-200 py-1 px-1 rounded-md bg-white" />
            <CrapEditor className="border border-slate-200 rounded-none p-4 bg-red-100" placeholder="Type '/' to add a block…" />
          </CrapEditorProvider>
        </section>

        {/* Embed docs */}
        <aside className="md:w-[360px] shrink-0 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Code2 size={16} />
            How to embed
          </h2>
          <div className="bg-slate-100 rounded-xl p-4 text-sm text-slate-800 font-mono whitespace-pre-wrap break-words border border-slate-200">
{`import {
  CrapEditorProvider,
  CrapEditor,
  CrapToolbar,
} from '…/components/editorb2b'

// Your layout: place toolbar and content wherever you want
<CrapEditorProvider
  initialValue={yourInitialBlocks}
  onChange={handleChange}
  blocks={customBlocks}  // optional: add/override block types
  images={images}
  onImagesChange={setImages}
>
  <header>
    <CrapToolbar />   \{/* e.g. sticky top */}
  </header>
  <main>
    <CrapEditor />    \{/* content area */}
  </main>
</CrapEditorProvider>`}
          </div>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>Use <code className="bg-slate-200 px-1 rounded">CrapEditorProvider</code> once per editor instance.</li>
            <li>Place <code className="bg-slate-200 px-1 rounded">CrapToolbar</code> and <code className="bg-slate-200 px-1 rounded">CrapEditor</code> anywhere; they share state.</li>
            <li>Pass <code className="bg-slate-200 px-1 rounded">blocks</code> to set which blocks appear in the slash menu and in what order (e.g. <code className="bg-slate-200 px-1 rounded">{'blocks={[graphBlock, codeBlock]}'}</code> shows only Graph then Code).</li>
            <li>Save/load with <code className="bg-slate-200 px-1 rounded">editorBlockContentToRaw</code> / <code className="bg-slate-200 px-1 rounded">rawToEditorBlockContent</code> from <code className="bg-slate-200 px-1 rounded">editorStorage</code>.</li>
            <li>Import <code className="bg-slate-200 px-1 rounded">editorb2b.css</code> for layout only (no borders, radius, or shadows). Add your own CSS targeting <code className="bg-slate-200 px-1 rounded">.crapeditor-b2b-*</code> or use the <code className="bg-slate-200 px-1 rounded">classes</code> prop to style.</li>
          </ul>
        </aside>
      </div>
    </div>
  )
}
