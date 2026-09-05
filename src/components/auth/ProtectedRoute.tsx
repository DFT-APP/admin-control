import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // The stored token has not been checked with the server yet. Rendering
  // anything here would flash the panel to someone who is about to be kicked.
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#0a0a0a]">
        <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#a3e635] animate-spin" />
        <span className="text-gray-500 text-sm">Checking your session…</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
