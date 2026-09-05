import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import type { ApiResponse } from "@/lib/api-types";

export type AdminUserRow = {
  userId: number;
  userName: string;
  userEmail: string;
  userEmoji: string | null;
  roles: string[];
  createdAt: string;
};

export type SystemStatus = {
  environment: string;
  nodeVersion: string;
  platform: string;
  hostname: string;
  uptimeSeconds: number;
  memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number };
  database: string;
  databaseLatencyMs: number | null;
  /** True while the server still accepts pre-JWT tokens — a temporary state. */
  legacyTokensAccepted: boolean;
  serverTime: string;
};

/* ───────────────────────────── Queries ─────────────────────────── */

export function useAdmins() {
  return useQuery({
    queryKey: ["admin", "settings", "admins"],
    queryFn: () =>
      apiClient<ApiResponse<{ admins: AdminUserRow[]; currentUserId: number }>>(
        "/api/admin/settings/admins"
      ).then((r) => r.data),
  });
}

export function useSystemStatus() {
  return useQuery({
    queryKey: ["admin", "settings", "system"],
    queryFn: () =>
      apiClient<ApiResponse<SystemStatus>>("/api/admin/settings/system").then(
        (r) => r.data
      ),
    refetchInterval: 60_000,
  });
}

/* ──────────────────────────── Mutations ────────────────────────── */

export function useAddAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { userEmail?: string; userId?: number }) =>
      apiClient<ApiResponse<AdminUserRow>>("/api/admin/settings/admins", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin", "settings", "admins"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(`${res.data.userName} is now an admin`);
    },
    onError: (e: Error) => toast.error(e.message || "Could not add admin"),
  });
}

export function useRemoveAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) =>
      apiClient<ApiResponse<unknown>>(`/api/admin/settings/admins/${userId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "settings", "admins"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Admin access revoked");
    },
    onError: (e: Error) => toast.error(e.message || "Could not revoke access"),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      apiClient<ApiResponse<null>>("/api/admin/settings/password", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => toast.success("Password updated"),
    onError: (e: Error) => toast.error(e.message || "Could not change password"),
  });
}
