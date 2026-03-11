import { Printer, X } from 'lucide-react'

const PAGE_MARGINS = [
  { id: '10x10', label: 'A4 - 10 x 10 mm (Default)', value: '10x10' },
  { id: '8x6', label: 'A4 - 8 x 6 mm', value: '8x6' },
]

export function PrintPanel({
  isPrintPreview,
  onTogglePrintPreview,
  printSettings,
  onPrintSettingsChange,
  onPrint,
}) {
  const { showHighlighter, pageMargin, keepBlocksTogether } = printSettings ?? {
    showHighlighter: true,
    pageMargin: '10x10',
    keepBlocksTogether: false,
  }
  const setShowHighlighter = (v) => onPrintSettingsChange?.({ ...printSettings, showHighlighter: v })
  const setPageMargin = (v) => onPrintSettingsChange?.({ ...printSettings, pageMargin: v })
  const setKeepBlocksTogether = (v) => onPrintSettingsChange?.({ ...printSettings, keepBlocksTogether: v })

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-3">
        <button
          type="button"
          onClick={onTogglePrintPreview}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          {isPrintPreview ? (
            <>
              <X className="w-4 h-4 text-slate-500 shrink-0" />
              Exit Print Preview
            </>
          ) : (
            <>
              <Printer className="w-4 h-4 text-slate-500 shrink-0" />
              Print Preview
            </>
          )}
        </button>
        {isPrintPreview && (
          <button
            type="button"
            onClick={onPrint}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-medium text-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-600 shrink-0" />
            Print
          </button>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Settings</h3>

        <div className="flex items-center justify-between gap-3">
          <label className="text-sm text-slate-700">Show highlighter</label>
          <button
            type="button"
            role="switch"
            aria-checked={showHighlighter}
            onClick={() => setShowHighlighter(!showHighlighter)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              showHighlighter ? 'bg-blue-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                showHighlighter ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        <hr className="border-slate-200" />

        <div className="flex items-center justify-between gap-3">
          <label className="text-sm text-slate-700">Preserve complete content</label>
          <button
            type="button"
            role="switch"
            aria-checked={keepBlocksTogether}
            onClick={() => setKeepBlocksTogether(!keepBlocksTogether)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              keepBlocksTogether ? 'bg-blue-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                keepBlocksTogether ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-slate-500 tracking-loose">
          When off, paragraphs can break across pages. When on, each complete content stays on one page or one place.
        </p>
        <hr className="border-slate-200" />

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Page margin</p>
          <div className="space-y-2">
            {PAGE_MARGINS.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-3 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:bg-slate-50 transition-colors"
              >
                <input
                  type="radio"
                  name="pageMargin"
                  value={opt.value}
                  checked={(pageMargin || '10x10') === opt.value}
                  onChange={() => setPageMargin(opt.value)}
                  className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
