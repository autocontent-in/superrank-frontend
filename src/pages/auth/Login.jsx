import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { AuthPageShell } from './AuthPageShell'

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
    'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 hover:border-slate-300'

  return (
    <AuthPageShell>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.65rem] sm:leading-snug">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          Enter your credentials to access your account.
        </p>
      </div>

      <form onSubmit={formik.handleSubmit} className="mt-8 space-y-5">
        {submitError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50/90 px-3.5 py-2.5 text-left text-sm text-red-800"
          >
            {submitError}
          </div>
        )}

        <div>
          <label
            htmlFor="emailOrUsername"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Email or username
          </label>
          <input
            id="emailOrUsername"
            type="text"
            placeholder="Email or username"
            autoComplete="username"
            className={inputBase}
            {...formik.getFieldProps('emailOrUsername')}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-primary underline-offset-2 hover:text-primary-hover hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••••••"
              autoComplete="current-password"
              className={`${inputBase} pr-11`}
              {...formik.getFieldProps('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
            {...formik.getFieldProps('remember')}
          />
          <span className="text-sm text-slate-600">Keep me signed in</span>
        </label>

        <button
          type="submit"
          disabled={formik.isSubmitting}
          className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-[background-color,box-shadow] hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {formik.isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        Don&apos;t have an account?{' '}
        <Link
          to="/signup"
          className="font-semibold text-primary underline-offset-2 hover:text-primary-hover hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthPageShell>
  )
}
