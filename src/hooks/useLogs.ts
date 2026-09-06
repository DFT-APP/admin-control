import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import type { ApiResponse, Paginated } from "@/lib/api-types";

export type AuditEntry = {
  id: number;
  adminUserId: number | null;
  adminName: string;
  method: string;
  path: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  statusCode: number;
  details: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
};

export type ActivityEntry = {
  id: number;
  userId: number | null;
  userName: string;
  action: string;
  category: string;
  method: string;
  path: string;
  targetType: string | null;
  targetId: string | null;
  statusCode: number;
  details: Record<string, unknown> | null;
  ip: string | null;
  device: string | null;
  createdAt: string;
};

export type SecurityEvent = {
  id: number;
  kind: "unauthorized" | "forbidden" | "rate_limited" | "probe";
  message: string;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  userId: number | null;
  ip: string | null;
  userAgent: string | null;
  context: Record<string, unknown> | null;
  /** Repeat attempts from one origin collapse onto one row; this is how many. */
  occurrences: number;
  lastSeenAt: string;
  createdAt: string;
};

export type RouteStat = {
  method: string;
  route: string;
  hits: number;
  ok: number;
  clientErrors: number;
  serverErrors: number;
  avgMs: number;
  maxMs: number;
  errorRate: number;
};

export type ApiAnalytics = {
  range: string;
  grain: "hour" | "day";
  summary: {
    hits: number;
    ok: number;
    clientErrors: number;
    serverErrors: number;
    routes: number;
    avgMs: number;
    maxMs: number;
    errorRate: number;
  };
  series: {
    bucket: string;
    hits: number;
    clientErrors: number;
    serverErrors: number;
    avgMs: number;
  }[];
  routes: RouteStat[];
  /** The same routes ordered by cost, where volume order would bury them. */
  slowest: RouteStat[];
};

export type ErrorEntry = {
  id: number;
  source: "backend" | "admin";
  level: string;
  message: string;
  stack: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  userId: number | null;
  context: Record<string, unknown> | null;
  /** Identical failures collapse onto one row; this is how many times it hit. */
  occurrences: number;
  lastSeenAt: string;
  createdAt: string;
};

export function useActivityLog(filters: {
  page: number;
  category?: string;
  search?: string;
  failedOnly?: boolean;
}) {
  const { page, category, search, failedOnly } = filters;
  return useQuery({
    queryKey: ["admin", "logs", "activity", page, category ?? "", search ?? "", failedOnly ?? false],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (category) params.set("category", category);
      if (search) params.set("search", search);
      if (failedOnly) params.set("failedOnly", "true");
      return apiClient<
        ApiResponse<
          Paginated<{
            entries: ActivityEntry[];
            categories: string[];
            topUsers: { userId: number; userName: string; actions: number }[];
            topUsersWindow: string;
          }>
        >
      >(`/api/admin/logs/activity?${params.toString()}`).then((r) => r.data);
    },
    placeholderData: (prev) => prev,
  });
}

export function useApiAnalytics(range: string) {
  return useQuery({
    queryKey: ["admin", "logs", "api", range],
    queryFn: () =>
      apiClient<ApiResponse<ApiAnalytics>>(`/api/admin/logs/api?range=${range}`).then(
        (r) => r.data
      ),
    placeholderData: (prev) => prev,
    // Traffic is only interesting if it is current.
    refetchInterval: 60_000,
  });
}

export function useSecurityEvents(filters: { page: number; kind?: string; search?: string }) {
  const { page, kind, search } = filters;
  return useQuery({
    queryKey: ["admin", "logs", "security", page, kind ?? "", search ?? ""],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (kind) params.set("kind", kind);
      if (search) params.set("search", search);
      return apiClient<
        ApiResponse<
          Paginated<{
            events: SecurityEvent[];
            counts: Record<string, { distinct: number; attempts: number }>;
          }>
        >
      >(`/api/admin/logs/security?${params.toString()}`).then((r) => r.data);
    },
    placeholderData: (prev) => prev,
    refetchInterval: 60_000,
  });
}

export function useAuditLog(filters: {
  page: number;
  targetType?: string;
  search?: string;
  failedOnly?: boolean;
}) {
  const { page, targetType, search, failedOnly } = filters;
  return useQuery({
    queryKey: ["admin", "logs", "audit", page, targetType ?? "", search ?? "", failedOnly ?? false],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (targetType) params.set("targetType", targetType);
      if (search) params.set("search", search);
      if (failedOnly) params.set("failedOnly", "true");
      return apiClient<ApiResponse<Paginated<{ entries: AuditEntry[]; targetTypes: string[] }>>>(
        `/api/admin/logs/audit?${params.toString()}`
      ).then((r) => r.data);
    },
    placeholderData: (prev) => prev,
  });
}

export function useErrorLog(filters: { page: number; source?: string; search?: string }) {
  const { page, source, search } = filters;
  return useQuery({
    queryKey: ["admin", "logs", "errors", page, source ?? "", search ?? ""],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (source) params.set("source", source);
      if (search) params.set("search", search);
      return apiClient<
        ApiResponse<
          Paginated<{
            errors: ErrorEntry[];
            counts: Record<string, { distinct: number; total: number }>;
          }>
        >
      >(`/api/admin/logs/errors?${params.toString()}`).then((r) => r.data);
    },
    placeholderData: (prev) => prev,
    // The point of this list is to be current.
    refetchInterval: 60_000,
  });
}

export function useDismissError() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient<ApiResponse<unknown>>(`/api/admin/logs/errors/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "logs", "errors"] });
      toast.success("Error dismissed");
    },
    onError: (e: Error) => toast.error(e.message || "Could not dismiss"),
  });
}

export function useDismissSecurityEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient<ApiResponse<unknown>>(`/api/admin/logs/security/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "logs", "security"] });
      toast.success("Event dismissed");
    },
    onError: (e: Error) => toast.error(e.message || "Could not dismiss"),
  });
}
