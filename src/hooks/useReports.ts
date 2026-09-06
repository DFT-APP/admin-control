import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import type { ApiResponse } from "@/lib/api-types";

export type ReportStatus = "PENDING" | "REVIEWED" | "DISMISSED";
export type ReportReason = "scam" | "fake" | "spam" | "pump_dump";

export type TradeReport = {
  id: number;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  tradeId: number;
  reporterId: number | null;
  reporterName: string | null;
  reporterEmail: string | null;
  token: string | null;
  pair: string | null;
  type: string | null;
  exchange: string | null;
  tradeStatus: string | null;
  profitLossPercentage: number | null;
  tradeComment: string | null;
  tradeCreatedAt: string | null;
  tradeDeleted: boolean;
  analystId: number | null;
  analystUserId: number | null;
  analystName: string | null;
  /** How many reports in total name this trade — one row's weight of complaint. */
  reportsOnTrade: number;
};

type ReportPage = {
  reports: TradeReport[];
  counts: Partial<Record<ReportStatus, number>>;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export const REPORT_STATUSES: ReportStatus[] = ["PENDING", "REVIEWED", "DISMISSED"];

export const REPORT_REASONS: ReportReason[] = ["scam", "fake", "spam", "pump_dump"];

export const REASON_LABELS: Record<ReportReason, string> = {
  scam: "Scam",
  fake: "Fake",
  spam: "Spam",
  pump_dump: "Pump & dump",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: "Pending",
  REVIEWED: "Actioned",
  DISMISSED: "Dismissed",
};

export function useReports(filters: {
  page: number;
  status?: string;
  reason?: string;
}) {
  const { page, status, reason } = filters;
  return useQuery({
    queryKey: ["admin", "reports", page, status ?? "", reason ?? ""],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (status) params.set("status", status);
      if (reason) params.set("reason", reason);
      return apiClient<ApiResponse<ReportPage>>(
        `/api/admin/reports?${params.toString()}`
      ).then((r) => r.data);
    },
    placeholderData: (prev) => prev,
  });
}

/**
 * Just the pending count, for the dashboard banner. Reports sitting unseen is
 * the failure this whole section exists to prevent, so the number is fetched
 * even on pages that do not list them.
 */
export function usePendingReportCount() {
  return useQuery({
    queryKey: ["admin", "reports", "pending-count"],
    queryFn: () =>
      apiClient<ApiResponse<ReportPage>>(
        "/api/admin/reports?page=1&limit=1&status=PENDING"
      ).then((r) => r.data.counts.PENDING ?? 0),
    staleTime: 60_000,
  });
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      scope,
    }: {
      id: number;
      status: "REVIEWED" | "DISMISSED";
      /** "trade" closes every pending report against the same trade. */
      scope?: "trade";
    }) =>
      apiClient<ApiResponse<{ affected: number }>>(`/api/admin/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, scope }),
      }),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
      const n = res.data.affected;
      toast.success(
        `${n} report${n === 1 ? "" : "s"} marked ${REPORT_STATUS_LABELS[vars.status].toLowerCase()}`
      );
    },
    onError: (e: Error) => toast.error(e.message || "Could not update the report"),
  });
}
