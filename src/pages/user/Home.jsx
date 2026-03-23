import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSnackbar } from '../../components/ui/SnackbarProvider'
import AiApi from '../../api/AiApi'
import Api from '../../api/api.jsx'

export function Home() {
  const { user } = useAuth()
  const { showSnackbar, updateSnackbar } = useSnackbar()
  const [seoLoading, setSeoLoading] = useState(false)

  const domain = user?.default_company?.website ?? ''

  const handleCheckSeo = async () => {
    if (!domain?.trim()) {
      showSnackbar({ message: 'No company website set. Add a company with a website first.', variant: 'error', duration: 4000 })
      return
    }
    setSeoLoading(true)
    const toastId = showSnackbar({ message: 'Running SEO audit...', loading: true, duration: 0 })
    try {
      const { data } = await AiApi.post('/api/v1/seo-audit', { data: { domain: domain.trim() } })
      Api.post('/seo-audit/store', { data: { response: data } }).catch(() => {})
      updateSnackbar(toastId, { message: 'SEO audit completed.', variant: 'success', loading: false, duration: 3000 })
    } catch (err) {
      const message = err.response?.data?.detail?.message ?? err.response?.data?.message ?? 'SEO audit failed.'
      updateSnackbar(toastId, { message, variant: 'error', loading: false, duration: 4000 })
    } finally {
      setSeoLoading(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-12 sm:pt-6 sm:pb-16 w-full min-h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={handleCheckSeo}
          disabled={seoLoading || !domain?.trim()}
          className="rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {seoLoading ? 'Checking SEO…' : 'Check SEO'}
        </button>
      </div>
    </div>
  )
}
