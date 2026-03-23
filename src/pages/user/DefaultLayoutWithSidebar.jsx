import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { createPortal } from 'react-dom'
import { Outlet, NavLink, Link, useNavigate, useLocation, useParams } from 'react-router-dom'
import {
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Code2,
  PenLine,
  FolderCode,
  House,
  FolderOpen,
  MoreVertical,
  ArrowLeft,
  User,
  HelpCircle,
  Settings,
  LogOut,
  Sparkles,
  BookOpen,
  LifeBuoy,
  Crown,
  FileText,
  Dot,
  Plus,
  FolderPlus,
  Search,
  CornerDownLeft,
  LayoutList,
  Check,
  BarChart2,
  Fish,
  MonitorSmartphone,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Api from '../../api/api'
import { SmartModal } from '../../components/ui/SmartModal'
import { UserAvatar } from '../../components/UserAvatar'
import { useSnackbar, SnackbarMainContentContainer } from '../../components/ui/SnackbarProvider'

const isDev = import.meta.env.VITE_APP_ENV === 'dev'

function getLogoUrl(name) {
  const token = import.meta.env.VITE_LOGO_DEV_PUBLIC_KEY
  if (token && name) return `https://img.logo.dev/name/${encodeURIComponent(name)}?token=${token}`
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name ?? '')}&background=6366f1&color=fff&size=80`
}

const sidebarNav = [
  {
    label: '',
    items: [
      { to: '/', label: 'Home', icon: House, end: true },
      { to: '/seo-analysis', label: 'SEO Analysis', icon: BarChart2 },
      { to: '/friendliness-and-responsiveness', label: 'Friendliness and Responsiveness', icon: MonitorSmartphone },
      { to: '/all-files', label: 'All Files', icon: LayoutList },
      { to: '/groups', label: 'Groups', icon: FolderOpen },
      { to: '/documents', label: 'Documents', icon: FileText },
      { to: '/tinyfish-test', label: 'TinyFish Test', icon: Fish },
      { to: '/business-profile', label: 'Business Profile', icon: BookOpen },
      { to: '/multi-agent-test', label: 'multi agent test', icon: Sparkles },
      ...(isDev ? [{ to: '/ai', label: 'AI', icon: Sparkles }] : []),
    ],
  },
  // {
  //   label: 'Crapbook',
  //   items: [
  //     {
  //       label: 'Editors',
  //       icon: FolderCode,
  //       children: [
  //         { to: '/b2b', label: 'B2B Editor', icon: Code2 },
  //         { to: '/editor', label: 'Editor', icon: PenLine },
  //       ],
  //     },
  //   ],
  // },
]

const SIDEBAR_EXPANDED_WIDTH = 260
const SIDEBAR_COLLAPSED_WIDTH = 64
const S_CB_SB = 's_cb_sb'

function getInitialSidebarExpanded() {
  try {
    const stored = localStorage.getItem(S_CB_SB)
    if (stored === 'true') return false
    if (stored === 'false') return true
  } catch (_) { /* ignore */ }
  return true
}

const bottomMenuItems = [
  { to: '/settings/account', label: 'Settings', icon: Settings, end: false },
]

function UserBlock({ collapsed, isSidebarExpanded, sidebarWidth }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [flyoutPosition, setFlyoutPosition] = useState(null)
  const blockRef = useRef(null)
  const menuRef = useRef(null)

  useLayoutEffect(() => {
    if (menuOpen && !isSidebarExpanded && blockRef.current) {
      const rect = blockRef.current.getBoundingClientRect()
      setFlyoutPosition({ left: rect.right + 6, bottom: window.innerHeight - rect.bottom + 22 })
    } else if (!menuOpen) {
      setFlyoutPosition(null)
    }
  }, [menuOpen, isSidebarExpanded])

  const displayName = user?.full_name || (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}`.trim() : user?.email || 'User')
  const displayEmail = user?.email || ''

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e) => {
      if (menuRef.current?.contains(e.target) || blockRef.current?.contains(e.target)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handleSignOut = () => {
    setMenuOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const toggleMenu = () => setMenuOpen((o) => !o)

  const menuContent = (
    <>
      <div className="flex items-center gap-3 px-3 py-2">
        <UserAvatar user={user} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-800 truncate">{displayName}</p>
          <p className="text-xs text-slate-600 truncate">{displayEmail}</p>
        </div>
      </div>
      <div className="border-t border-slate-200 my-1" role="separator" />
      <div className="px-1">
        <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md text-left">
          <User className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs">Profile</span>
        </button>
        <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg text-left">
          <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs">Help Center</span>
        </button>
        <Link
          to="/settings/account/profile"
          onClick={() => setMenuOpen(false)}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg text-left"
        >
          <Settings className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs">Account Settings</span>
        </Link>
      </div>
      <div className="border-t border-slate-200 my-1" role="separator" />
      <div className="px-1">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg text-left font-medium"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="text-xs">Sign out</span>
        </button>
      </div>
    </>
  )

  return (
    <div className={`shrink-0 border-t border-gray-200 relative ${collapsed ? 'p-1.5' : 'p-2'}`} ref={blockRef}>
      <div
        className={`flex items-center rounded-md bg-gray-200/80 ${collapsed ? 'justify-center p-2' : 'gap-2 px-2 py-2'
          }`}
      >
        {collapsed ? (
          <UserAvatar user={user} asButton onClick={toggleMenu} aria-label="Open user menu" />
        ) : (
          <>
            <UserAvatar user={user} />
            <div className="min-w-0 flex-1 truncate">
              <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
              <p className="text-xs text-slate-600 truncate">{displayEmail}</p>
            </div>
            <button
              type="button"
              onClick={toggleMenu}
              className="shrink-0 p-1 rounded-md text-slate-500 hover:bg-gray-300/80 hover:text-slate-800 transition-colors"
              aria-label="Open user menu"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Menu: no animation; expanded = above block, collapsed = portal to right, bottom-aligned */}
      {menuOpen && isSidebarExpanded && (
        <div
          ref={menuRef}
          className="absolute z-50 w-[calc(100%-1rem)] left-2 right-2 rounded-lg border border-slate-200 bg-white shadow-lg py-1"
          style={{ bottom: '100%', marginBottom: '4px' }}
        >
          {menuContent}
        </div>
      )}

      {menuOpen && !isSidebarExpanded && flyoutPosition && createPortal(
        <div
          ref={menuRef}
          className="fixed z-50 w-56 min-w-48 rounded-lg border border-slate-200 bg-white shadow-lg py-1"
          style={{ left: flyoutPosition.left, bottom: flyoutPosition.bottom }}
        >
          {menuContent}
        </div>,
        document.body
      )}
    </div>
  )
}

function NavItem({ to, label, icon: Icon, collapsed, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-md text-sm font-medium transition-all duration-150 ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
        } ${isActive ? 'bg-blue-100 text-blue-700 [&_svg]:text-blue-600' : 'text-slate-600 hover:bg-gray-200/80 hover:text-slate-900 [&_svg]:text-slate-500 [&:hover_svg]:text-slate-700'}`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
    </NavLink>
  )
}

function NavGroup({ item, collapsed, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const { label, icon: Icon, children: subItems } = item

  if (collapsed) {
    return (
      <ul className="space-y-0.5">
        {subItems.map((sub) => (
          <li key={sub.to}>
            <NavItem to={sub.to} label={sub.label} icon={sub.icon || Icon} collapsed={collapsed} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left"
      >
        <Icon className="w-5 h-5 shrink-0 text-slate-500" />
        <span className="flex-1 truncate">{label}</span>
        <span
          className="shrink-0 flex items-center justify-center transition-transform duration-200 ease-out"
          style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </span>
      </button>
      {isOpen && (
        <ul className="space-y-0.5 pl-3 ml-5 border-l border-slate-200">
          {subItems.map((sub) => (
            <li key={sub.to}>
              <NavItem to={sub.to} label={sub.label} icon={sub.icon || Icon} collapsed={false} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export const DOCUMENT_DELETED_EVENT = 'crapbook:documentDeleted'
export const DOCUMENT_CREATED_EVENT = 'crapbook:documentCreated'
export const DOCUMENT_MODIFIED_EVENT = 'crapbook:documentModified'
export const GROUP_CREATED_EVENT = 'crapbook:groupCreated'
export const GROUP_DELETED_EVENT = 'crapbook:groupDeleted'
export const GROUP_OPEN_CREATE_DOC_MODAL = 'crapbook:groupOpenCreateDocModal'
export const OPEN_CREATE_MODAL = 'crapbook:openCreateModal'
export const GROUP_OPEN_CREATE_GROUP_MODAL = 'crapbook:groupOpenCreateGroupModal'

const MARQUEE_SPEED_PX_PER_SEC = 40

function MarqueeText({ children, className = '', isHovered: isHoveredProp }) {
  const containerRef = useRef(null)
  const textRef = useRef(null)
  const [scrollDistance, setScrollDistance] = useState(0)

  const updateTruncation = useCallback(() => {
    const container = containerRef.current
    const text = textRef.current
    if (!container || !text) return
    const overflow = text.scrollWidth - container.clientWidth
    setScrollDistance(overflow > 0 ? overflow : 0)
  }, [])

  useEffect(() => {
    updateTruncation()
  }, [children, updateTruncation])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(updateTruncation)
    ro.observe(container)
    return () => ro.disconnect()
  }, [updateTruncation])

  const isTruncated = scrollDistance > 0
  const isHovered = isTruncated && isHoveredProp

  return (
    <span
      ref={containerRef}
      className={`block overflow-hidden min-w-0 ${className}`}
    >
      {isHovered ? (
        <span
          ref={textRef}
          className="inline-block whitespace-nowrap"
          style={{
            transition: `transform ${scrollDistance / MARQUEE_SPEED_PX_PER_SEC}s linear`,
            transform: `translateX(-${scrollDistance}px)`,
          }}
        >
          {children}
        </span>
      ) : (
        <span ref={textRef} className="block truncate">
          {children}
        </span>
      )}
    </span>
  )
}

function RecentFilesSection({ collapsed }) {
  const [recentDocs, setRecentDocs] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const refetch = useCallback((showLoader = false) => {
    if (showLoader) setIsLoading(true)
    Api.get('/documents/recent')
      .then((response) => {
        const data = response?.data?.data
        setRecentDocs(Array.isArray(data) ? data : [])
      })
      .catch(() => setRecentDocs([]))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    refetch(true)
  }, [refetch])

  useEffect(() => {
    const handler = () => refetch(false)
    window.addEventListener(DOCUMENT_DELETED_EVENT, handler)
    window.addEventListener(DOCUMENT_CREATED_EVENT, handler)
    window.addEventListener(DOCUMENT_MODIFIED_EVENT, handler)
    return () => {
      window.removeEventListener(DOCUMENT_DELETED_EVENT, handler)
      window.removeEventListener(DOCUMENT_CREATED_EVENT, handler)
      window.removeEventListener(DOCUMENT_MODIFIED_EVENT, handler)
    }
  }, [refetch])

  const [hoveredDocId, setHoveredDocId] = useState(null)
  const DOT_COLORS = ['text-blue-500', 'text-emerald-500', 'text-amber-500', 'text-violet-500', 'text-rose-500', 'text-cyan-500', 'text-orange-500', 'text-fuchsia-500']

  if (isLoading || recentDocs.length === 0) return null

  return (
    <div className="space-y-1">
      {!collapsed && (
        <h3 className="px-3 mb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">Recent</h3>
      )}
      <ul className="mt-3 mb-4">
        {recentDocs.map((doc, i) => {
          const colorClass = DOT_COLORS[i % DOT_COLORS.length]
          return (
            <li key={doc.id}>
              <Link
                to={`/documents/p/${doc.id}`}
                className={`group flex items-center gap-3 rounded-md text-sm text-slate-600 hover:bg-gray-200/80 hover:text-slate-900 transition-colors ${collapsed ? 'justify-center px-0 py-0' : 'px-3 py-1.5'}`}
                title={doc.title || 'Untitled'}
                onMouseEnter={() => setHoveredDocId(doc.id)}
                onMouseLeave={() => setHoveredDocId(null)}
              >
                {collapsed ? (
                  <p className={`${colorClass}`} >&#9679;</p>
                ) : (
                  <FileText className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-blue-500" />
                )}
                {!collapsed && (
                  <MarqueeText className="flex-1 text-xs font-medium" isHovered={hoveredDocId === doc.id}>
                    {doc.title || 'Untitled'}
                  </MarqueeText>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function RecentGroupsSection({ collapsed }) {
  const [recentGroups, setRecentGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [hoveredGroupId, setHoveredGroupId] = useState(null)
  const GROUP_DOT_COLORS = ['text-blue-500', 'text-emerald-500', 'text-amber-500', 'text-violet-500', 'text-rose-500', 'text-cyan-500']

  const refetch = useCallback((showLoader = false) => {
    if (showLoader) setIsLoading(true)
    Api.get('/groups/recent')
      .then((response) => {
        const data = response?.data?.data
        setRecentGroups(Array.isArray(data) ? data : [])
      })
      .catch(() => setRecentGroups([]))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    refetch(true)
  }, [refetch])

  useEffect(() => {
    const handler = () => refetch(false)
    window.addEventListener(GROUP_CREATED_EVENT, handler)
    window.addEventListener(GROUP_DELETED_EVENT, handler)
    return () => {
      window.removeEventListener(GROUP_CREATED_EVENT, handler)
      window.removeEventListener(GROUP_DELETED_EVENT, handler)
    }
  }, [refetch])

  if (isLoading || recentGroups.length === 0) return null

  return (
    <div className="space-y-1 mt-2 pt-4 border-t border-gray-200">
      <ul className="mt-0.5">
        {recentGroups.map((group, i) => {
          const colorClass = GROUP_DOT_COLORS[i % GROUP_DOT_COLORS.length]
          return (
            <li key={group.id}>
              <Link
                to={`/groups/${group.id}`}
                className={`group flex items-center gap-3 rounded-md text-sm text-slate-600 hover:bg-gray-200/80 hover:text-slate-900 transition-colors ${collapsed ? 'justify-center px-0 py-0' : 'px-3 py-1.5'}`}
                title={group.name || 'Untitled group'}
                onMouseEnter={() => setHoveredGroupId(group.id)}
                onMouseLeave={() => setHoveredGroupId(null)}
              >
                {collapsed ? (
                  <p className={`${colorClass}`} >&#9679;</p>
                ) : (
                  <FolderOpen className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-blue-500" />
                )}
                {!collapsed && (
                  <MarqueeText className="flex-1 text-xs font-medium" isHovered={hoveredGroupId === group.id}>
                    {group.name || 'Untitled group'}
                  </MarqueeText>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function BottomMenuSection({ collapsed }) {
  return (
    <div className="shrink-0">
      <ul className="space-y-0.5">
        {bottomMenuItems.map((item) => (
          <li key={item.label}>
            {item.to ? (
              <NavItem
                to={item.to}
                label={item.label}
                icon={item.icon}
                collapsed={collapsed}
                end={item.end ?? true}
              />
            ) : (
              <button
                type="button"
                title={collapsed ? item.label : undefined}
                className={`flex w-full items-center rounded-md text-sm font-medium transition-all duration-150 ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                  } text-slate-600 hover:bg-gray-200/80 hover:text-slate-900 [&_svg]:text-slate-500 [&:hover_svg]:text-slate-700`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function UpgradeProCard({ collapsed }) {
  if (collapsed) return null

  return (
    <div className="px-3 pb-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-start gap-2">
          <Crown className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-900">Upgrade to Pro</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Unlock advanced features and priority support.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="mt-3 w-full rounded-md bg-amber-600 text-white text-xs font-semibold px-3 py-2 hover:bg-amber-700 transition-colors"
        >
          Upgrade
        </button>
      </div>
    </div>
  )
}

function CompanyDropdownMenuContent({
  companies,
  companiesLoading,
  selectedCompanyId,
  onSelectCompany,
  onClose,
  onAddCompany,
}) {
  return (
    <>
      <div className="max-h-48 overflow-y-auto pt-1 px-1">
        {companiesLoading ? (
          <div className="px-3 py-4 text-center text-xs text-slate-500">
            Loading companies…
          </div>
        ) : companies.length === 0 ? (
          <div className="px-3 py-3 text-sm text-slate-500">
            No companies yet
          </div>
        ) : (
          companies.map((company) => (
            <button
              key={company.id}
              type="button"
              onClick={() => onSelectCompany(company.id)}
              className={`flex w-full items-center space-x-2 px-3 py-2 text-xs text-left transition-colors rounded-md ${selectedCompanyId === company.id ? 'bg-gray-100 text-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <div className="w-full flex items-center justify-between">
                <div className="w-full flex items-center space-x-2">
                  <img
                    src={company.logo}
                    alt={`${company.name} logo`}
                    className="h-5 w-5 rounded-md object-cover bg-slate-100 shrink-0"
                  />
                  <span className="flex-1 truncate">{company.name}</span>
                </div>
                {selectedCompanyId === company.id && (
                  <Check className="w-4 h-4 text-gray-700" />
                )}
              </div>

            </button>
          ))
        )}
      </div>
      <div className="py-1 px-1">
        <button
          type="button"
          onClick={() => {
            onClose()
            onAddCompany?.()
          }}
          className="flex w-full items-center space-x-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 text-left rounded-md"
        >
          <Plus className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Add company</span>
        </button>
      </div>
    </>
  )
}

function Sidebar({ isSidebarExpanded, onToggleSidebar }) {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const { showSnackbar, updateSnackbar, closeSnackbar } = useSnackbar()
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createModalStep, setCreateModalStep] = useState('choices')
  const [isCreating, setIsCreating] = useState(false)
  const [companies, setCompanies] = useState([])
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [companiesError, setCompaniesError] = useState(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState(null)
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false)
  const [companyDropdownFlyoutPosition, setCompanyDropdownFlyoutPosition] = useState(null)
  const companyDropdownRef = useRef(null)
  const companyTriggerRef = useRef(null)
  const companyDropdownMenuRef = useRef(null)
  const collapsed = !isSidebarExpanded

  useLayoutEffect(() => {
    if (isCompanyDropdownOpen && collapsed && companyTriggerRef.current) {
      const rect = companyTriggerRef.current.getBoundingClientRect()
      setCompanyDropdownFlyoutPosition({ left: rect.right + 6, top: rect.top })
    } else if (!isCompanyDropdownOpen) {
      setCompanyDropdownFlyoutPosition(null)
    }
  }, [isCompanyDropdownOpen, collapsed])

  useEffect(() => {
    if (createModalOpen) setCreateModalStep('choices')
  }, [createModalOpen])

  useEffect(() => {
    let isMounted = true
    setCompaniesLoading(true)
    setCompaniesError(null)
    Api.get('/companies')
      .then((response) => {
        if (!isMounted) return
        const rawCompanies = response?.data?.data ?? []
        const mappedCompanies = rawCompanies.map((company, index) => {
          const id = company.id ?? company.uuid ?? `company-${index}`
          const name = (company.company_name || '').trim() || 'Untitled company'
          const logo = getLogoUrl(name)
          return {
            id,
            name,
            logo,
          }
        })
        setCompanies(mappedCompanies)
        if (mappedCompanies.length > 0) {
          setSelectedCompanyId(mappedCompanies[0].id)
        }
      })
      .catch(() => {
        if (!isMounted) return
        setCompanies([])
        setCompaniesError('Unable to load companies')
      })
      .finally(() => {
        if (!isMounted) return
        setCompaniesLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isCompanyDropdownOpen) return
    const handleClickOutside = (e) => {
      if (
        companyDropdownRef.current?.contains(e.target) ||
        companyDropdownMenuRef.current?.contains(e.target)
      ) return
      setIsCompanyDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isCompanyDropdownOpen])

  useEffect(() => {
    const handler = () => setCreateModalOpen(true)
    window.addEventListener(OPEN_CREATE_MODAL, handler)
    return () => window.removeEventListener(OPEN_CREATE_MODAL, handler)
  }, [])

  const width = isSidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH

  // Sync selected company from user.default_company (from /me) when user or companies change
  useEffect(() => {
    if (!companies.length) return
    const defaultId = user?.default_company?.id ?? user?.default_company?.uuid
    const match = defaultId != null ? companies.find((c) => c.id == defaultId) : null
    if (match) setSelectedCompanyId(match.id)
  }, [user, companies])

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) || null

  const handleSelectCompany = useCallback(async (id) => {
    setSelectedCompanyId(id)
    setIsCompanyDropdownOpen(false)
    try {
      await Api.post('/switch-company', { data: { company_id: id } })
      await refreshUser()
    } catch (err) {
      const message = err.response?.data?.message ?? 'Failed to switch company.'
      showSnackbar({ message, variant: 'error', duration: 4000 })
    }
  }, [showSnackbar, refreshUser])

  const handleCreateBlankPage = useCallback(async () => {
    if (isCreating) return
    setIsCreating(true)
    const toastId = showSnackbar({ message: 'Cooking up a new doc...', loading: true, duration: 0 })
    try {
      const response = await Api.post('/documents')
      window.dispatchEvent(new CustomEvent(DOCUMENT_CREATED_EVENT))
      updateSnackbar(toastId, { message: 'Doc created! Let\'s go 🚀', variant: 'success', loading: false, duration: 3000 })
      setCreateModalOpen(false)
      setTimeout(() => navigate(`/documents/p/${response.data.data.id}`, { state: { startCollapsedFromNewDoc: true } }), 400)
    } catch {
      updateSnackbar(toastId, { message: 'Unable to create document. Please try again.', variant: 'error', loading: false, duration: 3000, showCloseButton: true })
    } finally {
      setIsCreating(false)
    }
  }, [isCreating, showSnackbar, updateSnackbar, navigate])

  const handleCreateNewGroupClick = useCallback(() => {
    setCreateModalStep('form')
  }, [])

  const groupFormValidationSchema = Yup.object({
    name: Yup.string().required('Group name is required').trim(),
  })

  const groupFormik = useFormik({
    initialValues: { name: '' },
    validationSchema: groupFormValidationSchema,
    onSubmit: async (values) => {
      if (isCreating) return
      const groupName = values.name.trim()
      setIsCreating(true)
      const toastId = showSnackbar({
        message: `Creating "${groupName}"`,
        loading: true,
        duration: 0,
      })
      try {
        const response = await Api.post('/groups', {
          data: { name: groupName },
        })
        const data = response?.data
        if (data?.status === 'success' && data?.data?.id) {
          window.dispatchEvent(new CustomEvent(GROUP_CREATED_EVENT))
          updateSnackbar(toastId, {
            message: `"${groupName}" group created`,
            variant: 'success',
            loading: false,
            duration: 3000,
          })
          handleCreateModalClose()
          setTimeout(() => navigate(`/groups/${data.data.id}`), 400)
        } else {
          closeSnackbar(toastId)
          groupFormik.setStatus({ error: data?.message || 'Failed to create group' })
        }
      } catch (err) {
        const res = err?.response
        const data = res?.data
        closeSnackbar(toastId)
        groupFormik.setStatus({ error: data?.message || 'Unable to create group. Please try again.' })
      } finally {
        setIsCreating(false)
      }
    },
  })

  const handleCreateModalClose = useCallback(() => {
    if (!isCreating) {
      setCreateModalOpen(false)
      groupFormik.resetForm()
    }
  }, [isCreating, groupFormik])

  const toggleButton = (
    <button
      type="button"
      onClick={onToggleSidebar}
      title={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
      className="shrink-0 p-1 rounded-full text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
    >
      {isSidebarExpanded ? (
        <ChevronLeft className="w-4 h-4" />
      ) : (
        <ChevronRight className="w-4 h-4" />
      )}
    </button>
  )

  return (
    <div className="relative shrink-0">
      <aside
        className="flex flex-col h-screen bg-gray-100/80 border-r border-gray-200 transition-[width] duration-200 ease-out overflow-hidden"
        style={{ width }}
      >
        {/* Logo / brand + collapse icon at right */}
        <div className="shrink-0 h-14 px-4 border-b border-gray-200 flex items-center gap-2">
          <NavLink
            to="/"
            title={collapsed ? (import.meta.env.VITE_APP_NAME ?? 'Crapbook') : undefined}
            className={`flex items-center gap-2 min-w-0 ${collapsed ? 'flex-1 justify-center' : 'flex-1'
              }`}
          >
            <div className="w-9 h-9 rounded-md bg-linear-to-br from-pink-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg shadow-pink-500/25">
              S
            </div>
            {!collapsed && <span className="font-semibold text-slate-800 truncate">{import.meta.env.VITE_APP_NAME ?? 'Crapbook'}</span>}
          </NavLink>
          {!collapsed && toggleButton}
        </div>

        {/* Nav sections — scrollable middle between top bar and user profile */}
        <nav className="app-sidebar-nav flex-1 min-h-0 overflow-y-auto py-2 px-2.5 flex flex-col">
          <div className="mb-3 relative" ref={companyDropdownRef}>
            <button
              ref={companyTriggerRef}
              type="button"
              disabled={companiesLoading}
              onClick={() => setIsCompanyDropdownOpen((open) => !open)}
              className={`relative flex w-full items-center gap-2 rounded-md border border-blue-200 bg-linear-to-t from-blue-100 to-blue-50 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors ${collapsed ? 'justify-center px-0 py-2' : 'p-2'
                }`}
            >
              {selectedCompany ? (
                <>
                  <img
                    src={selectedCompany.logo}
                    alt={`${selectedCompany.name} logo`}
                    className="h-6 w-6 rounded-md object-cover shrink-0"
                  />
                  {!collapsed && (
                    <span className="flex-1 truncate">
                      {selectedCompany.name}
                    </span>
                  )}
                </>
              ) : (
                !companiesLoading && (
                  !collapsed && (
                    <span className="flex-1 truncate text-slate-400">
                      Select company
                    </span>
                  )
                )
              )}
              {companiesLoading && (
                !collapsed && (
                  <span className="flex-1 truncate text-slate-400">
                    Loading…
                  </span>
                )
              )}
              {!collapsed && (
                <ChevronDown className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>
            {isCompanyDropdownOpen && !collapsed && (
              <div
                ref={companyDropdownMenuRef}
                className="mt-1 w-full min-w-[200px] rounded-md border border-slate-200 bg-white shadow-lg absolute z-20 overflow-hidden"
              >
                <CompanyDropdownMenuContent
                  companies={companies}
                  companiesLoading={companiesLoading}
                  selectedCompanyId={selectedCompanyId}
                  onSelectCompany={handleSelectCompany}
                  onClose={() => setIsCompanyDropdownOpen(false)}
                  onAddCompany={() => {
                    setIsCompanyDropdownOpen(false)
                    navigate('/companies/new')
                  }}
                />
              </div>
            )}
            {isCompanyDropdownOpen && collapsed && companyDropdownFlyoutPosition && createPortal(
              <div
                ref={companyDropdownMenuRef}
                className="fixed z-50 min-w-[200px] w-56 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden"
                style={{
                  top: companyDropdownFlyoutPosition.top,
                  left: companyDropdownFlyoutPosition.left,
                }}
              >
                <CompanyDropdownMenuContent
                  companies={companies}
                  companiesLoading={companiesLoading}
                  selectedCompanyId={selectedCompanyId}
                  onSelectCompany={handleSelectCompany}
                  onClose={() => setIsCompanyDropdownOpen(false)}
                  onAddCompany={() => {
                    setIsCompanyDropdownOpen(false)
                    navigate('/companies/new')
                  }}
                />
              </div>,
              document.body
            )}
            {companiesError && !collapsed && !isCompanyDropdownOpen && (
              <p className="mt-1 text-xs text-red-500">
                {companiesError}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            title={collapsed ? 'Create new' : undefined}
            className={`flex w-full justify-center space-x-2 rounded-md text-sm font-semibold bg-linear-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:shadow-lg hover:shadow-blue-500/25 transition-colors mb-2 cursor-pointer ${collapsed ? 'px-0 py-2.5' : 'px-3 py-3'
              }`}
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            {!collapsed && <span>New</span>}
          </button>

          <hr className="my-0 py-0 border-0 border-t border-gray-200 mb-4 -mx-1" />

          <div className="space-y-6">
            {sidebarNav.map((section) => (
              <div key={section.label ?? section.items.map((i) => i.to).join('-')}>
                {section.label && (
                  collapsed ? (
                    <div className="px-0 mb-2">
                      <hr className="border-0 border-t border-gray-200" />
                    </div>
                  ) : (
                    <h3 className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {section.label}
                    </h3>
                  )
                )}
                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.to ?? item.label}>
                      {item.children ? (
                        <NavGroup item={item} collapsed={collapsed} />
                      ) : (
                        <NavItem to={item.to} label={item.label} icon={item.icon} collapsed={collapsed} end={item.end} />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-0">
            <RecentFilesSection collapsed={collapsed} />
            <RecentGroupsSection collapsed={collapsed} />
          </div>

          <div className="mt-auto pt-4">
            <BottomMenuSection collapsed={collapsed} />
          </div>
        </nav>

        {/* <UpgradeProCard collapsed={collapsed} /> */}

        {/* User area — real user data + 3-dot menu */}
        <UserBlock
          collapsed={collapsed}
          isSidebarExpanded={isSidebarExpanded}
          sidebarWidth={width}
        />
      </aside>

      {/* When collapsed: expand button on the sidebar edge (over the border line) */}
      {collapsed && (
        <div className="absolute top-4 right-0 translate-x-1/2 z-10 flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 bg-white shadow-md">
          {toggleButton}
        </div>
      )}

      <SmartModal
        open={createModalOpen}
        onClose={handleCreateModalClose}
        title={createModalStep === 'form' ? 'Create New Group' : 'Create New'}
        showFooter={false}
        size="sm"
        closeOnBackdrop={!isCreating}
        closeOnEscape={!isCreating}
        staticBackdrop={isCreating}
        animation="top"
      >
        <div className="overflow-hidden w-full" style={{ width: '100%' }}>
          <div
            className="flex transition-transform duration-200 ease-in-out"
            style={{
              width: '200%',
              transform: createModalStep === 'form' ? 'translateX(-50%)' : 'translateX(0)',
            }}
          >
            {/* Step 1: Choice buttons */}
            <div className="w-1/2 shrink-0 py-6 px-6">
              <div className="grid grid-cols-2 gap-6 w-full">
                <button
                  type="button"
                  onClick={handleCreateBlankPage}
                  disabled={isCreating}
                  className="flex flex-col items-center justify-center gap-2 aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/80 hover:border-blue-400 hover:bg-blue-50/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed p-4 disabled:hover:scale-100"
                >
                  <FileText className="w-10 h-10 text-blue-500 shrink-0" strokeWidth={2} />
                  <span className="text-sm font-medium text-slate-600 text-center">Blank page</span>
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewGroupClick}
                  disabled={isCreating}
                  className="flex flex-col items-center justify-center gap-2 aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/80 hover:border-blue-400 hover:bg-blue-50/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed p-4 disabled:hover:scale-100"
                >
                  <FolderPlus className="w-10 h-10 text-blue-500 shrink-0" strokeWidth={2} />
                  <span className="text-sm font-medium text-slate-600 text-center">New group</span>
                </button>
              </div>
            </div>

            {/* Step 2: Create Group form */}
            <div className="w-1/2 shrink-0 py-6 px-6">
              <form onSubmit={groupFormik.handleSubmit} className="space-y-4">
                {groupFormik.status?.error && (
                  <div
                    role="alert"
                    className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2"
                  >
                    {groupFormik.status.error}
                  </div>
                )}
                <div>
                  <label htmlFor="group-name" className="block text-sm font-medium text-slate-700 mb-1">
                    Group Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="group-name"
                    type="text"
                    placeholder="Enter group name"
                    autoComplete="off"
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    {...groupFormik.getFieldProps('name')}
                  />
                  {groupFormik.touched.name && groupFormik.errors.name && (
                    <p className="mt-1 text-sm text-red-600">{groupFormik.errors.name}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalStep('choices')
                      groupFormik.resetForm()
                    }}
                    disabled={groupFormik.isSubmitting}
                    className="flex justify-center items-center space-x-2 text-sm text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={groupFormik.isSubmitting || isCreating}
                    className="py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {groupFormik.isSubmitting || isCreating ? 'Creating…' : 'Create Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </SmartModal>
    </div>
  )
}

const DUMMY_SEARCH_DOCUMENTS = [
  { id: 'd1', title: 'Meeting notes', groupName: null, to: '/documents/p/d1' },
  { id: 'd2', title: 'Lorem Ipsum', groupName: 'design-team', to: '/documents/p/d2' },
  { id: 'd3', title: 'Project specs', groupName: 'engineering', to: '/documents/p/d3' },
]
const DUMMY_SEARCH_GROUPS = [
  { id: 'g1', name: 'Design Team', to: '/groups/g1' },
  { id: 'g2', name: 'Engineering', to: '/groups/g2' },
]

function getFilteredSearchResults(query) {
  const q = query?.toLowerCase().trim() || ''
  const filteredDocs = DUMMY_SEARCH_DOCUMENTS.filter(
    (d) =>
      !q ||
      d.title.toLowerCase().includes(q) ||
      (d.groupName && d.groupName.toLowerCase().includes(q))
  )
  const filteredGroups = DUMMY_SEARCH_GROUPS.filter(
    (g) => !q || g.name.toLowerCase().includes(q)
  )
  return { filteredDocs, filteredGroups }
}

function buildFlatSearchItems(filteredDocs, filteredGroups) {
  const docs = filteredDocs.map((d) => ({
    id: d.id,
    to: d.to,
    displayText: d.groupName ? `${d.title} (/groups/${d.groupName})` : d.title,
    type: 'doc',
  }))
  const groups = filteredGroups.map((g) => ({
    id: g.id,
    to: g.to,
    displayText: g.name,
    type: 'group',
  }))
  return [...docs, ...groups]
}

function SearchResultsList({ filteredDocs, filteredGroups, selectedIndex, onSelect }) {
  const selectedRef = useRef(null)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedIndex])

  const hasResults = filteredDocs.length > 0 || filteredGroups.length > 0
  if (!hasResults) {
    return (
      <div className="px-3 py-6 text-center text-sm text-slate-500">
        Nada. Try something else?
      </div>
    )
  }

  let index = -1
  return (
    <>
      {filteredDocs.length > 0 && (
        <div className="mb-1">
          <h3 className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Documents
          </h3>
          {filteredDocs.map((doc) => {
            index += 1
            const isSelected = index === selectedIndex
            return (
              <Link
                key={doc.id}
                ref={isSelected ? selectedRef : undefined}
                to={doc.to}
                onClick={onSelect}
                className={`flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${isSelected ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <span className="flex-1 min-w-0 truncate">
                  {doc.groupName
                    ? `${doc.title} (/groups/${doc.groupName})`
                    : doc.title}
                </span>
                <CornerDownLeft className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
              </Link>
            )
          })}
        </div>
      )}
      {filteredGroups.length > 0 && (
        <div>
          <h3 className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Groups
          </h3>
          {filteredGroups.map((group) => {
            index += 1
            const isSelected = index === selectedIndex
            return (
              <Link
                key={group.id}
                ref={isSelected ? selectedRef : undefined}
                to={group.to}
                onClick={onSelect}
                className={`flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${isSelected ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <span className="flex-1 min-w-0 truncate">{group.name}</span>
                <CornerDownLeft className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}

function SearchDropdown({ query, inputRef, onClose }) {
  const navigate = useNavigate()
  const dropdownRef = useRef(null)
  const [position, setPosition] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const { filteredDocs, filteredGroups } = getFilteredSearchResults(query)
  const flatItems = useMemo(
    () => buildFlatSearchItems(filteredDocs, filteredGroups),
    [filteredDocs, filteredGroups]
  )
  const itemCount = flatItems.length

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!inputRef?.current) return
    const measure = () => {
      const rect = inputRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
    measure()
    const ro = inputRef.current && new ResizeObserver(measure)
    if (ro && inputRef.current) ro.observe(inputRef.current)
    return () => ro?.disconnect()
  }, [inputRef, query])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        inputRef?.current?.contains(e.target) ||
        dropdownRef?.current?.contains(e.target)
      ) return
      onClose?.()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [inputRef, onClose])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (itemCount > 0 ? Math.min(i + 1, itemCount - 1) : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && itemCount > 0) {
        const item = flatItems[selectedIndex]
        if (item) {
          e.preventDefault()
          navigate(item.to)
          onClose?.()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [itemCount, selectedIndex, flatItems, navigate, onClose])

  if (!position) return null

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-10025 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: 'min(320px, 50vh)',
      }}
    >
      <div className="overflow-y-auto py-2 max-h-[inherit]">
        <SearchResultsList
          filteredDocs={filteredDocs}
          filteredGroups={filteredGroups}
          selectedIndex={selectedIndex}
          onSelect={onClose}
        />
      </div>
    </div>,
    document.body,
  )
}

function SpotlightSearch({ open, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  const { filteredDocs, filteredGroups } = getFilteredSearchResults(query)
  const flatItems = useMemo(
    () => buildFlatSearchItems(filteredDocs, filteredGroups),
    [filteredDocs, filteredGroups]
  )
  const itemCount = flatItems.length

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (itemCount > 0 ? Math.min(i + 1, itemCount - 1) : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && itemCount > 0) {
        const item = flatItems[selectedIndex]
        if (item) {
          e.preventDefault()
          navigate(item.to)
          onClose?.()
        }
      }
    }
    if (open) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, itemCount, selectedIndex, flatItems, navigate])

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.()
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-10050 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-xs"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search docs & groups..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-base py-1 bg-transparent outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded">
            Esc
          </kbd>
        </div>
        <div className="max-h-[min(320px,50vh)] overflow-y-auto py-2">
          <SearchResultsList
            filteredDocs={filteredDocs}
            filteredGroups={filteredGroups}
            selectedIndex={selectedIndex}
            onSelect={onClose}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}

function HomeNavbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSearchOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="shrink-0 h-14 px-4 border-b border-slate-200 flex items-center justify-center">
      <div className="relative w-full max-w-xl flex items-center">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none shrink-0" />
        <input
          ref={searchInputRef}
          type="search"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchOpen(true)}
          className="w-full h-9 pl-10 pr-20 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded">
          Ctrl+K
        </kbd>
      </div>
      {searchOpen && (
        <SearchDropdown
          query={searchQuery}
          inputRef={searchInputRef}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  )
}

function AllFilesNavbar() {
  return (
    <div className="shrink-0 h-14 px-4 border-b border-slate-200 flex items-center justify-between gap-4">
      <div className="flex items-center h-9 min-w-0 gap-1.5">
        <Link
          to="/"
          className="flex items-center text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          title="Home"
        >
          <House className="w-4 h-4" />
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-sm font-semibold text-slate-800">All Files</span>
      </div>
      <div className="flex items-center gap-3 min-w-0 flex-1 justify-end max-w-md">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search"
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  )
}

function DocumentsNavbar() {
  return (
    <div className="shrink-0 h-14 px-4 border-b border-slate-200 flex items-center justify-between gap-4">
      <div className="flex items-center h-9 min-w-0 gap-1.5">
        <Link
          to="/"
          className="flex items-center text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          title="Home"
        >
          <House className="w-4 h-4" />
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-sm font-semibold text-slate-800">Documents</span>
      </div>
      <div className="flex items-center gap-3 min-w-0 flex-1 justify-end max-w-md">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search"
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  )
}

const groupFormValidationSchema = Yup.object({
  name: Yup.string().required('Group name is required').trim(),
})

function GroupsNavbar() {
  const { id: groupId } = useParams()
  const location = useLocation()
  const { showSnackbar, updateSnackbar, closeSnackbar } = useSnackbar()
  const [group, setGroup] = useState(null)
  const [isLoadingGroup, setIsLoadingGroup] = useState(false)
  const [newGroupModalOpen, setNewGroupModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const isGroupDetailPage = Boolean(groupId)

  const groupFormik = useFormik({
    initialValues: { name: '' },
    validationSchema: groupFormValidationSchema,
    onSubmit: async (values) => {
      if (isCreating) return
      const groupName = values.name.trim()
      setIsCreating(true)
      const toastId = showSnackbar({
        message: `Creating "${groupName}"`,
        loading: true,
        duration: 0,
      })
      try {
        const response = await Api.post('/groups', {
          data: { name: groupName },
        })
        const data = response?.data
        if (data?.status === 'success' && data?.data?.id) {
          window.dispatchEvent(new CustomEvent(GROUP_CREATED_EVENT))
          updateSnackbar(toastId, {
            message: `"${groupName}" group created`,
            variant: 'success',
            loading: false,
            duration: 3000,
          })
          setNewGroupModalOpen(false)
          groupFormik.resetForm()
        } else {
          closeSnackbar(toastId)
          groupFormik.setStatus({ error: data?.message || 'Failed to create group' })
        }
      } catch (err) {
        const res = err?.response
        const data = res?.data
        closeSnackbar(toastId)
        groupFormik.setStatus({ error: data?.message || 'Unable to create group. Please try again.' })
      } finally {
        setIsCreating(false)
      }
    },
  })

  const handleNewGroupModalClose = useCallback(() => {
    if (!isCreating) {
      setNewGroupModalOpen(false)
      groupFormik.resetForm()
    }
  }, [isCreating, groupFormik])

  const handleNewGroupClick = useCallback(() => {
    groupFormik.resetForm()
    setNewGroupModalOpen(true)
  }, [groupFormik])

  useEffect(() => {
    const handler = () => handleNewGroupClick()
    window.addEventListener(GROUP_OPEN_CREATE_GROUP_MODAL, handler)
    return () => window.removeEventListener(GROUP_OPEN_CREATE_GROUP_MODAL, handler)
  }, [handleNewGroupClick])

  useEffect(() => {
    if (!groupId) {
      setGroup(null)
      return
    }
    setIsLoadingGroup(true)
    Api.get(`/groups/${groupId}`)
      .then((res) => {
        const data = res?.data?.data
        setGroup(data || null)
      })
      .catch(() => setGroup(null))
      .finally(() => setIsLoadingGroup(false))
  }, [groupId])

  const groupName = group?.name
  const breadcrumbLabel = isGroupDetailPage
    ? (isLoadingGroup ? '…' : groupName || 'Group')
    : null

  return (
    <div className="shrink-0 h-14 px-4 border-b border-slate-200 flex items-center justify-between gap-4">
      <div className="flex items-center h-9 min-w-0 gap-1.5">
        <Link
          to="/"
          className="flex items-center text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          title="Home"
        >
          <House className="w-4 h-4" />
        </Link>
        <span className="text-slate-400">/</span>
        <Link
          to="/all-files"
          className="text-sm font-medium text-slate-600 hover:text-slate-800 shrink-0"
        >
          All Files
        </Link>
        <span className="text-slate-400">/</span>
        <Link
          to="/groups"
          className={`text-sm font-medium transition-colors shrink-0 ${!isGroupDetailPage ? 'text-slate-800 font-semibold' : 'text-slate-600 hover:text-slate-800'
            }`}
        >
          Groups
        </Link>
        {isGroupDetailPage && (
          <>
            <span className="text-slate-400">/</span>
            <span className="text-sm font-semibold text-slate-800 truncate" title={groupName}>
              {breadcrumbLabel}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3 min-w-0 flex-1 justify-end max-w-md">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search"
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>
        {isGroupDetailPage ? (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(GROUP_OPEN_CREATE_DOC_MODAL))}
            className="shrink-0 flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            New document
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNewGroupClick}
            className="shrink-0 flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Group
          </button>
        )}
      </div>

      <SmartModal
        open={newGroupModalOpen}
        onClose={handleNewGroupModalClose}
        title="Create New Group"
        showFooter={false}
        size="sm"
        closeOnBackdrop={!isCreating}
        closeOnEscape={!isCreating}
        staticBackdrop={isCreating}
        animation="top"
      >
        <div className="py-6 px-6">
          <form onSubmit={groupFormik.handleSubmit} className="space-y-4">
            {groupFormik.status?.error && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2"
              >
                {groupFormik.status.error}
              </div>
            )}
            <div>
              <label htmlFor="groups-navbar-group-name" className="block text-sm font-medium text-slate-700 mb-1">
                Group Name <span className="text-red-500">*</span>
              </label>
              <input
                id="groups-navbar-group-name"
                type="text"
                placeholder="Enter group name"
                autoComplete="off"
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                {...groupFormik.getFieldProps('name')}
              />
              {groupFormik.touched.name && groupFormik.errors.name && (
                <p className="mt-1 text-sm text-red-600">{groupFormik.errors.name}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleNewGroupModalClose}
                disabled={isCreating}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={groupFormik.isSubmitting || isCreating}
                className="py-2 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {groupFormik.isSubmitting || isCreating ? 'Creating…' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      </SmartModal>
    </div>
  )
}

/**
 * Layout with fixed left sidebar + dynamic main content on the right.
 * Sidebar can be expanded (260px) or contracted (64px, icons only).
 * Use for user-area pages that need the sidebar. Other routes can be full-width without this layout.
 */
export function DefaultLayoutWithSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(getInitialSidebarExpanded)
  const [spotlightOpen, setSpotlightOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSpotlightOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleToggleSidebar = () => {
    setIsSidebarExpanded((prev) => {
      const next = !prev
      try {
        localStorage.setItem(S_CB_SB, String(!next))
      } catch (_) { /* ignore */ }
      return next
    })
  }

  useEffect(() => {
    const startCollapsed = location.state?.startCollapsedFromNewDoc
    if (startCollapsed) {
      setIsSidebarExpanded(false)
      navigate(location.pathname + location.search, { replace: true, state: {} })
    }
  }, [location.state?.startCollapsedFromNewDoc, location.pathname, location.search, navigate])

  return (
    <div className="app-layout flex h-screen overflow-hidden bg-[#f0f2f5]">
      <Sidebar
        isSidebarExpanded={isSidebarExpanded}
        onToggleSidebar={handleToggleSidebar}
      />
      <SpotlightSearch open={spotlightOpen} onClose={() => setSpotlightOpen(false)} />
      <main className="relative flex-1 min-w-0 min-h-0 flex flex-col bg-white overflow-hidden">
        {(location.pathname === '/' || location.pathname === '/home') && <HomeNavbar />}
        {location.pathname === '/all-files' && <AllFilesNavbar />}
        {location.pathname === '/documents' && <DocumentsNavbar />}
        {location.pathname.startsWith('/groups') && <GroupsNavbar />}
        <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
          <Outlet />
        </div>
        <SnackbarMainContentContainer />
      </main>
    </div>
  )
}
