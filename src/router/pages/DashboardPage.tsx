import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown, LifeBuoy, ShieldAlert } from "lucide-react";
import { useRecentTrades } from "@/hooks/useAdmin";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useOpenTicketsPreview } from "@/hooks/useSupport";
import { usePendingReportCount } from "@/hooks/useReports";
import { CHART } from "@/lib/api-types";
import { ActivityRail } from "@/components/dashboard/ActivityRail";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(n: number | undefined) {
  if (n == null) return "—";
  return Math.round(n).toLocaleString();
}

/**
 * The API zero-fills every day in the window so the charts get a continuous
 * line, which means an empty period is a series of zeros rather than an empty
 * array. Panels ask this instead of checking `length`.
 */
function hasValues<T extends Record<string, unknown>>(rows: T[], ...keys: (keyof T)[]) {
  return rows.some((row) => keys.some((key) => Number(row[key]) > 0));
}

/** Windows the range picker offers. The API floor is 1 day, hence "Today". */
const RANGES = [
  { label: "Today", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

/**
 * Trades settle a handful of times a week, so a 24-hour window is empty on most
 * days and the panels read as broken rather than quiet. 30 days is the first
 * window with reliable signal, and matches what the analytics endpoint defaults
 * to on its own. "Today" stays available for checking the current session.
 */
const DEFAULT_RANGE_DAYS = 30;

// ─── Building blocks ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="bg-[#161819] rounded-2xl p-4 sm:p-5 border border-white/[0.06] transition-colors hover:border-white/10">
      {/* Two-line box so every label reserves the same height and the numbers
          below stay on one baseline across the row. */}
      <p className="text-white text-[13px] sm:text-[15px] font-semibold leading-snug mb-2 sm:mb-3 min-h-[2.25rem] sm:min-h-[2.75rem]">
        {label}
      </p>
      {loading ? (
        <div className="h-8 sm:h-10 w-20 sm:w-24 bg-white/5 rounded-lg animate-pulse" />
      ) : (
        <p className="text-[#a3e635] text-[1.75rem] sm:text-[2.25rem] leading-none font-bold tracking-tight">
          {value}
        </p>
      )}
    </div>
  );
}

function Panel({
  title,
  action,
  className = "",
  children,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-[#161819] rounded-2xl border border-white/[0.06] p-4 sm:p-5 flex flex-col transition-colors hover:border-white/10 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-white text-[15px] font-semibold">{title}</h3>
        {action}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full min-h-[140px] flex items-center justify-center text-gray-600 text-sm text-center px-4">
      {children}
    </div>
  );
}

type TooltipProps = {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string | number;
};

const ChartTooltip = ({ active, payload, label }: TooltipProps) => {
  const point = payload?.[0];
  if (!active || point?.value == null) return null;
  return (
    <div className="bg-[#1f1f1f] border border-white/10 rounded-lg px-3 py-2 text-xs text-white shadow-lg">
      <span className="text-gray-400">{label}</span>{" "}
      <span className="font-semibold">{Number(point.value).toLocaleString()}</span>
    </div>
  );
};

/** Single-series area chart shared by the profit, loss and revenue panels. */
function TrendArea({
  data,
  dataKey,
  color,
  gradientId,
  height = "100%",
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  color: string;
  gradientId: string;
  /** Fills the panel by default — every caller sits in a fixed-height card. */
  height?: number | `${number}%`;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
          tick={{ fill: "#6b7280", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          minTickGap={16}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={44}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          // "Today" is two buckets wide. Hiding the dots there leaves a stub
          // that reads as a broken chart, so short series keep their markers.
          dot={data.length <= 10 ? { r: 2.5, fill: color, strokeWidth: 0 } : false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Panels ──────────────────────────────────────────────────────────────────

function ActiveTradesPanel() {
  const { data: trades = [], isLoading } = useRecentTrades("ACTIVE");

  return (
    <Panel
      title="Active Trades"
      className="h-[320px] sm:h-[380px]"
      action={
        <Link to="/trades" className="text-xs text-gray-500 hover:text-[#a3e635] px-2 py-1.5 -mr-2 rounded-lg">
          View all
        </Link>
      }
    >
      {isLoading ? (
        <EmptyState>Loading…</EmptyState>
      ) : trades.length === 0 ? (
        <EmptyState>No open trades right now</EmptyState>
      ) : (
        <ul className="h-full overflow-y-auto divide-y divide-white/5 -mr-1 pr-1">
          {trades.map((t) => {
            // Null means the market has no cached price — an unknown figure,
            // not a flat one. Showing 0% there is what made every open trade
            // read as +0%.
            const pl = t.profitLossPercentage;
            const market = t.token ? `${t.token}/${t.pair}` : t.pair;
            return (
              <li key={t.tradeId} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-200 truncate">{t.trader}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {market} · {t.type}
                  </p>
                </div>
                {pl == null ? (
                  <span
                    className="text-sm text-gray-600 flex-shrink-0"
                    title="No live price for this market yet"
                  >
                    —
                  </span>
                ) : (
                  <span
                    className={`text-sm font-semibold flex-shrink-0 tabular-nums ${
                      pl >= 0 ? "text-[#a3e635]" : "text-red-400"
                    }`}
                    title={
                      t.isLive && t.entryPrice != null && t.currentPrice != null
                        ? `Live — entry ${t.entryPrice}, now ${t.currentPrice}`
                        : undefined
                    }
                  >
                    {pl >= 0 ? "+" : ""}
                    {pl}%
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/**
 * The support queue is the only inbound conversation the product actually has,
 * so the panel that used to promise chat now shows the tickets waiting on a
 * reply. Answering happens on the Support page.
 */
function SupportPanel() {
  const { data, isLoading } = useOpenTicketsPreview();
  const tickets = data?.tickets ?? [];
  const open = data?.counts?.OPEN ?? 0;

  return (
    <Panel
      title="Support"
      className="h-[320px] sm:h-[380px]"
      action={
        <Link to="/support" className="text-xs text-gray-500 hover:text-[#a3e635] px-2 py-1.5 -mr-2 rounded-lg">
          {open > 0 ? `${formatNumber(open)} open` : "View all"}
        </Link>
      }
    >
      {isLoading ? (
        <EmptyState>Loading…</EmptyState>
      ) : tickets.length === 0 ? (
        <EmptyState>
          <span className="flex flex-col items-center gap-2 text-gray-600">
            <LifeBuoy size={22} strokeWidth={1.5} />
            No open tickets
          </span>
        </EmptyState>
      ) : (
        <ul className="h-full overflow-y-auto divide-y divide-white/5 -mr-1 pr-1">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                to="/support"
                className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80"
              >
                <div className="min-w-0">
                  <p className="text-sm text-gray-200 truncate">{t.subject}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {t.user?.userName || "Unknown"} · {t.category}
                  </p>
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {new Date(t.createdAt).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RevenuePanel({
  data,
  total,
  loading,
}: {
  data: { day: string; purchases: number }[];
  total: number;
  loading: boolean;
}) {
  return (
    <Panel
      title="Revenue"
      className="h-[320px] sm:h-[380px]"
      action={
        !loading && (
          <span className="text-sm font-semibold text-[#a3e635]">
            {formatNumber(total)}
          </span>
        )
      }
    >
      {loading ? (
        <EmptyState>Loading…</EmptyState>
      ) : !hasValues(data, "purchases") ? (
        <EmptyState>No credit purchases in this period</EmptyState>
      ) : (
        <TrendArea
          data={data}
          dataKey="purchases"
          color={CHART.accent}
          gradientId="revenueGradient"
        />
      )}
    </Panel>
  );
}

/**
 * Reported trades used to be invisible from here, and the queue quietly grew for
 * months. A count that only exists on its own page is a count nobody reads, so
 * the backlog announces itself on the screen an operator actually opens.
 */
function ReportsBanner() {
  const { data: pending = 0 } = usePendingReportCount();
  if (pending === 0) return null;

  return (
    <Link
      to="/reports"
      className="flex items-center gap-3 bg-amber-400/10 border border-amber-400/30 rounded-2xl px-4 py-3 mb-3 sm:mb-4 hover:border-amber-400/50 transition-colors"
    >
      <ShieldAlert size={18} className="text-amber-400 flex-shrink-0" />
      <span className="text-amber-200 text-sm min-w-0">
        <span className="font-semibold">
          {formatNumber(pending)} reported trade{pending === 1 ? "" : "s"}
        </span>{" "}
        waiting on review
      </span>
      <span className="ml-auto text-amber-400/70 text-xs flex-shrink-0">Review →</span>
    </Link>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [days, setDays] = useState(DEFAULT_RANGE_DAYS);
  const { data, isLoading, isError, error } = useAnalytics(days);

  const summary = data?.summary;
  const outcomeFlow = data?.outcomeFlow ?? [];
  const ledgerFlow = data?.ledgerFlow ?? [];
  const revenueTotal = summary?.creditsPurchased ?? 0;

  return (
    <div className="flex flex-col xl:flex-row min-h-full xl:h-full">
      <div className="flex-1 min-w-0 xl:overflow-y-auto page">
        <div className="flex items-center justify-between gap-4 mb-5 sm:mb-6">
          <h1 className="text-white text-xl sm:text-[28px] font-semibold tracking-tight">
            Overview
          </h1>

          <div className="relative">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              aria-label="Reporting period"
              className="appearance-none bg-transparent text-gray-400 text-sm pr-7 pl-2 min-h-[40px] rounded-lg outline-none cursor-pointer hover:text-white focus:ring-1 focus:ring-white/20"
            >
              {RANGES.map((r) => (
                <option key={r.days} value={r.days} className="bg-[#141414] text-gray-200">
                  {r.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>

        {isError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm mb-5">
            {(error as Error)?.message || "Failed to load statistics"}
          </div>
        )}

        <ReportsBanner />

        {/* Stat cards */}
        {/* All five sit on one row from lg up. The first two carry longer
            labels, so they take a wider track rather than forcing a wrap. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[1.25fr_1.25fr_1fr_1fr_1fr] gap-3 sm:gap-4 mb-3 sm:mb-4">
          <StatCard label="Total Users" value={formatNumber(summary?.totalUsers)} loading={isLoading} />
          <StatCard label="Purchased Credits" value={formatNumber(summary?.creditsPurchased)} loading={isLoading} />
          <StatCard label="Total Trades" value={formatNumber(summary?.totalTrades)} loading={isLoading} />
          <StatCard label="Total Analysts" value={formatNumber(summary?.totalAnalysts)} loading={isLoading} />
          <StatCard label="Open Trades" value={formatNumber(summary?.activeTrades)} loading={isLoading} />
        </div>

        {/* Profit / loss */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
          <Panel
            title="Trades Closed In Profit"
            className="h-[240px] sm:h-[270px]"
            action={
              !isLoading && (
                <span className="text-sm font-semibold text-[#a3e635]">
                  {formatNumber(data?.outcomes.wins)}
                </span>
              )
            }
          >
            {isLoading ? (
              <EmptyState>Loading…</EmptyState>
            ) : !hasValues(outcomeFlow, "wins") ? (
              <EmptyState>No trades closed in profit in this period</EmptyState>
            ) : (
              <TrendArea
                data={outcomeFlow}
                dataKey="wins"
                color={CHART.accent}
                gradientId="winsGradient"
              />
            )}
          </Panel>

          <Panel
            title="Trades Closed In Loss"
            className="h-[240px] sm:h-[270px]"
            action={
              !isLoading && (
                <span className="text-sm font-semibold text-red-400">
                  {formatNumber(data?.outcomes.losses)}
                </span>
              )
            }
          >
            {isLoading ? (
              <EmptyState>Loading…</EmptyState>
            ) : !hasValues(outcomeFlow, "losses") ? (
              <EmptyState>No trades closed in loss in this period</EmptyState>
            ) : (
              <TrendArea
                data={outcomeFlow}
                dataKey="losses"
                color={CHART.loss}
                gradientId="lossesGradient"
              />
            )}
          </Panel>
        </div>

        {/* Activity panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <ActiveTradesPanel />
          <SupportPanel />
          <RevenuePanel data={ledgerFlow} total={revenueTotal} loading={isLoading} />
        </div>
      </div>

      <ActivityRail />
    </div>
  );
}
