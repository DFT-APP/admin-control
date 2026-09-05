import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import type { ApiResponse, Paginated } from "@/lib/api-types";

export type AdminWallet = {
  walletId: number;
  userId: number;
  userName: string;
  userEmail: string;
  balance: number;
  status: string;
  updatedAt: string;
  entries: number;
};

export type LedgerEntry = {
  entryId: number;
  userId: number;
  userName: string;
  direction: "CREDIT" | "DEBIT";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: number | null;
  createdAt: string;
};

export type AdminWithdrawal = {
  withdrawalId: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  amount: number;
  method: string;
  destination: string;
  status: string;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  history: { status: string; note: string | null; at: string }[];
};

/** Which statuses a withdrawal may move to next; PAID/FAILED/CANCELLED are final. */
export const WITHDRAWAL_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PROCESSING", "PAID", "FAILED", "CANCELLED"],
  PROCESSING: ["PAID", "FAILED", "CANCELLED"],
  PAID: [],
  FAILED: [],
  CANCELLED: [],
};

/* ───────────────────────────── Queries ─────────────────────────── */

export function useWallets(page: number, search: string) {
  return useQuery({
    queryKey: ["admin", "credits", "wallets", page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (search) params.set("search", search);
      return apiClient<
        ApiResponse<
          Paginated<{
            wallets: AdminWallet[];
            totals: { totalBalance: number; totalWallets: number; fundedWallets: number };
          }>
        >
      >(`/api/admin/credits/wallets?${params.toString()}`).then((r) => r.data);
    },
    placeholderData: (prev) => prev,
  });
}

export function useLedger(filters: {
  page: number;
  direction?: string;
  referenceType?: string;
  search?: string;
}) {
  const { page, direction, referenceType, search } = filters;
  return useQuery({
    queryKey: [
      "admin", "credits", "ledger", page, direction ?? "", referenceType ?? "", search ?? "",
    ],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (direction) params.set("direction", direction);
      if (referenceType) params.set("referenceType", referenceType);
      if (search) params.set("search", search);
      return apiClient<
        ApiResponse<Paginated<{ entries: LedgerEntry[]; referenceTypes: string[] }>>
      >(`/api/admin/credits/ledger?${params.toString()}`).then((r) => r.data);
    },
    placeholderData: (prev) => prev,
  });
}

export function useWithdrawals(page: number, status: string) {
  return useQuery({
    queryKey: ["admin", "credits", "withdrawals", page, status],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (status) params.set("status", status);
      return apiClient<
        ApiResponse<
          Paginated<{ withdrawals: AdminWithdrawal[]; counts: Record<string, number> }>
        >
      >(`/api/admin/credits/withdrawals?${params.toString()}`).then((r) => r.data);
    },
    placeholderData: (prev) => prev,
  });
}

/* ──────────────────────────── Mutations ────────────────────────── */

export function useAdjustCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      userId: number;
      direction: "CREDIT" | "DEBIT";
      amount: number;
      note?: string;
    }) =>
      apiClient<ApiResponse<{ balanceAfter: number; userName: string }>>(
        "/api/admin/credits/adjust",
        { method: "POST", body: JSON.stringify(body) }
      ),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin", "credits"] });
      qc.invalidateQueries({ queryKey: ["admin", "analytics"] });
      toast.success(
        `${res.data.userName} now holds ${res.data.balanceAfter.toLocaleString()} credits`
      );
    },
    onError: (e: Error) => toast.error(e.message || "Adjustment failed"),
  });
}

export function useUpdateWithdrawalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      withdrawalId,
      status,
      note,
    }: {
      withdrawalId: number;
      status: string;
      note?: string;
    }) =>
      apiClient<ApiResponse<unknown>>(
        `/api/admin/credits/withdrawals/${withdrawalId}/status`,
        { method: "PATCH", body: JSON.stringify({ status, note }) }
      ),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "credits"] });
      toast.success(`Withdrawal marked ${vars.status}`);
    },
    onError: (e: Error) => toast.error(e.message || "Could not update withdrawal"),
  });
}
