export type ApiResponse<T> = {
  status: boolean;
  code: number;
  message: string;
  data: T;
};

export type Paginated<T> = {
  total: number;
  page: number;
  totalPages: number;
} & T;

/**
 * Chart colours, validated against the #111111 chart surface with the dataviz
 * validator (lightness band, chroma floor, CVD separation, contrast).
 *
 * - `accent` carries single-series charts, where there is no identity to confuse.
 * - `series` is the categorical pair for two-series charts (blue/orange).
 * - win/breakeven/loss is a diverging scale — two poles with a neutral midpoint —
 *   kept in the panel's existing profit/loss idiom rather than the generic pair.
 */
export const CHART = {
  accent: "#a3e635",
  series: ["#3987e5", "#d95926"] as const,
  win: "#6f9e00",
  breakeven: "#57534e",
  loss: "#d03b3b",
} as const;
