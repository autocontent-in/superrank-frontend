import { Outlet } from 'react-router-dom'

export function UserLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 bg-gradient-to-b from-blue-50/60 to-slate-50">
      <main className="flex-1 flex flex-col justify-center">
        <div className="-translate-y-[8%]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
