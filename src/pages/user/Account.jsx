import { useState } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { House } from 'lucide-react'
import { MyProfile } from './AccountSettings'

const SIDEBAR_WIDTH = 280

const ACCOUNT_PATH_TO_LABEL = {
  '/settings/account/profile': 'My Profile',
  '/settings/account/preferences': 'Preferences',
}

const settingsNav = [
  {
    label: 'ACCOUNT',
    items: [
      { to: '/settings/account/profile', label: 'My Profile' },
      { to: '/settings/account/preferences', label: 'Preferences' },
    ],
  },
]

function SettingsNavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg text-sm font-medium transition-colors px-3 py-2 ${
          isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'
        }`
      }
    >
      <span className="flex-1 truncate">{label}</span>
    </NavLink>
  )
}

function AccountNavbar() {
  const location = useLocation()
  const currentLabel = ACCOUNT_PATH_TO_LABEL[location.pathname] || 'Settings'

  return (
    <div className="shrink-0 h-14 px-4 border-b border-slate-200 flex items-center gap-4">
      <div className="flex items-center h-9 min-w-0 gap-1.5">
        <Link
          to="/"
          className="flex items-center text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          title="Home"
        >
          <House className="w-4 h-4" />
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-sm font-medium text-slate-600 shrink-0">Settings</span>
        <span className="text-slate-400">/</span>
        <span className="text-sm font-semibold text-slate-800 truncate">{currentLabel}</span>
      </div>
    </div>
  )
}

export function Account() {
  return (
    <div className="flex h-full min-h-0 w-full">
      <aside
        className="shrink-0 flex flex-col bg-white border-r border-slate-200 overflow-hidden"
        style={{ width: SIDEBAR_WIDTH }}
      >
        {/* Header - matches main sidebar header alignment (h-14 px-4) */}
        <div className="shrink-0 h-14 px-4 border-b border-slate-200 flex items-center gap-2">
          <span className="font-semibold text-slate-800 truncate">Settings</span>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto py-4 px-3 flex flex-col">
          <div className="space-y-6">
            {settingsNav.map((section) => (
              <div key={section.label}>
                <h3 className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {section.label}
                </h3>
                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.to}>
                      <SettingsNavItem to={item.to} label={item.label} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      </aside>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-white overflow-hidden">
        <AccountNavbar />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function PlaceholderSection({ title }) {
  return (
    <div className="px-4 py-12 sm:py-16 w-full min-h-full">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-slate-900 mb-8">{title}</h1>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-slate-500 text-sm">
          This section is coming soon.
        </div>
      </div>
    </div>
  )
}

export function AccountProfilePage() {
  return <MyProfile />
}

function PreferenceToggle({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <label className="text-sm text-gray-500">{label}</label>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? 'bg-blue-600' : 'bg-slate-200'
        }`}
      >
        <span
          className={`pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
            checked ? 'left-[calc(100%-1.25rem-2px)]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function PreferenceSelect({ label, value, options, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <label className="text-sm text-gray-500 shrink-0">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[120px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

export function AccountPreferencesPage() {
  const [emailDigest, setEmailDigest] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [autoSave, setAutoSave] = useState(true)
  const [compactView, setCompactView] = useState(false)
  const [language, setLanguage] = useState('en')
  const [editorFontSize, setEditorFontSize] = useState('medium')

  return (
    <div className="px-4 pt-6 pb-12 sm:pt-4 sm:pb-16 w-full min-h-full">
      <div className="max-w-xl">
        <h3 className="text-md font-bold text-slate-900">Notifications</h3>
        <div className="mt-6">
          <PreferenceToggle label="Email digest" checked={emailDigest} onChange={setEmailDigest} />
          <PreferenceToggle label="Push notifications" checked={notifications} onChange={setNotifications} />
        </div>

        <hr className="my-6 border-dashed border-slate-300" />

        <h3 className="text-md font-bold text-slate-900">Appearance</h3>
        <div className="mt-6">
          <PreferenceToggle label="Dark mode" checked={darkMode} onChange={setDarkMode} />
          <PreferenceSelect
            label="Language"
            value={language}
            onChange={setLanguage}
            options={[
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Spanish' },
              { value: 'fr', label: 'French' },
              { value: 'de', label: 'German' },
            ]}
          />
        </div>

        <hr className="my-6 border-dashed border-slate-300" />

        <h3 className="text-md font-bold text-slate-900">Editor</h3>
        <div className="mt-6">
          <PreferenceToggle label="Auto-save" checked={autoSave} onChange={setAutoSave} />
          <PreferenceToggle label="Compact view" checked={compactView} onChange={setCompactView} />
          <PreferenceSelect
            label="Editor font size"
            value={editorFontSize}
            onChange={setEditorFontSize}
            options={[
              { value: 'small', label: 'Small' },
              { value: 'medium', label: 'Medium' },
              { value: 'large', label: 'Large' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
