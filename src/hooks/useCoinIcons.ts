import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"
import { apiClient, apiUpload } from "@/lib/apiClient"

/* ───────────────────────────── Types ───────────────────────────── */

type ApiResponse<T> = {
  status: boolean
  code: number
  message: string
  data: T
}

/**
 * The market folder an icon lives in. It matches the lowercased
 * `tradeTypeOption` the app puts in the icon URL, so these three strings are
 * fixed by the storage layout rather than a preference.
 */
export const MARKETS = ["crypto", "stocks", "forex"] as const
export type Market = (typeof MARKETS)[number]

export type CoinIcon = {
  symbol: string
  market: string
  /** The object key in the bucket, e.g. `crypto/BTC.svg`. */
  key: string
  url: string
  size: number
  updatedAt: string
}

export type CoinIconFilters = {
  market: Market
  page: number
  search?: string
}

type CoinIconList = {
  icons: CoinIcon[]
  total: number
  page: number
  totalPages: number
  market: string
  markets: string[]
}

/** One screen of the grid. Kept here so the pager and the query agree. */
export const ICONS_PER_PAGE = 48

/* ───────────────────────────── Queries ─────────────────────────── */

export function useCoinIcons({ market, page, search }: CoinIconFilters) {
  return useQuery({
    queryKey: ["admin", "coin-icons", market, page, search ?? ""],
    queryFn: () => {
      const params = new URLSearchParams({
        market,
        page: String(page),
        limit: String(ICONS_PER_PAGE),
      })
      if (search) params.set("search", search)
      return apiClient<ApiResponse<CoinIconList>>(
        `/api/admin/coin-icons?${params.toString()}`
      ).then((r) => r.data)
    },
    placeholderData: (prev) => prev,
  })
}

/* ──────────────────────────── Mutations ────────────────────────── */

/**
 * Add an icon for a symbol that has none. The backend answers 409 when one
 * already exists unless `overwrite` is set, which keeps a mistyped symbol from
 * quietly replacing another coin's artwork.
 */
export function useUploadCoinIcon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      symbol,
      market,
      overwrite = false,
    }: {
      file: File
      symbol: string
      market: Market
      overwrite?: boolean
    }) => {
      const body = new FormData()
      body.append("icon", file)
      body.append("symbol", symbol)
      body.append("market", market)
      body.append("overwrite", String(overwrite))
      return apiUpload<ApiResponse<CoinIcon>>("/api/admin/coin-icons", {
        method: "POST",
        body,
      })
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin", "coin-icons"] })
      toast.success(`${res.data.symbol} icon uploaded`)
    },
    onError: (e: Error) => toast.error(e.message || "Upload failed"),
  })
}

/** Swap the artwork behind an existing symbol. The URL never changes. */
export function useReplaceCoinIcon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      symbol,
      market,
    }: {
      file: File
      symbol: string
      market: string
    }) => {
      const body = new FormData()
      body.append("icon", file)
      return apiUpload<ApiResponse<CoinIcon>>(
        `/api/admin/coin-icons/${market}/${encodeURIComponent(symbol)}`,
        { method: "PUT", body }
      )
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin", "coin-icons"] })
      toast.success(`${res.data.symbol} icon updated`)
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  })
}

export function useDeleteCoinIcon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ symbol, market }: { symbol: string; market: string }) =>
      apiClient<ApiResponse<unknown>>(
        `/api/admin/coin-icons/${market}/${encodeURIComponent(symbol)}`,
        { method: "DELETE" }
      ),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "coin-icons"] })
      toast.success(`${vars.symbol} icon deleted`)
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  })
}
