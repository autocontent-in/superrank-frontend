import { useState, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSnackbar } from '../../components/ui/SnackbarProvider'
import AiApi from '../../api/AiApi'

export function FriendlinessAndResponsiveness() {
  const { user } = useAuth()
  const { showSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)

  const company_website = useMemo(() => {
    const company = user?.default_company
    const raw = (company?.website || company?.company_website || '').trim()
    const domain = raw.replace(/^https?:\/\//, '').replace(/\/$/, '') || ''
    const websiteDisplay = company?.website || company?.company_website || (domain ? `https://${domain}` : '')
    if (websiteDisplay?.startsWith('http')) return websiteDisplay.replace(/\/$/, '')
    return domain ? `https://${domain}` : ''
  }, [user?.default_company])

  const handleCheck = async () => {
    if (!company_website) {
      showSnackbar({
        message: 'No company website set. Add a website in your business profile first.',
        variant: 'error',
        duration: 4000,
      })
      return
    }
    setLoading(true)
    setError(null)
    setResponse(null)
    try {
      const { data } = await AiApi.post('/api/v1/responsive-check', { data: { url: company_website } })
      setResponse(data)
    } catch (err) {
      const message =
        err.response?.data?.detail?.message ?? err.response?.data?.message ?? err.message ?? 'Request failed.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const responseText =
    response === null || response === undefined
      ? ''
      : typeof response === 'string'
        ? response
        : JSON.stringify(response, null, 2)

  return (
    <div className="px-4 pt-6 pb-12 sm:pt-6 sm:pb-16 w-full min-h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-xl font-semibold text-slate-800 mb-2">Friendliness and Responsiveness</h1>
        {company_website ? (
          <p className="text-sm text-slate-600 mb-6 break-all">
            Company URL: <span className="font-medium text-slate-800">{company_website}</span>
          </p>
        ) : (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-6">
            No company website on file. Set it in Business Profile to run this check.
          </p>
        )}

        <button
          type="button"
          onClick={handleCheck}
          disabled={loading || !company_website}
          className="rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Checking…' : 'Check responsiveness'}
        </button>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {responseText !== '' && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Response</h2>
            <pre className="text-xs sm:text-sm bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-words">
              {responseText}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
