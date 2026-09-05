import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { Menu, Search, LogOut, Settings as SettingsIcon, X } from "lucide-react";
import { Logo } from "./Logo";
import type { AdminAccount } from "@/store/authStore";

function Header({ setIsOpen }: { setIsOpen: (val: boolean) => void }) {
  const logout = useAuthStore((s) => s.logout);
  const account = useAuthStore((s) => s.account);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  // The account menu exists twice — once in the desktop chrome, once in the
  // mobile bar — so the outside-click check has to know about both.
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // Close the menu on an outside click or Escape — without this it stays open
  // behind whatever you click next.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const inside =
        desktopMenuRef.current?.contains(target) ||
        mobileMenuRef.current?.contains(target);
      if (!inside) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // The phone search field only exists once it is opened, so focus has to be
  // moved to it after the render that creates it.
  useEffect(() => {
    if (searchOpen) mobileSearchRef.current?.focus();
  }, [searchOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // The only searchable directory in the panel is the user list, so the global
  // field hands its term to that page rather than pretending to search sitewide.
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    setSearchOpen(false);
    navigate(`/users?q=${encodeURIComponent(term)}`);
  };

  const initial = (account?.userName || "A").charAt(0).toUpperCase();

  return (
    <header
      className="relative flex items-stretch h-16 bg-[#0b0b0b] border-b border-white/5 flex-shrink-0"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        height: "calc(4rem + env(safe-area-inset-top))",
      }}
    >
      {/* Account chip — sits above the sidebar column on desktop. */}
      <div className="flex items-center gap-1 sm:gap-2 pl-2 pr-2 sm:px-4 lg:w-60 lg:flex-shrink-0 lg:border-r lg:border-white/5">
        <button
          className="lg:hidden p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 flex-shrink-0"
          onClick={() => setIsOpen(true)}
          aria-label="Open navigation"
          aria-controls="app-sidebar"
        >
          <Menu size={22} />
        </button>

        {/* On a phone the brand belongs here, next to the menu button — the
            right edge is needed for the search and account controls. */}
        <Logo className="h-7 lg:hidden" />

        <div className="relative hidden lg:block" ref={desktopMenuRef}>
          <AccountButton
            account={account}
            initial={initial}
            open={open}
            onToggle={() => setOpen(!open)}
            showName
          />
          {open && (
            <AccountMenu
              account={account}
              onSettings={() => {
                setOpen(false);
                navigate("/settings");
              }}
              onLogout={handleLogout}
            />
          )}
        </div>
      </div>

      {/* Search — a full field from lg up, a single icon below it. */}
      <form
        onSubmit={handleSearch}
        className="hidden lg:flex flex-1 items-center px-4 lg:px-6 min-w-0"
      >
        <div className="flex items-center gap-3 w-full max-w-xl">
          <Search size={18} className="text-gray-500 flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users"
            aria-label="Search users"
            type="search"
            className="w-full bg-transparent text-[15px] text-gray-100 placeholder:text-gray-500 outline-none"
          />
        </div>
      </form>

      {/* Spacer that pushes the mobile controls to the right edge. */}
      <div className="flex-1 lg:hidden" />

      <div className="flex items-center gap-1 pr-2 lg:hidden">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Open search"
          aria-expanded={searchOpen}
          className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
        >
          <Search size={20} />
        </button>

        <div className="relative" ref={mobileMenuRef}>
          <AccountButton
            account={account}
            initial={initial}
            open={open}
            onToggle={() => setOpen(!open)}
          />
          {open && (
            <AccountMenu
              account={account}
              align="right"
              onSettings={() => {
                setOpen(false);
                navigate("/settings");
              }}
              onLogout={handleLogout}
            />
          )}
        </div>
      </div>

      {/* Brand — aligned over the activity rail column on wide screens. */}
      <div className="hidden lg:flex items-center justify-center px-6 xl:w-[320px] xl:flex-shrink-0 xl:border-l xl:border-white/5">
        <Logo className="h-9" />
      </div>

      {/*
        On a phone the search field takes over the whole bar while it is in
        use, which is the only way to give it a usable width at 390px.
      */}
      {searchOpen && (
        <form
          onSubmit={handleSearch}
          className="absolute inset-0 z-10 flex items-center gap-2 px-3 bg-[#0b0b0b] lg:hidden"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <Search size={18} className="text-gray-500 flex-shrink-0" />
          <input
            ref={mobileSearchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
            placeholder="Search users"
            aria-label="Search users"
            type="search"
            className="flex-1 min-w-0 bg-transparent text-base text-gray-100 placeholder:text-gray-500 outline-none"
          />
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
            className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 flex-shrink-0"
          >
            <X size={20} />
          </button>
        </form>
      )}
    </header>
  );
}

type Account = AdminAccount | null;

function AccountButton({
  account,
  initial,
  open,
  onToggle,
  showName,
}: {
  account: Account;
  initial: string;
  open: boolean;
  onToggle: () => void;
  showName?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label="Account menu"
      className="flex items-center gap-3 rounded-full py-1 pl-1 pr-1 sm:pr-3 hover:bg-white/5 transition-colors"
    >
      <span className="w-9 h-9 rounded-full bg-[#a3e635] text-black text-sm font-bold flex items-center justify-center flex-shrink-0">
        {account?.userEmoji || initial}
      </span>
      {showName && (
        <span className="text-[15px] font-medium text-gray-100 truncate max-w-[7rem]">
          {account?.userName || "Admin"}
        </span>
      )}
    </button>
  );
}

function AccountMenu({
  account,
  align = "left",
  onSettings,
  onLogout,
}: {
  account: Account;
  align?: "left" | "right";
  onSettings: () => void;
  onLogout: () => void;
}) {
  return (
    <div
      role="menu"
      className={`absolute ${
        align === "right" ? "right-0" : "left-0"
      } mt-2 w-56 bg-[#141414] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50`}
    >
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-gray-200 text-sm truncate">{account?.userName}</p>
        <p className="text-gray-500 text-xs truncate">{account?.userEmail}</p>
      </div>

      <button
        role="menuitem"
        onClick={onSettings}
        className="w-full flex items-center gap-2 text-left px-4 py-3 text-sm text-gray-200 hover:bg-white/10"
      >
        <SettingsIcon size={16} /> Settings
      </button>

      <button
        role="menuitem"
        onClick={onLogout}
        className="w-full flex items-center gap-2 text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10"
      >
        <LogOut size={16} /> Log out
      </button>
    </div>
  );
}

export default Header;
