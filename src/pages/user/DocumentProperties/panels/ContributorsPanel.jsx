import { UserPlus, User } from 'lucide-react'

export function ContributorsPanel() {
  return (
    <div className="p-4 space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 bg-slate-50">
          <div className="w-8 h-8 rounded-full bg-slate-300 shrink-0 flex items-center justify-center">
            <User className="w-4 h-4 text-slate-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 truncate">You</p>
            <p className="text-xs text-slate-500 truncate">Owner</p>
          </div>
        </div>
      </div>
      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
      >
        <UserPlus className="w-4 h-4" />
        Invite contributor
      </button>
    </div>
  )
}
