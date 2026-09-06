import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { ApiResponse } from "@/lib/api-types";

export type AnalyticsSummary = {
  totalUsers: number;
  totalAnalysts: number;
  totalTrades: number;
  activeTrades: number;
  newUsers: number;
  newTrades: number;
  settledTrades: number;
  winRate: number;
  avgRoi: number;
  bestRoi: number;
  worstRoi: number;
  walletBalance: number;
  walletCount: number;
  creditsIssued: number;
  creditsSpent: number;
  /** Credits that were actually bought — revenue, as opposed to refunds and gifts. */
  creditsPurchased: number;
};

export type TopAnalyst = {
  analystId: number;
  userName: string;
  userEmoji: string | null;
  trades: number;
  wins: number;
  avgRoi: number;
  winRate: number;
};

export type Analytics = {
  range: { days: number };
  summary: AnalyticsSummary;
  outcomes: { wins: number; losses: number; breakeven: number };
  /** Per-day profitable / losing closes over the window. */
  outcomeFlow: { day: string; wins: number; losses: number }[];
  userGrowth: { day: string; users: number }[];
  tradeActivity: { day: string; trades: number }[];
  ledgerFlow: { day: string; credit: number; debit: number; purchases: number }[];
  topAnalysts: TopAnalyst[];
  exchanges: { name: string; trades: number }[];
  pairs: { name: string; trades: number }[];
};

export function useAnalytics(days: number) {
  return useQuery({
    queryKey: ["admin", "analytics", days],
    queryFn: () =>
      apiClient<ApiResponse<Analytics>>(`/api/admin/analytics?days=${days}`).then(
        (r) => r.data
      ),
    placeholderData: (prev) => prev,
  });
}
