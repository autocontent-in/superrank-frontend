import { Info, Download, Users, Printer, ChevronLeft, ChevronRight, HatGlasses, Bot } from 'lucide-react'
import { InfoPanel, ExportPanel, ContributorsPanel, AskAIPanel, PrintPanel, DocumentStructurePanel } from './panels'

const DOCUMENT_STRUCTURE_TAB = {
  id: 'structure',
  icon: HatGlasses,
  label: 'Document Structure',
  component: DocumentStructurePanel,
}

export const TABS_MAIN = [
  { id: 'info', icon: Info, label: 'Document Info', component: InfoPanel },
  { id: 'export', icon: Download, label: 'Export', component: ExportPanel },
  { id: 'contributors', icon: Users, label: 'Contributors', component: ContributorsPanel },
  { id: 'ask-ai', icon: Bot, label: 'Ask AI', component: AskAIPanel },
  ...(import.meta.env.VITE_APP_ENV !== 'prod' ? [DOCUMENT_STRUCTURE_TAB] : []),
]

export const TAB_PRINT = { id: 'print', icon: Printer, label: 'Print', component: PrintPanel }

/** All tabs in order (main first, print last) for panel lookup. */
export const TABS = [...TABS_MAIN, TAB_PRINT]

export const TAB_STRIP_WIDTH = 56
export const PANEL_WIDTH = 320
export const PANEL_WIDTH_AI = 420

export function PagePropertiesTabStrip({
  activeTabId,
  onTabChange,
  collapsed,
  onCollapsedChange,
  className = '',
}) {
  const renderTabButton = (tab) => {
    const Icon = tab.icon
    const isActive = !collapsed && activeTabId === tab.id
    const isAskAI = tab.id === 'ask-ai'
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => {
          if (!collapsed && activeTabId === tab.id) {
            onCollapsedChange(true)
          } else {
            onTabChange(tab.id)
            if (collapsed) onCollapsedChange(false)
          }
        }}
        title={tab.label}
        className={`p-2.5 rounded-xl transition-colors ${
          isActive
            ? isAskAI
              ? 'text-white shadow-md'
              : 'bg-blue-100 text-blue-700'
            : 'text-slate-500 hover:bg-slate-200/80 hover:text-slate-900 cursor-pointer'
        }`}
        style={
          isActive && isAskAI
            ? {
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
              }
            : undefined
        }
      >
        <Icon className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div
      className={`flex h-full min-h-0 flex-col items-center py-3 gap-1 shrink-0 bg-white border-l border-slate-200 ${className}`}
      style={{ width: TAB_STRIP_WIDTH }}
    >
      <button
        type="button"
        onClick={() => onCollapsedChange(!collapsed)}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-200/80 hover:text-slate-700 transition-colors mb-1 shrink-0"
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto flex flex-col items-center gap-1 w-full">
        {TABS_MAIN.map(renderTabButton)}
        <div className="min-h-0 flex-1 w-full" aria-hidden />
        {renderTabButton(TAB_PRINT)}
      </div>
    </div>
  )
}

export function PagePropertiesSidebar({
  documentId,
  activeTabId,
  onTabChange,
  collapsed,
  onCollapsedChange,
  className = '',
}) {
  const activeTab = TABS.find((t) => t.id === activeTabId) ?? TABS[0]
  const ActivePanel = activeTab.component

  return (
    <div
      className={`flex border-l border-slate-200 bg-white h-full min-h-0 shrink-0 overflow-hidden ${className}`}
      style={{ width: collapsed ? TAB_STRIP_WIDTH : TAB_STRIP_WIDTH + PANEL_WIDTH }}
    >
      {/* Scrollable panel content only (header is in Document for alignment) */}
      {!collapsed && (
        <div
          className="flex flex-col min-w-0 border-r border-slate-200 bg-white h-full min-h-0 overflow-hidden"
          style={{ width: PANEL_WIDTH }}
        >
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ActivePanel documentId={documentId} />
          </div>
        </div>
      )}

      <PagePropertiesTabStrip
        activeTabId={activeTabId}
        onTabChange={onTabChange}
        collapsed={collapsed}
        onCollapsedChange={onCollapsedChange}
      />
    </div>
  )
}
