import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";

/* ───────────────────────────── Types ───────────────────────────── */

type ApiResponse<T> = {
  status: boolean;
  code: number;
  message: string;
  data: T;
};

export type AdminUser = {
  userId: number;
  userName: string;
  userEmail: string;
  userEmoji?: string;
  colorId?: number | null;
  profileColor?: string | null;
  selectedBgColorIndex?: number | null;
  phone?: string | null;
  availableBalance?: string | number;
  redeemBalance?: string | number;
  deviceType?: string | null;
  fcmToken?: string | null;
  roles: string[];
  isAdmin: boolean;
  isAnalyst: boolean;
  analystId?: number | null;
  isAnalystFormFilled: boolean;
  isAdminApprovedAnalyst: boolean;
  status: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type AdminAnalyst = {
  analystId: number;
  userId: number;
  userName: string;
  userEmail: string;
  userEmoji?: string;
  profileColor?: string;
  bio?: string;
  twitter?: string;
  youtube?: string;
  discord?: string;
  timeZone?: string;
  isApproved: boolean;
  /** Derived server-side: "Approved" | "Pending" | "Rejected". */
  status: string;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  totalTrades: number;
  activeTrades: number;
  closedTrades: number;
  createdAt: string;
};

export type AdminStats = {
  totalUsers: number;
  totalAnalysts: number;
  totalTrades: number;
  activeTrades: number;
  totalBalance: number;
  userGrowth: { day: string; users: number }[];
  tradeActivity: { day: string; trades: number }[];
};

export type AdminTrade = {
  tradeId: number;
  trader: string;
  token: string | null;
  pair: string;
  exchange: string;
  type: string;
  status: string;
  /**
   * Live for an open trade, the settled figure once closed. Null when the
   * trade is open but no cached price exists for its market — which is a
   * different thing from flat, and must not be drawn as 0%.
   */
  profitLossPercentage: number | null;
  /** True when the figure above is a running number, not a settled one. */
  isLive: boolean;
  currentPrice: number | null;
  entryPrice: number | null;
  leverage: number | null;
};

/** Full trade record exposing every parameter for the admin Trades section. */
export type AdminTradeFull = {
  tradeId: number;
  analystId: number;
  trader: string;
  traderEmail: string | null;
  traderEmoji: string | null;
  title: string | null;
  pair: string;
  exchange: string;
  type: string;
  order: string | null;
  tradeCall: string | null;
  status: string;
  tradeStatusType: string | null;
  tradeStrategy: string | null;
  tradeTypeName: string | null;
  tradeTypeOption: string | null;
  tradeRiskType: string | null;
  amount: string | null;
  balance: string | null;
  leverage: number | null;
  marginType: string | null;
  riskPercentage: string | number | null;
  risk: string | null;
  entryFrom: string | null;
  entryTo: string | null;
  limitToMarket: string | null;
  stopLoss: string | null;
  stopLossMode: string | null;
  stopLossComment: string | null;
  tp1: string | null;
  tp2: string | null;
  tp3: string | null;
  tpClose: string | null;
  takeProfitNow: string | number | null;
  closePrice: string | number | null;
  closeStatus: number | null;
  closedAt: string | null;
  profitLoss: string | number | null;
  profitLossPercentage: string | number | null;
  lastProfit: string | null;
  lastRealCoinPrice: string | null;
  isTradeActive: boolean;
  dex: boolean;
  default: boolean;
  token: string | null;
  tokenAddress: string | null;
  challengeName: string | null;
  credit: string | number | null;
  analystEmoji: string | null;
  comment: string | null;
  description: string | null;
  tags: string[];
  images: string[];
  image: string | null;
  bullishVideos: string[];
  bearishVideos: string[];
  reactionVideos: string[];
  reactionVideo: string | null;
  comments: string[];
  uploadPnls: unknown[];
  tradeActionHistory: unknown[];
  userId: string | null;
  userName: string | null;
  start: string | null;
  end: string | null;
  time: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TradeFilters = {
  page: number;
  search?: string;
  status?: string;
  type?: string;
  exchange?: string;
};

type Paginated<T> = {
  total: number;
  page: number;
  totalPages: number;
} & T;

/* ───────────────────────────── Queries ─────────────────────────── */

export function useStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () =>
      apiClient<ApiResponse<AdminStats>>("/api/admin/stats").then((r) => r.data),
  });
}

export function useUsers(page: number, search: string) {
  return useQuery({
    queryKey: ["admin", "users", page, search],
    queryFn: () =>
      apiClient<ApiResponse<Paginated<{ users: AdminUser[] }>>>(
        `/api/admin/users?page=${page}&limit=50${
          search ? `&search=${encodeURIComponent(search)}` : ""
        }`
      ).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
}

export type AnalystStatusFilter = "all" | "pending" | "approved" | "rejected";

export function useAnalysts(
  page: number,
  search: string,
  status: AnalystStatusFilter = "all"
) {
  return useQuery({
    queryKey: ["admin", "analysts", page, search, status],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      return apiClient<ApiResponse<Paginated<{ analysts: AdminAnalyst[] }>>>(
        `/api/admin/analysts?${params.toString()}`
      ).then((r) => r.data);
    },
    placeholderData: (prev) => prev,
  });
}

export function useRecentTrades(status?: string) {
  return useQuery({
    queryKey: ["admin", "trades", status ?? "all"],
    queryFn: () =>
      apiClient<ApiResponse<{ trades: AdminTrade[] }>>(
        `/api/admin/trades?limit=8${status ? `&status=${status}` : ""}`
      ).then((r) => r.data.trades),
  });
}

export function useAllTrades(filters: TradeFilters) {
  const { page, search, status, type, exchange } = filters;
  return useQuery({
    queryKey: ["admin", "all-trades", page, search ?? "", status ?? "", type ?? "", exchange ?? ""],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (exchange) params.set("exchange", exchange);
      return apiClient<ApiResponse<Paginated<{ trades: AdminTradeFull[] }>>>(
        `/api/admin/all-trades?${params.toString()}`
      ).then((r) => r.data);
    },
    placeholderData: (prev) => prev,
  });
}

/* ──────────────────────────── Mutations ────────────────────────── */

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      ...body
    }: { userId: number; password?: string } & Partial<AdminUser>) =>
      apiClient<ApiResponse<AdminUser>>(`/api/admin/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("User updated");
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) =>
      apiClient<ApiResponse<unknown>>(`/api/admin/users/${userId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("User deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });
}

export function useUpdateAnalyst() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      analystId,
      ...body
    }: { analystId: number } & Partial<AdminAnalyst>) =>
      apiClient<ApiResponse<AdminAnalyst>>(`/api/admin/analysts/${analystId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "analysts"] });
      toast.success("Analyst updated");
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });
}

/**
 * Approve / reject / reset an application. Kept separate from useUpdateAnalyst
 * so the row actions cannot accidentally submit profile fields alongside a
 * status change.
 */
export function useSetAnalystStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      analystId,
      status,
      rejectionReason,
    }: {
      analystId: number;
      status: "approved" | "pending" | "rejected";
      rejectionReason?: string;
    }) =>
      apiClient<ApiResponse<AdminAnalyst>>(`/api/admin/analysts/${analystId}`, {
        method: "PUT",
        body: JSON.stringify({ status, rejectionReason }),
      }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "analysts"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success(
        vars.status === "approved"
          ? "Analyst approved"
          : vars.status === "rejected"
            ? "Analyst rejected"
            : "Analyst moved back to pending"
      );
    },
    onError: (e: Error) => toast.error(e.message || "Could not update status"),
  });
}

export function useDeleteAnalyst() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (analystId: number) =>
      apiClient<ApiResponse<unknown>>(`/api/admin/analysts/${analystId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "analysts"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Analyst deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });
}

export function useUpdateTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      tradeId,
      ...body
    }: { tradeId: number } & Partial<AdminTradeFull>) =>
      apiClient<ApiResponse<AdminTradeFull>>(`/api/admin/all-trades/${tradeId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "all-trades"] });
      qc.invalidateQueries({ queryKey: ["admin", "trades"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Trade updated");
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });
}

export function useDeleteTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tradeId: number) =>
      apiClient<ApiResponse<unknown>>(`/api/admin/all-trades/${tradeId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "all-trades"] });
      qc.invalidateQueries({ queryKey: ["admin", "trades"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Trade deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });
}
