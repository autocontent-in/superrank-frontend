import { Link, useNavigate } from 'react-router-dom'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useState } from 'react'
import { AuthPageShell } from './AuthPageShell'

const validationSchema = Yup.object({
  first_name: Yup.string().required('First name is required').trim(),
  last_name: Yup.string().required('Last name is required').trim(),
  email: Yup.string().email('Invalid email').required('Email is required').trim(),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
})

const initialValues = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
}

export function Signup() {
  const navigate = useNavigate()
  const { register: doRegister } = useAuth()
  const [submitError, setSubmitError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit: async (values) => {
      setSubmitError(null)
      try {
        const payload = {
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
          role: 'customer',
        }
        const data = await doRegister(payload)
        if (data?.status === 'success') {
          navigate('/signup/success', { state: { fromSignup: true } })
          return
        }
        setSubmitError(data?.message || 'Registration failed.')
      } catch (err) {
        const res = err.response
        const status = res?.status
        if (status >= 400 && status < 500) {
          setSubmitError('Wrong Credentials!')
          return
        }
        const data = res?.data
        setSubmitError(data?.message || err.message || 'Something went wrong.')
      }
    },
  })

  const inputBase =
    'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 hover:border-slate-300'

  return (
    <AuthPageShell>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.65rem] sm:leading-snug">
          Create an account
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          Fill in your details to get started.
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="first_name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              First name
            </label>
            <input
              id="first_name"
              type="text"
              placeholder="Jane"
              autoComplete="given-name"
              className={inputBase}
              {...formik.getFieldProps('first_name')}
            />
            {formik.touched.first_name && formik.errors.first_name && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.first_name}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="last_name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Last name
            </label>
            <input
              id="last_name"
              type="text"
              placeholder="Doe"
              autoComplete="family-name"
              className={inputBase}
              {...formik.getFieldProps('last_name')}
            />
            {formik.touched.last_name && formik.errors.last_name && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.last_name}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            className={inputBase}
            {...formik.getFieldProps('email')}
          />
          {formik.touched.email && formik.errors.email && (
            <p className="mt-1 text-sm text-red-600">{formik.errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••••••"
              autoComplete="new-password"
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
          {formik.touched.password && formik.errors.password && (
            <p className="mt-1 text-sm text-red-600">{formik.errors.password}</p>
          )}
        </div>

        <div className="border-t border-slate-200/90 pt-5">
          <p className="text-sm leading-relaxed text-slate-600">
            By creating an account, you agree to our{' '}
            <Link
              to="/terms"
              className="font-medium text-primary underline-offset-2 hover:text-primary-hover hover:underline"
            >
              Terms and Conditions
            </Link>{' '}
            and{' '}
            <Link
              to="/privacy"
              className="font-medium text-primary underline-offset-2 hover:text-primary-hover hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <button
          type="submit"
          disabled={formik.isSubmitting}
          className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-[background-color,box-shadow] hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {formik.isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-primary underline-offset-2 hover:text-primary-hover hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthPageShell>
  )
}
