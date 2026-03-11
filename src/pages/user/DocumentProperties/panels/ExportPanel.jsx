import { Download, FileText, Camera } from 'lucide-react'

export function ExportPanel({ onGetMarkdown, onScreenshot }) {
  return (
    <div className="p-4 space-y-5">
      <div className="space-y-3">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <FileText className="w-4 h-4 text-slate-500 shrink-0" />
          Export as PDF
        </button>
        <button
          type="button"
          onClick={onGetMarkdown}
          className="w-full flex items-center justify-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-500 shrink-0" />
          Get Markdown
        </button>
        <button
          type="button"
          onClick={onScreenshot}
          disabled={!onScreenshot}
          className="w-full flex items-center justify-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Download as Image</span>
        </button>
      </div>
    </div>
  )
}
