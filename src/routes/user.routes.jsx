import { UserLayout } from '../layout/UserLayout'
import { Home } from '../pages/user/Home'
import { Document } from '../pages/user/Document'

/**
 * User-area routes: layout wraps all user pages, children render in <Outlet />.
 * Auth routes (login, signup, forgot-password) are in guests.routes.jsx.
 */
export const userRoutes = [
  {
    path: '/',
    element: <UserLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'home', element: <Home /> },
      { path: 'documents/p/:id', element: <Document /> },
    ],
  },
]
