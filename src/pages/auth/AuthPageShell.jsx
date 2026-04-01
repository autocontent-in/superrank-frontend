import superrankLogo from '../../assets/superrank_logo.png'
import { AuthInsightPanel } from './AuthInsightPanel'

const appName = import.meta.env.VITE_APP_NAME ?? 'SuperRank'

/**
 * Shared split layout for auth pages: form column + insight panel (lg+).
 */
export function AuthPageShell({ children }) {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-white lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto border-slate-200/80 bg-linear-to-bl from-white via-white to-blue-50 lg:max-w-[60%] lg:border-r">
        <header className="flex shrink-0 items-center gap-3 px-6 py-4 sm:px-8 lg:px-10">
          <img
            src={superrankLogo}
            alt={`${appName} logo`}
            className="h-9 w-auto rounded-lg ring-1 ring-slate-200/80"
          />
          <span className="text-base font-semibold tracking-tight text-slate-900">{appName}</span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col px-6 pb-6 sm:px-8 lg:px-10">
          <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-6 lg:py-10">
            {children}
          </div>
        </div>

        <footer className="mt-auto flex shrink-0 flex-col gap-2 border-t border-slate-200/80 px-6 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p>© {new Date().getFullYear()} {appName}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
            <a href="#" className="transition-colors hover:text-primary">
              Privacy Policy
            </a>
            <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline" aria-hidden />
            <a href="#" className="transition-colors hover:text-primary">
              Terms &amp; Conditions
            </a>
          </div>
        </footer>
      </div>

      <div className="hidden min-h-0 flex-1 flex-col lg:flex lg:max-w-[40%]">
        <AuthInsightPanel />
      </div>
    </div>
  )
}
