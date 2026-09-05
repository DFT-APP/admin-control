import { Link, useLocation } from "react-router-dom"

export default function NotFoundPage() {
  const location = useLocation()

  return (
    <div
      className="min-h-[100dvh] bg-[#0a0a0a] text-white flex items-center justify-center p-6"
      style={{
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="text-center max-w-sm">
        <p className="text-[#a3e635] text-4xl sm:text-5xl font-bold mb-2">404</p>
        <h1 className="text-lg font-semibold mb-1">Nothing here</h1>
        <p className="text-gray-500 text-sm mb-6 break-all">
          <code>{location.pathname}</code> is not a page in this panel.
        </p>
        <Link to="/dashboard" className="btn btn-primary">
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
