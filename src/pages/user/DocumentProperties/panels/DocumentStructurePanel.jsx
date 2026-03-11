import { Braces } from 'lucide-react'

export function DocumentStructurePanel({ onGetDocumentStructure }) {
  return (
    <div className="p-4 space-y-5">
      <div className="space-y-3">
        <button
          type="button"
          onClick={onGetDocumentStructure}
          className="w-full flex items-center justify-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Braces className="w-4 h-4 text-slate-500 shrink-0" />
          Get Document Structure
        </button>
      </div>
    </div>
  )
}
