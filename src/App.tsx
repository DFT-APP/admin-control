import { ThemeProvider } from 'next-themes'
import { RouterProvider } from 'react-router-dom'
import { router } from './router/router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { useEffect, useState } from 'react'
import { useAuthStore, handleSessionExpired } from '@/store/authStore'
import { setSessionExpiredHandler, ApiHttpError } from '@/lib/apiClient'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { installGlobalErrorReporting } from '@/lib/reportError'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Admin data is read constantly while navigating; a short cache keeps the
      // panel responsive without serving anything meaningfully stale.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retrying a rejected session just repeats the failure and delays the
      // redirect to login. Client errors are final; server/network blips are not.
      retry: (failureCount, error) => {
        const status = error instanceof ApiHttpError ? error.status : 0
        if (status >= 400 && status < 500) return false
        return failureCount < 2
      },
    },
    mutations: { retry: false },
  },
})

// Throws from handlers, timers and promise chains never reach a React error
// boundary, so they are caught at the window instead. Module scope, so a crash
// during the first render is still reported.
installGlobalErrorReporting()

// Registered at module scope so a rejected token clears the session even if it
// happens before the app has finished mounting.
setSessionExpiredHandler(() => {
  handleSessionExpired()
  queryClient.clear()
})

function App() {
  const initAuth = useAuthStore((s) => s.initAuth)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Validates the stored token against the server before anything renders.
    initAuth().finally(() => setReady(true))
  }, [initAuth])

  if (!ready) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-[#0a0a0a]">
        <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#a3e635] animate-spin" />
        <span className="text-gray-500 text-sm">Starting up…</span>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <Toaster richColors />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
