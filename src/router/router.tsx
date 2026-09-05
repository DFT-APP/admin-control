/*
 * react-refresh/only-export-components fires on every lazy() binding here
 * because the file also exports `router`, which is not a component. Splitting
 * the route table away from the router it builds would be churn in service of
 * a dev-server nicety; the rule is about Fast Refresh and has no bearing on a
 * production build.
 */
/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense, type ReactNode } from 'react'
import Login from './pages/LoginPage'
import { AppLayout } from '../components/layout/AppLayout'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'
import NotFoundPage from './pages/NotFoundPage'

// Every section is code-split: the login screen no longer ships the charting
// library and all eight pages in one bundle.
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const AnalystPage = lazy(() => import('./pages/AnalystPage'))
const TradesPage = lazy(() => import('./pages/TradesPage'))
const VideosPage = lazy(() => import('./pages/VideosPage'))
const SignalsPage = lazy(() => import('./pages/SignalsPage'))
const CreditsPage = lazy(() => import('./pages/CreditsPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const CoinIconsPage = lazy(() => import('./pages/CoinIconsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#a3e635] animate-spin" />
    </div>
  )
}

const page = (element: ReactNode) => (
  <Suspense fallback={<PageFallback />}>{element}</Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: page(<DashboardPage />) },
          { path: 'users', element: page(<UsersPage />) },
          { path: 'analysts', element: page(<AnalystPage />) },
          { path: 'trades', element: page(<TradesPage />) },
          { path: 'videos', element: page(<VideosPage />) },
          { path: 'signals', element: page(<SignalsPage />) },
          { path: 'credits', element: page(<CreditsPage />) },
          { path: 'analytics', element: page(<AnalyticsPage />) },
          { path: 'coin-icons', element: page(<CoinIconsPage />) },
          { path: 'settings', element: page(<SettingsPage />) },
        ],
      },
    ],
  },
  // Anything unmatched, signed in or not.
  { path: '*', element: <NotFoundPage /> },
])
