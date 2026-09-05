import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const account = useAuthStore((state) => state.account);

  return { isAuthenticated, isLoading, account };
}
