import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import superrankLogo from '../../assets/superrank_logo.png'
import { useState, useEffect } from 'react'

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
          status >= 400 && status < 500 ? 'Wrong Credentials!' : (err.response?.data?.message || err.message || 'Something went wrong.')
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
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

  return (
    <div className="w-full max-w-[420px]">
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
        <div className="flex flex-col items-center mb-6">
          <img
            src={superrankLogo}
            alt={import.meta.env.VITE_APP_NAME ?? 'Superrank'}
            className="h-12 w-auto max-w-[200px] object-contain rounded-lg mb-4"
          />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Hey, welcome back 👋
          </h1>
        </div>

        <form onSubmit={formik.handleSubmit} className="space-y-5">
          {submitError && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2 text-center"
            >
              {submitError}
            </div>
          )}

          <div>
            <label
              htmlFor="emailOrUsername"
              className="block text-sm font-medium text-slate-600 mb-1.5"
            >
              Email or username
            </label>
            <input
              id="emailOrUsername"
              type="text"
              placeholder="email or username"
              autoComplete="username"
              className={inputBase}
              {...formik.getFieldProps('emailOrUsername')}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-600 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••••••"
                autoComplete="current-password"
                className={`${inputBase} pr-10`}
                {...formik.getFieldProps('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex justify-end mt-1">
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center pt-1">
            <label className="flex items-center gap-2 cursor-pointer justify-self-start">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                {...formik.getFieldProps('remember')}
              />
              <span className="text-sm text-slate-600">Remember me</span>
            </label>
            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="w-full rounded-lg bg-blue-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {formik.isSubmitting ? 'Signing you in…' : 'Let me in'}
            </button>
          </div>

        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        Don&apos;t have an account?{' '}
        <Link
          to="/signup"
          className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          Create one
        </Link>
      </p>
    </div>
  )
}
