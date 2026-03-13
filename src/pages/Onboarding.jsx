import { useState, useEffect, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Globe, Search, Plus, Loader2, Check, LogOut, ChevronDown, ChevronLeft, ChevronRight, Trash2, Building } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Api from '../api/api'
import AiApi from '../api/AiApi'
import { UserAvatar } from '../components/UserAvatar'
import { SmartModal } from '../components/ui/SmartModal'

const BRAND_NAME = import.meta.env.VITE_APP_NAME ?? 'AutoContent'

function getLogoUrl(name) {
  const token = import.meta.env.VITE_LOGO_DEV_PUBLIC_KEY
  if (token && name) return `https://img.logo.dev/name/${encodeURIComponent(name)}?token=${token}`
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name ?? '')}&background=6366f1&color=fff&size=80`
}

function CompetitorCard({ competitor, isYourCompany, onRemove }) {
  return (
    <div
      className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors group ${isYourCompany
        ? 'border-blue-300 bg-blue-50/50'
        : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
    >
      <img
        src={competitor.logo}
        alt={`${competitor.name} logo`}
        className="h-16 w-16 rounded-lg object-cover bg-slate-100"
      />
      <div className="mt-2 w-full text-center">
        <a href={competitor.website} className="font-medium text-gray-600 text-xs block underline-offset-4 decoration-gray-500 group-hover:underline group-hover:text-gray-900 group-hover:decoration-dashed" target="_blank" rel="noopener noreferrer" title={competitor.name}>{competitor.name}</a>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(competitor)}
          className="absolute top-1 right-1 rounded-md bg-white border border-slate-200 p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 opacity-0 transition-opacity"
          aria-label={`Remove ${competitor.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {isYourCompany && (
        <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          You
        </span>
      )}
    </div>
  )
}

function OnboardingNavbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handleClickOutside = (e) => {
      if (dropdownRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return
      setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  const handleLogout = () => {
    setDropdownOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-20">
      <div className="w-full max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="font-semibold text-slate-900 text-lg">{BRAND_NAME}</span>
        <div className="relative" ref={triggerRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 backdrop-blur-sm px-2 py-1.5 hover:bg-slate-50 transition-colors"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <UserAvatar user={user} className="w-8 h-8" />
            <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div
              ref={dropdownRef}
              className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-slate-200 bg-white shadow-lg py-1 z-50"
            >
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md text-left font-medium"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export function Onboarding() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [step, setStep] = useState(1)
  const [companyName, setCompanyName] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [user_website_metadata, setUserWebsiteMetadata] = useState(null)
  const [competitors, setCompetitors] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [searchingCompetitors, setSearchingCompetitors] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState(null)
  const [addCompanyModalOpen, setAddCompanyModalOpen] = useState(false)
  const [addCompanyName, setAddCompanyName] = useState('')
  const [addCompanyWebsite, setAddCompanyWebsite] = useState('')
  const [competitorToRemove, setCompetitorToRemove] = useState(null)
  const handleStep1Next = () => {
    const website = companyWebsite.trim() || ''
    setAnalyzing(true)
    setError(null)
    AiApi.post('/api/v1/analyze-website', { data: { website } })
      .then((res) => {
        setUserWebsiteMetadata(res.data)
        setStep(2)
        searchCompetitors()
      })
      .catch((err) => {
        setError(err.response?.data?.detail?.message || 'Failed to fetch your website')
      })
      .finally(() => setAnalyzing(false))
  }

  const searchCompetitors = () => {
    const website = companyWebsite.trim() || ''
    setSearchingCompetitors(true)
    setError(null)
    AiApi.post('/api/v1/find-competitors', { data: { website } })
      .then((res) => {
        const competitors = (res.data ?? []).map((c, index) => {
          const name = c.name?.trim() || 'Unknown'
          return {
            id: c.id ?? `company-${name}-${index}`,
            name: name.trim(),
            website: c.website?.trim() || '-',
            logo: getLogoUrl(name),
          }
        })
        setCompetitors(competitors)
      })
      .catch((err) => {
        setError(err.response?.data?.message ?? err.message ?? 'Failed to find competitors')
        setCompetitors([])
      })
      .finally(() => setSearchingCompetitors(false))
  }

  const removeCompetitor = (id) => {
    setCompetitors((prev) => prev.filter((c) => c.id !== id))
  }

  const requestRemoveCompetitor = (competitor) => {
    setCompetitorToRemove(competitor)
  }

  const confirmRemoveCompetitor = (e) => {
    e?.preventDefault()
    if (competitorToRemove) {
      const id = competitorToRemove.id
      setCompetitorToRemove(null)
      removeCompetitor(id)
    }
  }

  const cancelRemoveCompetitor = () => {
    setCompetitorToRemove(null)
  }

  const openAddCompanyModal = () => {
    setAddCompanyName('')
    setAddCompanyWebsite('')
    setAddCompanyModalOpen(true)
  }

  const closeAddCompanyModal = () => {
    setAddCompanyModalOpen(false)
    setAddCompanyName('')
    setAddCompanyWebsite('')
  }

  const handleAddCompanyFromModal = () => {
    const name = addCompanyName.trim()
    if (!name) return
    const website = addCompanyWebsite.trim() || '-'
    const logo = getLogoUrl(name)
    setCompetitors((prev) => [
      ...prev,
      { id: `add-${Date.now()}`, name, website, logo },
    ])
    closeAddCompanyModal()
  }

  const completeOnboarding = async () => {
    setError(null)
    setCompleting(true)

    const companyPayload = {
      data: {
        name: companyName.trim(),
        website: companyWebsite.trim() || null,
        metadata: user_website_metadata,
      }
    };

    let userCompanyId = null;

    await Api.post('/companies', companyPayload).then((response) => {
      const createCompanyResponse = response.data.data;

      userCompanyId = createCompanyResponse.id;

      for (const competitor of competitors) {
        const competitorPayload = {
          data: {
            user_company_id: userCompanyId,
            name: competitor.name,
            website: competitor.website,
            metadata: competitor.metadata,
          }
        }

        Api.post('/competitor-companies', competitorPayload).then((response) => {
          const createCompetitorResponse = response.data.data;
        }).catch((err) => {
          setError(err.response?.data?.message || err.message || 'Failed to create competitor')
        })
      }
      setCompleting(false)
    }).catch((err) => {
      setError(err.response?.data?.message || err.message || 'Failed to complete onboarding')
      setCompleting(false)
    });

    const onboardingPayload = {
      data: {
        is_onboarding_complete: true,
        user_company_id: userCompanyId,
      }
    };

    Api.patch('/onboarding', onboardingPayload).then(async () => {
      await refreshUser();
      navigate('/home', { replace: true });
    }).catch((err) => {
      setError(err.response?.data?.message || err.message || 'Failed to update onboarding')
      setCompleting(false)
    })
  }

  const canGoNextStep1 = step === 1 && companyName.trim().length > 0

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-white" />
        <div
          className="absolute -top-1/4 -left-1/4 w-[80%] h-[80%] rounded-full bg-linear-to-br from-blue-100/80 via-sky-100/60 to-indigo-100/50 opacity-90"
          style={{ filter: 'blur(80px)' }}
        />
        <div
          className="absolute top-1/2 -right-1/4 w-[60%] h-[60%] rounded-full bg-linear-to-bl from-slate-100/70 to-blue-50/60 opacity-80"
          style={{ filter: 'blur(80px)' }}
        />
      </div>

      <OnboardingNavbar />

      <main className="flex-1 flex flex-col justify-center relative z-10 py-12">
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            {step === 1 && (
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 pt-6 pb-8 px-6 max-w-md mx-auto space-y-5">
                <div>
                  <p className="text-sm text-slate-600 mb-10">Before we jump in, let's find out who else is in this business. Enter your company name and website below to get started.</p>
                  <label htmlFor="companyName" className="block text-sm font-medium text-slate-600 mb-1.5">
                    Company name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="companyName"
                      type="text"
                      placeholder="Microsoft"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder-slate-400 transition-colors hover:border-slate-400 focus:outline-none focus:border-blue-500 pl-9"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="companyWebsite" className="block text-sm font-medium text-slate-600 mb-1.5">
                    Company website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="companyWebsite"
                      type="url"
                      placeholder="https://yourcompany.com"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder-slate-400 transition-colors hover:border-slate-400 focus:outline-none focus:border-blue-500 pl-9"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                    />
                  </div>
                </div>
                {error && step === 1 && (
                  <div
                    role="alert"
                    className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2 text-center"
                  >
                    {error}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-400 cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={handleStep1Next}
                    disabled={!canGoNextStep1 || analyzing}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing....
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 pt-6 pb-8 px-6 max-w-4xl mx-auto space-y-5">
                {companyName.trim() && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-4">
                      <img
                        src={getLogoUrl(companyName.trim())}
                        alt={`${companyName.trim()} logo`}
                        className="h-12 w-12 shrink-0 rounded-lg object-cover bg-slate-100"
                      />
                      <div className="min-w-0">
                        <h3 className="text-xl font-semibold text-slate-700">{companyName.trim()}</h3>
                        <p className="text-sm text-slate-500">{companyWebsite.trim() || '—'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={openAddCompanyModal}
                      disabled={searchingCompetitors}
                      className="shrink-0 flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-300"
                      aria-label="Add company"
                    >
                      <Plus className="h-4 w-4" />
                      Add company
                    </button>
                  </div>
                )}

                <hr className="border-slate-200" />

                {searchingCompetitors ? (
                  <div className="flex flex-col items-center justify-center pt-16 pb-18 text-slate-500">
                    <Search className="w-10 h-10 text-gray-600 mb-3 animate-pulse" />
                    <p className="text-sm font-medium">Please wait... while we analyze your market</p>
                  </div>
                ) : (
                  <>
                    {competitors.length === 0 ? (
                      <div className="text-gray-500 py-16 px-10">
                        <p className="font-normal text-base text-center">
                          Unable to fetch competitors.
                        </p>
                        <div className="flex justify-center mt-4">
                          <button type="button" onClick={openAddCompanyModal} className="flex items-center space-x-2  justify-center rounded-lg border border-slate-300 px-4 py-2 text-base font-medium text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-300"><Plus className="w-4 h-4" /> <span>click to add competitors manually</span></button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-5 gap-2">
                        {competitors.map((c) => (
                          <CompetitorCard
                            key={c.id}
                            competitor={c}
                            isYourCompany={c.id === 'your-company'}
                            onRemove={requestRemoveCompetitor}
                          />
                        ))}
                      </div>
                    )}
                    {error && (
                      <div
                        role="alert"
                        className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2 text-center"
                      >
                        {error}
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={completeOnboarding}
                        disabled={completing}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {completing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Completing…
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Finish
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <SmartModal
        open={!!competitorToRemove}
        onClose={cancelRemoveCompetitor}
        showHeader={false}
        size="sm"
        animation="top"
      >
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Remove Competitor
          </h2>
          <p className="my-4 text-sm text-slate-600">
            Are you sure you want to remove "<span className="font-semibold">{competitorToRemove?.name ?? 'this competitor'}</span>" from your competitors list?
          </p>
          <div
            className="mt-6 flex justify-end gap-3"
          >
            <button
              type="button"
              onClick={confirmRemoveCompetitor}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={cancelRemoveCompetitor}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </SmartModal>

      <SmartModal
        open={addCompanyModalOpen}
        onClose={closeAddCompanyModal}
        title="Add Competitor"
        size="sm"
        animation="top"
      >
        <div className="space-y-4 p-5">
          <div>
            <label htmlFor="add-company-name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Company name
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="add-company-name"
                type="text"
                placeholder="e.g. Acme Inc"
                value={addCompanyName}
                onChange={(e) => setAddCompanyName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>
          <div>
            <label htmlFor="add-company-website" className="mb-1.5 block text-sm font-medium text-slate-700">
              Company website
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="add-company-website"
                type="url"
                placeholder="https://example.com"
                value={addCompanyWebsite}
                onChange={(e) => setAddCompanyWebsite(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={closeAddCompanyModal}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddCompanyFromModal}
              disabled={!addCompanyName.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add company
            </button>
          </div>
        </div>
      </SmartModal>
    </div>
  )
}
