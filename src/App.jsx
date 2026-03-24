import { BrowserRouter, useRoutes, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedCustomerRoute } from './routes/ProtectedCustomerRoute'
import { DefaultLayoutWithSidebar } from './pages/user/DefaultLayoutWithSidebar'
import { Onboarding } from './pages/Onboarding'
import { AddNewCompany } from './pages/user/AddNewCompany'
import { Home } from './pages/user/Home'
import { SeoAnalysis } from './pages/user/SeoAnalysis'
import { Document } from './pages/user/Document'
import { Documents } from './pages/user/Documents'
import { Groups } from './pages/user/Groups'
import { Group } from './pages/user/Group'
import { AllFiles } from './pages/user/AllFiles'
import { Ai } from './pages/user/Ai'
import TinyFishAnalyze from './pages/user/TinyFishAnalyze'
import MultipleTinyFishTest from './pages/user/MultipleTinyFishTest'
import { BusinessProfile } from './pages/user/BusinessProfile'
import { FriendlinessAndResponsiveness } from './pages/user/FriendlinessAndResponsiveness'
import { MultiAgentTest } from './pages/user/MultiAgentTest'
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
          { path: 'seo-analysis', element: <SeoAnalysis /> },
          { path: 'all-files', element: <AllFiles /> },
          { path: 'documents', element: <Documents /> },
          { path: 'tinyfish-test', element: <TinyFishAnalyze /> },
          { path: 'multiple-tinyfish-test', element: <MultipleTinyFishTest /> },
          { path: 'business-profile', element: <BusinessProfile /> },
          { path: 'friendliness-and-responsiveness', element: <FriendlinessAndResponsiveness /> },
          { path: 'multi-agent-test', element: <MultiAgentTest /> },
          { path: 'ai', element: import.meta.env.VITE_APP_ENV === 'dev' ? <Ai /> : <Navigate to="/" replace /> },
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
