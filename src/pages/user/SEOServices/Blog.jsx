import { useLocation } from 'react-router-dom'

export function Blog() {
  const location = useLocation()
  const ctx = location.state?.blogCreateContext

  return (
    <>
      <h1 className="pt-6 text-2xl font-semibold text-slate-900">Create Blog</h1>

      {ctx ? (
        <p className="mt-2 text-sm text-slate-600">
          Context from your business profile and competitors is ready for the editor (coming soon).
        </p>
      ) : null}

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
        Blog editor coming soon.
      </div>
    </>
  )
}

