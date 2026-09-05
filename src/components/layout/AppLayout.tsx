import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import { useEffect, useRef, useState } from 'react'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  // Only the main pane scrolls, so a route change would otherwise leave the
  // new page halfway down the previous page's scroll position.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    // dvh, not vh: on iOS and Android the browser toolbar collapses as you
    // scroll, and vh keeps reserving the space it used to occupy.
    <div className="h-[100dvh] bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      <Header setIsOpen={setSidebarOpen} />

      <div className="flex flex-1 min-h-0">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        {/* min-w-0 stops a wide table from pushing the whole layout sideways */}
        <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto touch-scroll">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
