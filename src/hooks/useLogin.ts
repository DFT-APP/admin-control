import { useMutation } from "@tanstack/react-query";
import { useAuthStore, type AdminAccount } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";

export function useLogin() {
  const login = useAuthStore((s) => s.login);
  const setAccount = useAuthStore((s) => s.setAccount);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (credentials: { userEmail: string; password: string }) => {
      const res = await apiClient<{ data: { token: string } }>(
        "/api/users/login",
        { method: "POST", body: JSON.stringify(credentials) }
      );

      const token = res.data.token;

      // Signing in is not the same as being allowed in here: /api/users/login
      // authenticates any user on the platform. Store the token so the next
      // request carries it, then ask an admin-only endpoint whether this
      // account actually has the role. The server is the authority.
      localStorage.setItem("token", token);

      try {
        const account = await apiClient<{ data: AdminAccount }>(
          "/api/admin/settings/account"
        );
        return { token, account: account.data };
      } catch {
        localStorage.removeItem("token");
        throw new Error("This account does not have admin access");
      }
    },

    onSuccess: ({ token, account }) => {
      login(token);
      setAccount(account);
      toast.success(`Welcome back, ${account.userName}`);
      navigate("/dashboard");
    },

    onError: (error: Error) => {
      toast.error(error.message || "Login failed");
    },
  });
}
