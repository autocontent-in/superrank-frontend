import { useState, useEffect } from 'react'
import { Pencil } from 'lucide-react'
import Api from '../../../api/api'
import { useAuth } from '../../../contexts/AuthContext'
import { UserAvatar } from '../../../components/UserAvatar'

export function MyProfile() {
  const { user, refreshUser } = useAuth()
  const [isEditingPersonalInfo, setIsEditingPersonalInfo] = useState(false)
  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName] = useState(user?.last_name ?? '')
  const [isEditingContactInfo, setIsEditingContactInfo] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user && !isEditingPersonalInfo) {
      setFirstName(user.first_name ?? '')
      setLastName(user.last_name ?? '')
    }
  }, [user, isEditingPersonalInfo])

  useEffect(() => {
    if (user && !isEditingContactInfo) {
      setPhoneNumber(user.phone_number ?? '')
      setEmail(user.email ?? '')
    }
  }, [user, isEditingContactInfo])

  const displayName = user?.full_name || (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}`.trim() : null) || user?.email || 'User'

  const handleStartEdit = () => {
    setFirstName(user?.first_name ?? '')
    setLastName(user?.last_name ?? '')
    setIsEditingPersonalInfo(true)
  }

  const handleUpdate = async () => {
    setIsSubmitting(true)
    try {
      await Api.patch('/profile', { data: { first_name: firstName, last_name: lastName } })
      await refreshUser()
      setIsEditingPersonalInfo(false)
    } catch (err) {
      // TODO: surface error to user
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStartEditContactInfo = () => {
    setPhoneNumber(user?.phone_number ?? '')
    setEmail(user?.email ?? '')
    setIsEditingContactInfo(true)
  }

  const handleUpdateContactInfo = async () => {
    setIsSubmitting(true)
    try {
      await Api.patch('/profile', { data: { phone_number: phoneNumber, email } })
      await refreshUser()
      setIsEditingContactInfo(false)
    } catch (err) {
      // TODO: surface error to user
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-12 sm:pt-4 sm:pb-16 w-full min-h-full">
      <div className="max-w-xl">
        <div className="flex items-center space-x-4">
          <UserAvatar user={user} className="w-16 h-16 text-xl" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 truncate">{displayName}</h2>
            <p className="text-sm text-slate-600 truncate">{user?.email}</p>
          </div>
        </div>

        <hr className="my-6 border-dashed border-slate-300" />

        <div className="flex items-center justify-between">
          <h3 className="text-md font-bold text-slate-900">Personal Information</h3>
          {!isEditingPersonalInfo && (
            <button
              type="button"
              onClick={handleStartEdit}
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Edit personal information"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-1/2">
            <label className="text-sm text-gray-500">First name</label>
            {isEditingPersonalInfo ? (
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            ) : (
              <dd className="mt-1 text-base text-slate-800">{user?.first_name}</dd>
            )}
          </div>
          <div className="w-full sm:w-1/2">
            <label className="text-sm text-gray-500">Last name</label>
            {isEditingPersonalInfo ? (
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            ) : (
              <dd className="mt-1 text-base text-slate-800">{user?.last_name}</dd>
            )}
          </div>
        </div>
        {isEditingPersonalInfo && (
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditingPersonalInfo(false)}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdate}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating…' : 'Update'}
            </button>
          </div>
        )}

        <hr className="my-6 border-dashed border-slate-300" />

        <div className="flex items-center justify-between">
          <h3 className="text-md font-bold text-slate-900">Contact Information</h3>
          {!isEditingContactInfo && (
            <button
              type="button"
              onClick={handleStartEditContactInfo}
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Edit contact information"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="mt-6 flex space-y-4">
          <div className="w-1/2">
            <label className="text-sm text-gray-500">Mobile</label>
            {isEditingContactInfo ? (
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            ) : (
              <dd className={`mt-1 text-base ${user?.phone_number ? 'text-slate-800' : 'text-slate-400'}`}>
                {user?.phone_number || 'Not Available'}
              </dd>
            )}
          </div>
        </div>

        <div className="mt-6 flex space-y-4">
          <div className="w-1/2">
            <label className="text-sm text-gray-500">Email</label>
            {isEditingContactInfo ? (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            ) : (
              <dd className={`mt-1 text-base ${user?.email ? 'text-slate-800' : 'text-slate-400'}`}>
                {user?.email || 'Not Available'}
              </dd>
            )}
          </div>
        </div>
        {isEditingContactInfo && (
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditingContactInfo(false)}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdateContactInfo}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating…' : 'Update'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
