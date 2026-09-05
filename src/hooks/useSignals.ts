import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { ApiResponse, Paginated } from "@/lib/api-types";

export type AdminSignal = {
  signalId: number;
  analystId: number;
  analyst: string;
  analystAvatar: string | null;
  token: string | null;
  pair: string | null;
  market: string;
  exchange: string | null;
  type: string | null;
  status: string;
  tradeCall: string | null;
  leverage: number | null;
  marginType: string | null;
  entryFrom: number | null;
  entryTo: number | null;
  stopLoss: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  riskPercentage: number | null;
  profitLossPercentage: number | null;
  lastPrice: number | null;
  credit: number | null;
  createdAt: string;
  /** How many users spent credits to unlock this signal. */
  redemptions: number;
  /** Followers the posting analyst had — the signal's potential audience. */
  reach: number;
};

export type SignalsSummary = {
  active: number;
  pending: number;
  closedToday: number;
  redemptionsToday: number;
};

export function useSignals(filters: {
  page: number;
  status?: string;
  search?: string;
}) {
  const { page, status, search } = filters;
  return useQuery({
    queryKey: ["admin", "signals", page, status ?? "", search ?? ""],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      return apiClient<
        ApiResponse<Paginated<{ signals: AdminSignal[]; summary: SignalsSummary }>>
      >(`/api/admin/signals?${params.toString()}`).then((r) => r.data);
    },
    placeholderData: (prev) => prev,
    // The desk shows live positions, so keep it fresher than the rest of the panel.
    refetchInterval: 30_000,
  });
}
