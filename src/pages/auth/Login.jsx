import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import superrankLogo from '../../assets/superrank_logo.png'
import { useState, useEffect } from 'react'

const appName = import.meta.env.VITE_APP_NAME ?? 'SuperRank'

const validationSchema = Yup.object({
  emailOrUsername: Yup.string()
    .required('Email or username is required')
    .trim()
    .min(3, 'Email or username must be more than 2 characters')
    .test('no-spaces', 'No spaces allowed', (v) => !v || !v.trim().includes(' ')),
  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters'),
})

const initialValues = {
  emailOrUsername: '',
  password: '',
  remember: false,
}

function InsightCard({ children }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1e2a3a] p-3 sm:p-3.5">
      {children}
    </div>
  )
}

const RING_R = 15.5
const RING_C = 2 * Math.PI * RING_R

function LoginInsightPanel() {
  return (
    <div
      className="relative m-2 flex flex-1 flex-col overflow-hidden rounded-2xl bg-[#161d2a] lg:m-3 lg:rounded-3xl"
      aria-hidden="true"
    >
      {/* Top fade — percentage height so it scales on all screens */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20"
        style={{
          height: '30%',
          background: 'linear-gradient(to bottom, #161d2a 0%, #161d2a 30%, rgba(22,29,42,0.95) 50%, rgba(22,29,42,0.7) 65%, rgba(22,29,42,0.3) 82%, rgba(22,29,42,0) 100%)',
        }}
      />

      {/* Cards area — vertically centered, clipped by overflow-hidden on parent */}
      <div className="relative z-10 flex flex-1 items-center overflow-hidden">
        <div className="-mt-16 w-full px-4 sm:-mt-20 sm:px-5 md:px-6">
          <div className="mx-auto grid max-w-md grid-cols-2 gap-3 sm:gap-4">
            {/* Left column */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">Sales Revenue</p>
                <p className="mt-1 text-xl font-bold text-white">$5,832</p>
                <p className="text-[9px] text-slate-500">Your revenue decreased this month by about $421</p>
                <div className="mt-2 flex h-14 items-end gap-0.5">
                  {[40, 65, 45, 80, 55, 90, 70, 60].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-slate-500" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </InsightCard>
              <InsightCard>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-400 sm:text-xs">Closed Won by Type</p>
                  <span className="text-slate-500">&rsaquo;</span>
                </div>
                <p className="mt-1 text-xl font-bold text-white">$11,680</p>
                <p className="text-[9px] text-slate-500">this month&apos;s total closed won increased from last month&apos;s around <span className="text-emerald-400">+$6,450</span></p>
                <div className="mt-3 flex h-20 items-end gap-0.5">
                  {[35, 50, 42, 68, 55, 72, 48, 85, 60, 78, 52, 88].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-amber-500/90" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </InsightCard>
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">Task Completion Rate</p>
                <p className="mt-1 text-2xl font-bold text-white">92%<span className="ml-1.5 text-xs font-normal text-slate-500">↑ 21%</span></p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
                  <div className="h-full w-[92%] rounded-full bg-sky-500" />
                </div>
                <div className="mt-2.5 flex -space-x-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-6 w-6 rounded-full border-2 border-[#1e2a3a] bg-slate-500" />
                  ))}
                </div>
              </InsightCard>
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">Avg Deal Size</p>
                <p className="mt-1 text-xl font-bold text-white">$2,340</p>
                <p className="text-[9px] text-emerald-400">↑ 8.5% vs last quarter</p>
                <div className="mt-2 flex h-12 items-end gap-0.5">
                  {[50, 62, 55, 74, 68, 80, 72, 86].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-indigo-400/80" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </InsightCard>
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">Active Users</p>
                <p className="mt-1 text-xl font-bold text-white">12,847</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
                  <div className="h-full w-[78%] rounded-full bg-emerald-500" />
                </div>
                <p className="mt-1.5 text-[9px] text-slate-500">78% of monthly target</p>
              </InsightCard>
            </div>
            {/* Right column — offset down for ladder */}
            <div className="flex flex-col gap-3 pt-10 sm:gap-4 sm:pt-14">
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">Sales Target</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative h-16 w-16 shrink-0">
                    <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r={RING_R} fill="none" className="stroke-slate-700" strokeWidth="3" />
                      <circle cx="18" cy="18" r={RING_R} fill="none" className="stroke-sky-400" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${0.8 * RING_C} ${RING_C}`} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">80%</span>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">3,415 <span className="text-xs font-normal text-slate-500">/ 4,000</span></p>
                    <p className="text-[9px] text-slate-500">Way to go! 20% of your sales target will be achieved.</p>
                  </div>
                </div>
              </InsightCard>
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">Customer Segmentation</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative h-16 w-16 shrink-0">
                    <svg viewBox="0 0 36 36" className="h-16 w-16">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#6366f1" strokeWidth="7" strokeDasharray="25 63" strokeDashoffset="0" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#38bdf8" strokeWidth="7" strokeDasharray="20 68" strokeDashoffset="-25" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#a78bfa" strokeWidth="7" strokeDasharray="43 45" strokeDashoffset="-45" />
                    </svg>
                    <span className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[8px] text-slate-400">Total</span>
                      <span className="text-xs font-bold text-white">2,758</span>
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500" />Small Business <span className="ml-auto font-medium text-white">1,650</span></div>
                    <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-400" />Enterprise <span className="ml-auto font-medium text-white">350</span></div>
                    <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-400" />Individuals <span className="ml-auto font-medium text-white">458</span></div>
                  </div>
                </div>
                <button className="mt-3 w-full rounded-lg border border-white/10 py-1.5 text-[10px] font-medium text-slate-300 hover:bg-white/5">More details</button>
              </InsightCard>
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">Conversion Rates</p>
                <div className="mt-2 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[10px]"><span className="text-slate-400">75.3% <span className="text-slate-500">↑ 3,438</span></span><span className="text-slate-500">12,886 Pulse</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-700"><div className="h-full w-[75.3%] rounded-full bg-sky-500" /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px]"><span className="text-slate-400">24.7% <span className="text-slate-500">↑ 711</span></span><span className="text-slate-500">1,421 Product Sales</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-700"><div className="h-full w-[24.7%] rounded-full bg-slate-500" /></div>
                  </div>
                </div>
              </InsightCard>
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">Response Time</p>
                <p className="mt-1 text-xl font-bold text-white">1.4s</p>
                <p className="text-[9px] text-emerald-400">↓ 23% improvement</p>
                <div className="mt-2 flex h-12 items-end gap-0.5">
                  {[82, 70, 65, 58, 52, 45, 40, 35].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-teal-500/80" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </InsightCard>
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">NPS Score</p>
                <p className="mt-1 text-2xl font-bold text-white">72</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
                  <div className="h-full w-[72%] rounded-full bg-amber-500" />
                </div>
                <p className="mt-1.5 text-[9px] text-slate-500">Great — above industry avg</p>
              </InsightCard>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade — percentage height so it scales on all screens */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
        style={{
          height: '30%',
          background: 'linear-gradient(to top, #161d2a 0%, #161d2a 30%, rgba(22,29,42,0.95) 50%, rgba(22,29,42,0.7) 65%, rgba(22,29,42,0.3) 82%, rgba(22,29,42,0) 100%)',
        }}
      />
    </div>
  )
}

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [submitError, setSubmitError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  const from = (location.state?.from?.pathname) || '/home'

  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit: async (values) => {
      setSubmitError(null)
      try {
        const result = await login(
          {
            emailOrUsername: values.emailOrUsername.trim(),
            password: values.password,
          },
          values.remember
        )
        if (result?.success) {
          navigate(from, { replace: true })
          return
        }
        setSubmitError(result?.message || 'Login failed.')
      } catch (err) {
        const status = err.response?.status
        setSubmitError(
          status >= 400 && status < 500
            ? 'Wrong Credentials!'
            : err.response?.data?.message || err.message || 'Something went wrong.'
        )
      }
    },
  })

  useEffect(() => {
    if (formik.submitCount > 0 && Object.keys(formik.errors).length > 0) {
      setSubmitError('Wrong Credentials!')
    }
  }, [formik.submitCount, formik.errors])

  const inputBase =
    'w-full rounded-[10px] border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 text-sm placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-600'

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-white lg:flex-row">
      {/* Left — form */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 lg:max-w-[50%]">
        <header className="flex shrink-0 items-center space-x-2">
          <img
            src={superrankLogo}
            alt="company-logo"
            className="h-8 w-auto rounded-md"
            aria-hidden
          />
          <span className="text-lg font-bold tracking-tight text-slate-900">
            {appName}
          </span>
        </header>

        <div className="flex min-h-0 w-full max-w-sm flex-1 flex-col justify-center self-center">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Hey, welcome back 👋
            </h1>

          <form onSubmit={formik.handleSubmit} className="mt-10 mb-4 space-y-5">
            {submitError && (
              <div
                role="alert"
                className="rounded-[10px] bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2 text-center"
              >
                {submitError}
              </div>
            )}

            <div>
              <label
                htmlFor="emailOrUsername"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Email
              </label>
              <input
                id="emailOrUsername"
                type="text"
                placeholder="Enter your email or username"
                autoComplete="username"
                className={inputBase}
                {...formik.getFieldProps('emailOrUsername')}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={`${inputBase} pr-11`}
                  {...formik.getFieldProps('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  {...formik.getFieldProps('remember')}
                />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
              >
                Forgot password
              </Link>
            </div>

            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="w-full rounded-[10px] bg-blue-600 text-white px-5 py-3 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formik.isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600 py-4">
            Don&apos;t have an account?{' '}
            <Link
              to="/signup"
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline underline-offset-2"
            >
              Register
            </Link>
          </p>
        </div>

        <footer className="mt-auto flex w-full shrink-0 flex-col text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {appName}. All rights reserved.
          </p>
          <div className="flex items-center space-x-3">
            <a
              href="#"
              className="hover:text-blue-600 transition-colors"
            >
              Privacy Policy
            </a>
            <span
              className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300"
              aria-hidden="true"
            />
            <a
              href="#"
              className="hover:text-blue-600 transition-colors"
            >
              Terms &amp; Conditions
            </a>
          </div>
        </footer>
      </div>

      {/* Right — insight cards */}
      <div className="hidden min-h-0 flex-1 flex-col lg:flex lg:max-w-[50%]">
        <LoginInsightPanel />
      </div>
    </div>
  )
}
