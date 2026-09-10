import { create } from 'zustand'
import { apiClient } from '@/lib/apiClient'
import { clearToken, getToken, setToken } from '@/lib/tokenStorage'

export type AdminAccount = {
  userId: number
  userName: string
  userEmail: string
  userEmoji?: string | null
  roles: string[]
}

type AuthState = {
  token: string | null
  account: AdminAccount | null
  isAuthenticated: boolean
  /** True until the stored token has been checked against the server. */
  isLoading: boolean

  /** `remember` keeps the session past closing the browser. */
  login: (token: string, remember: boolean) => void
  setAccount: (account: AdminAccount | null) => void
  logout: () => void
  /** Validate the stored token and confirm the account still has admin rights. */
  initAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getToken(),
  account: null,
  isAuthenticated: false,
  // A stored token is a claim, not proof — stay loading until the server
  // confirms it. Rendering the panel before that lets a stale or non-admin
  // token flash the whole UI before being kicked out.
  isLoading: !!getToken(),

  initAuth: async () => {
    const token = getToken()

    if (!token) {
      set({ token: null, account: null, isAuthenticated: false, isLoading: false })
      return
    }

    try {
      // Admin-only endpoint: a 403 here means the token is valid but the account
      // is not an admin, which must not be allowed into the panel.
      const res = await apiClient<{ data: AdminAccount }>('/api/admin/settings/account')
      set({ token, account: res.data, isAuthenticated: true, isLoading: false })
    } catch {
      clearToken()
      set({ token: null, account: null, isAuthenticated: false, isLoading: false })
    }
  },

  login: (token, remember) => {
    setToken(token, remember)
    set({ token, isAuthenticated: true, isLoading: false })
  },

  setAccount: (account) => set({ account }),

  logout: () => {
    clearToken()
    set({ token: null, account: null, isAuthenticated: false, isLoading: false })
  },
}))

/** Called by the API client whenever the server rejects our credentials. */
export function handleSessionExpired() {
  if (!useAuthStore.getState().isAuthenticated) return
  useAuthStore.getState().logout()
}
