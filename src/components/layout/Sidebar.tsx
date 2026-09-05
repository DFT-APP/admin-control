import { useCallback, useEffect, useSyncExternalStore } from "react"
import { NavLink } from "react-router-dom"
import {
  House,
  Users,
  UserSearch,
  TrendingUp,
  RadioTower,
  Video,
  Tag,
  Flag,
  Coins,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react"
import { Logo } from "./Logo"

/** Every entry here must resolve to a real route — see router.tsx. */
const navItems: { label: string; to: string; icon: LucideIcon }[] = [
  { label: "Dashboard", to: "/dashboard", icon: House },
  { label: "Users", to: "/users", icon: Users },
  { label: "Analysts", to: "/analysts", icon: UserSearch },
  { label: "Trades", to: "/trades", icon: TrendingUp },
  { label: "Signals", to: "/signals", icon: RadioTower },
  { label: "Videos", to: "/videos", icon: Video },
  { label: "Credits", to: "/credits", icon: Tag },
  { label: "Analytics", to: "/analytics", icon: Flag },
  { label: "Coin Icons", to: "/coin-icons", icon: Coins },
  { label: "Settings", to: "/settings", icon: Settings },
]

const DESKTOP_QUERY = "(min-width: 1024px)"

/**
 * Subscribes to a media query as an external store, which keeps the value in
 * sync without an effect that writes state on every mount.
 */
function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    [query]
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    // The panel never server-renders, but a stable snapshot keeps the hook
    // honest and matches the mobile-first CSS.
    () => false
  )
}

function Sidebar({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean
  setIsOpen: (val: boolean) => void
}) {
  // The same element is a modal drawer below lg and a permanent column above
  // it. Only the drawer form should be hidden from assistive tech and taken
  // out of the tab order while it is closed.
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const hidden = !isDesktop && !isOpen

  // Below lg the sidebar is a modal drawer: Escape has to close it, and the
  // page behind it must not scroll while it is open.
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, setIsOpen])

  return (
    <>
      {/* Scrim — tap anywhere outside to dismiss. */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-30 lg:hidden overlay-in"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        aria-label="Main navigation"
        aria-hidden={hidden || undefined}
        // Keeps the off-screen drawer's ten links out of the tab order.
        inert={hidden}
        className={`
          fixed top-0 left-0 z-40 h-[100dvh] w-[17rem] max-w-[85vw]
          bg-[#0b0b0b] border-r border-white/5
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:relative lg:translate-x-0 lg:z-auto lg:flex-shrink-0
          lg:w-60 lg:max-w-none lg:h-auto lg:transition-none
        `}
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingLeft: "env(safe-area-inset-left)",
        }}
      >
        {/* The desktop layout puts the brand and account chip in the header,
            so this row only exists inside the drawer. */}
        <div className="flex items-center justify-between gap-2 h-16 px-4 border-b border-white/5 flex-shrink-0 lg:hidden">
          <Logo className="h-8" />
          <button
            className="p-2 -mr-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* A short phone in landscape cannot show ten items at once. */}
        <nav className="flex-1 min-h-0 overflow-y-auto touch-scroll flex flex-col gap-1 px-3 py-4 lg:px-4">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3.5 rounded-xl text-[15px] font-medium
                min-h-[46px] transition-colors duration-150
                ${
                  isActive
                    ? "bg-[#a3e635]/10 text-[#a3e635]"
                    : "text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10"
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    strokeWidth={1.75}
                    className={`flex-shrink-0 ${isActive ? "text-[#a3e635]" : "text-gray-400"}`}
                  />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div
          className="px-4 pt-3 pb-4 border-t border-white/5 flex-shrink-0"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <p className="text-gray-600 text-xs">DFT Admin Console</p>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
