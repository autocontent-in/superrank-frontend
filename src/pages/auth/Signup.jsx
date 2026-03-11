import { Link, useNavigate } from 'react-router-dom'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Eye, EyeOff, BookOpen } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useState } from 'react'

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
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

  return (
    <div className="w-full max-w-[420px]">
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
            <BookOpen className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Create an account
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="first_name"
                className="block text-sm font-medium text-slate-600 mb-1.5"
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
                <p className="mt-1 text-sm text-red-600">
                  {formik.errors.first_name}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="last_name"
                className="block text-sm font-medium text-slate-600 mb-1.5"
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
                <p className="mt-1 text-sm text-red-600">
                  {formik.errors.last_name}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-600 mb-1.5"
            >
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
                placeholder="••••••••"
                autoComplete="new-password"
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
            {formik.touched.password && formik.errors.password && (
              <p className="mt-1 text-sm text-red-600">
                {formik.errors.password}
              </p>
            )}
          </div>

          <div className="border-y border-dashed border-gray-300 mt-4 mb-8 py-3">
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              By creating an account, you agree to our <Link to="/terms" className="text-blue-600 hover:text-blue-700 transition-colors underline decoration-dashed decoration-blue-400 underline-offset-4"> Terms and Conditions </Link> and <Link to="/privacy" className="text-blue-600 hover:text-blue-700 transition-colors underline decoration-dashed decoration-blue-400 underline-offset-4">Privacy Policy</Link>.
            </p>
          </div>

          <button
            type="submit"
            disabled={formik.isSubmitting}
            className="w-full rounded-lg bg-blue-600 text-white px-4 py-3 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {formik.isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          Log in
        </Link>
      </p>
    </div>
  )
}
