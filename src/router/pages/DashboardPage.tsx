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
import { ChevronDown, MessageCircle } from "lucide-react";
import { useRecentTrades } from "@/hooks/useAdmin";
import { useAnalytics } from "@/hooks/useAnalytics";
import { CHART } from "@/lib/api-types";
import { ActivityRail } from "@/components/dashboard/ActivityRail";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(n: number | undefined) {
  if (n == null) return "—";
  return Math.round(n).toLocaleString();
}

/** Windows the range picker offers. The API floor is 1 day, hence "Today". */
const RANGES = [
  { label: "Today", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

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
          dot={false}
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
            const pl = Number(t.profitLossPercentage) || 0;
            return (
              <li key={t.tradeId} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-200 truncate">{t.trader}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {t.pair} · {t.type}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold flex-shrink-0 ${
                    pl >= 0 ? "text-[#a3e635]" : "text-red-400"
                  }`}
                >
                  {pl >= 0 ? "+" : ""}
                  {pl}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function ChatsPanel() {
  return (
    <Panel title="Chats" className="h-[320px] sm:h-[380px]">
      {/* No conversations API exists yet — show the shell rather than invent data. */}
      <EmptyState>
        <span className="flex flex-col items-center gap-2 text-gray-600">
          <MessageCircle size={22} strokeWidth={1.5} />
          Chat activity isn’t available yet
        </span>
      </EmptyState>
    </Panel>
  );
}

function RevenuePanel({
  data,
  total,
  loading,
}: {
  data: { day: string; credit: number }[];
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
      ) : data.length === 0 ? (
        <EmptyState>No credit purchases in this period</EmptyState>
      ) : (
        <TrendArea
          data={data}
          dataKey="credit"
          color={CHART.accent}
          gradientId="revenueGradient"
        />
      )}
    </Panel>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [days, setDays] = useState(1);
  const { data, isLoading, isError, error } = useAnalytics(days);

  const summary = data?.summary;
  const outcomeFlow = data?.outcomeFlow ?? [];
  const ledgerFlow = data?.ledgerFlow ?? [];
  const revenueTotal = summary?.creditsIssued ?? 0;

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

        {/* Stat cards */}
        {/* All five sit on one row from lg up. The first two carry longer
            labels, so they take a wider track rather than forcing a wrap. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[1.25fr_1.25fr_1fr_1fr_1fr] gap-3 sm:gap-4 mb-3 sm:mb-4">
          <StatCard label="Total Users" value={formatNumber(summary?.totalUsers)} loading={isLoading} />
          <StatCard label="Purchased Credits" value={formatNumber(summary?.creditsIssued)} loading={isLoading} />
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
            ) : outcomeFlow.length === 0 ? (
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
            ) : outcomeFlow.length === 0 ? (
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
          <ChatsPanel />
          <RevenuePanel data={ledgerFlow} total={revenueTotal} loading={isLoading} />
        </div>
      </div>

      <ActivityRail />
    </div>
  );
}
