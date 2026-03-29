import { BrowserRouter, useRoutes, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedCustomerRoute } from './routes/ProtectedCustomerRoute'
import { DefaultLayoutWithSidebar } from './pages/user/DefaultLayoutWithSidebar'
import { Onboarding } from './pages/Onboarding'
import { AddNewCompany } from './pages/user/AddNewCompany'
import { Home } from './pages/user/Home'
import { WebsiteAudit } from './pages/user/WebsiteAudit'
import { Document } from './pages/user/Document'
import { Documents } from './pages/user/Documents'
import { Groups } from './pages/user/Groups'
import { Group } from './pages/user/Group'
import { AllFiles } from './pages/user/AllFiles'
import { AiDemo } from './pages/user/AiDemo'
import WebAgent from './pages/user/WebAgent'
import MultiWebAgents from './pages/user/MultiWebAgents'
import { BusinessProfile } from './pages/user/BusinessProfile'
import { SeoServices } from './pages/user/SeoServices'
import { SEOServices } from './pages/user/SEOServices/SEOServices'
import { Blogs } from './pages/user/SEOServices/Blogs'
import { BlogView } from './pages/user/SEOServices/BlogView'
import { NewBlog } from './pages/user/SEOServices/NewBlog'
import { Blog } from './pages/user/SEOServices/Blog'
import { FriendlinessAndResponsiveness } from './pages/user/FriendlinessAndResponsiveness'
import { AITeam } from './pages/user/AITeam'
import {
  Account,
  AccountProfilePage,
  AccountPreferencesPage,
} from './pages/user/Account'
import { EditorPage } from './pages/EditorPage'
import { B2BPage } from './pages/B2BPage'
import { Error404 } from './pages/Error404'
import { guestRoutes } from './routes/guests.routes.jsx'
import { SnackbarProvider } from './components/ui/SnackbarProvider'

function LegacySeoServicesRedirect() {
  const { pathname, search, hash } = useLocation()
  const rest = pathname.replace(/^\/seo-services\/?/, '')
  const to = rest ? `/services/${rest}` : '/services'
  return <Navigate to={`${to}${search}${hash}`} replace />
}

const allRoutes = [
  {
    path: '/',
    element: <ProtectedCustomerRoute />,
    children: [
      { path: 'onboarding', element: <Onboarding /> },
      { path: 'companies/new', element: <AddNewCompany /> },
      {
        element: <DefaultLayoutWithSidebar />,
        children: [
          { index: true, element: <Home /> },
          { path: 'home', element: <Home /> },
          { path: 'website-audit', element: <WebsiteAudit /> },
          { path: 'seo-analysis', element: <Navigate to="/website-audit" replace /> },
          { path: 'all-files', element: <AllFiles /> },
          { path: 'documents', element: <Documents /> },
          { path: 'tinyfish-test', element: <Navigate to="/web-agent" replace /> },
          { path: 'multiple-tinyfish-test', element: <Navigate to="/multi-web-agents" replace /> },
          { path: 'web-agent', element: <WebAgent /> },
          { path: 'multi-web-agents', element: <MultiWebAgents /> },
          { path: 'business-profile', element: <BusinessProfile /> },
          {
            path: 'services',
            element: <SEOServices />,
            children: [
              { index: true, element: <SeoServices /> },
              { path: 'blogs/new', element: <NewBlog /> },
              { path: 'blogs/:blogId', element: <BlogView /> },
              { path: 'blogs', element: <Blogs /> },
              { path: 'blog', element: <Blog /> },
            ],
          },
          { path: 'seo-services', element: <LegacySeoServicesRedirect /> },
          { path: 'seo-services/*', element: <LegacySeoServicesRedirect /> },
          {
            path: 'friendliness-and-responsiveness',
            element:
              import.meta.env.VITE_APP_ENV === 'dev' ? (
                <FriendlinessAndResponsiveness />
              ) : (
                <Navigate to="/" replace />
              ),
          },
          { path: 'multi-agent-test', element: <Navigate to="/ai-team" replace /> },
          { path: 'conversational-ai-team', element: <Navigate to="/ai-team" replace /> },
          { path: 'ai-team', element: <AITeam /> },
          { path: 'ai-demo', element: import.meta.env.VITE_APP_ENV === 'dev' ? <AiDemo /> : <Navigate to="/" replace /> },
          { path: 'ai', element: import.meta.env.VITE_APP_ENV === 'dev' ? <Navigate to="/ai-demo" replace /> : <Navigate to="/" replace /> },
          { path: 'groups', element: <Groups /> },
          { path: 'groups/:id', element: <Group /> },
          { path: 'account', element: <Navigate to="/settings/account/profile" replace /> },
          {
            path: 'settings/account',
            element: <Account />,
            children: [
              { index: true, element: <Navigate to="/settings/account/profile" replace /> },
              { path: 'profile', element: <AccountProfilePage /> },
              { path: 'preferences', element: <AccountPreferencesPage /> },
            ],
          },
          { path: 'documents/p/:id', element: <Document /> },
        ],
      },
    ],
  },
  ...guestRoutes,
  { path: '/b2b', element: <B2BPage /> },
  { path: '/editor', element: <EditorPage /> },
  { path: '*', element: <Error404 /> },
]

function AppRoutes() {
  return useRoutes(allRoutes)
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SnackbarProvider>
          <AppRoutes />
        </SnackbarProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
