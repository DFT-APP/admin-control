import { useState } from "react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts"
import { useAnalytics, type TopAnalyst } from "@/hooks/useAnalytics"
import { CHART } from "@/lib/api-types"

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
]

const fmt = (n: number | undefined) =>
  n == null ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: 2 })

const pct = (n: number | undefined) => (n == null ? "—" : `${n.toFixed(1)}%`)

/* ───────────────────────────── Chrome ──────────────────────────── */

function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-[#111111] rounded-xl p-4 sm:p-5 border border-white/5 ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="text-white text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  tone = "accent",
}: {
  label: string
  value: string
  hint?: string
  tone?: "accent" | "plain" | "good" | "bad"
}) {
  const color =
    tone === "accent"
      ? "text-[#a3e635]"
      : tone === "good"
      ? "text-[#a3e635]"
      : tone === "bad"
      ? "text-red-400"
      : "text-white"
  return (
    <div className="bg-[#111111] rounded-xl p-4 sm:p-5 border border-white/5">
      <p className="text-gray-400 text-xs sm:text-sm mb-2">{label}</p>
      <p className={`${color} text-xl sm:text-2xl font-bold tracking-tight`}>{value}</p>
      {hint && <p className="text-gray-600 text-xs mt-1">{hint}</p>}
    </div>
  )
}

/**
 * Recharts hands its tooltip whatever shape the chart produced, and types it
 * loosely; this is the slice every chart on the page actually renders.
 */
type TooltipEntry = {
  dataKey?: string | number
  name?: string | number
  color?: string
  value?: number | string
}

type TooltipBoxProps = {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
}

const TooltipBox = ({ active, payload, label }: TooltipBoxProps) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-xs text-white">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-gray-300">{p.name}</span>
          <span className="font-medium">{Number(p.value).toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

function Empty({ height = 180 }: { height?: number }) {
  return (
    <div
      className="flex items-center justify-center text-gray-600 text-sm"
      style={{ height }}
    >
      Nothing in this range
    </div>
  )
}

/* ────────────────────────────── Page ───────────────────────────── */

export default function AnalyticsPage() {
  const [days, setDays] = useState(30)
  const { data, isLoading, isError, error } = useAnalytics(days)

  const s = data?.summary
  const outcomes = data?.outcomes
  const settled = outcomes ? outcomes.wins + outcomes.losses + outcomes.breakeven : 0

  // A diverging scale: two poles with a neutral middle, labelled so the
  // meaning never rests on colour alone.
  const outcomeData = outcomes
    ? [
        { name: "Wins", value: outcomes.wins, fill: CHART.win },
        { name: "Break even", value: outcomes.breakeven, fill: CHART.breakeven },
        { name: "Losses", value: outcomes.losses, fill: CHART.loss },
      ]
    : []

  return (
    <div className="page">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">
            Platform activity over the last {days} days
          </p>
        </div>

        <div className="grid grid-cols-4 w-full sm:flex sm:w-auto gap-2">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`chip px-2 sm:px-4 ${days === r.days ? "chip-active" : ""}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm mb-4">
          {(error as Error)?.message || "Failed to load analytics"}
        </div>
      )}

      {isLoading && !data ? (
        <div className="text-gray-500 text-sm">Loading analytics…</div>
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Headline numbers */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Stat
              label="Users"
              value={fmt(s?.totalUsers)}
              hint={`+${fmt(s?.newUsers)} in range`}
            />
            <Stat
              label="Trades"
              value={fmt(s?.totalTrades)}
              hint={`+${fmt(s?.newTrades)} in range · ${fmt(s?.activeTrades)} active`}
            />
            <Stat
              label="Win rate"
              value={pct(s?.winRate)}
              tone={(s?.winRate ?? 0) >= 50 ? "good" : "bad"}
              hint={`${fmt(s?.settledTrades)} settled trades`}
            />
            <Stat
              label="Credits in wallets"
              value={fmt(s?.walletBalance)}
              tone="plain"
              hint={`${fmt(s?.walletCount)} wallets`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <Card title="New users" subtitle="Sign-ups per day">
              {data?.userGrowth.length ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={data.userGrowth} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="usersFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART.accent} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={CHART.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "#6b7280", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} width={38} />
                    <Tooltip content={<TooltipBox />} cursor={{ stroke: "#ffffff20" }} />
                    <Area
                      type="monotone"
                      dataKey="users"
                      name="New users"
                      stroke={CHART.accent}
                      strokeWidth={2}
                      fill="url(#usersFill)"
                      dot={false}
                      activeDot={{ r: 4, fill: CHART.accent, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Empty />
              )}
            </Card>

            <Card title="Trades posted" subtitle="Signals published per day">
              {data?.tradeActivity.length ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.tradeActivity} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} barSize={10}>
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "#6b7280", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} width={38} />
                    <Tooltip content={<TooltipBox />} cursor={{ fill: "#ffffff08" }} />
                    <Bar dataKey="trades" name="Trades" fill={CHART.accent} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty />
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <Card
              title="Credit flow"
              subtitle="Credits added to and spent from wallets, per day"
            >
              {data?.ledgerFlow.length ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.ledgerFlow} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} barSize={8}>
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "#6b7280", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} width={38} />
                    <Tooltip content={<TooltipBox />} cursor={{ fill: "#ffffff08" }} />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: "#9ca3af", paddingTop: 8 }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Bar dataKey="credit" name="Added" fill={CHART.series[0]} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="debit" name="Spent" fill={CHART.series[1]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty />
              )}
            </Card>

            <Card title="Trade outcomes" subtitle={`${settled} settled trades in range`}>
              {settled ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={outcomeData}
                    layout="vertical"
                    margin={{ top: 4, right: 36, left: 8, bottom: 0 }}
                    barSize={18}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "#9ca3af", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={72}
                    />
                    <Tooltip content={<TooltipBox />} cursor={{ fill: "#ffffff08" }} />
                    <Bar dataKey="value" name="Trades" radius={[0, 4, 4, 0]}>
                      {outcomeData.map((d) => (
                        <Cell key={d.name} fill={d.fill} />
                      ))}
                      <LabelList
                        dataKey="value"
                        position="right"
                        style={{ fill: "#e5e7eb", fontSize: 12 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty />
              )}
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div>
                  <p className="text-gray-500">Average ROI</p>
                  <p className={(s?.avgRoi ?? 0) >= 0 ? "text-[#a3e635]" : "text-red-400"}>
                    {s ? `${s.avgRoi > 0 ? "+" : ""}${s.avgRoi}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Best</p>
                  <p className="text-[#a3e635]">{s ? `+${fmt(s.bestRoi)}%` : "—"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Worst</p>
                  <p className="text-red-400">{s ? `${fmt(s.worstRoi)}%` : "—"}</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <Card title="Top analysts" subtitle="By settled trade volume, all time">
              <TopAnalystsTable rows={data?.topAnalysts ?? []} />
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Card title="Exchanges" subtitle="All-time trades">
                <Breakdown rows={data?.exchanges ?? []} />
              </Card>
              <Card title="Markets" subtitle="All-time trades">
                <Breakdown rows={data?.pairs ?? []} />
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────────── Tables ──────────────────────────── */

function TopAnalystsTable({ rows }: { rows: TopAnalyst[] }) {
  if (!rows.length) return <Empty height={140} />

  return (
    <div className="overflow-x-auto touch-scroll -mx-1 px-1">
      <table className="w-full text-sm min-w-[22rem]">
        <thead>
          <tr className="border-b border-white/5 text-gray-400">
            <th className="text-left py-2 font-normal">Analyst</th>
            <th className="text-right py-2 font-normal">Trades</th>
            <th className="text-right py-2 font-normal">Win rate</th>
            <th className="text-right py-2 font-normal">Avg ROI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.analystId} className="border-b border-white/5 last:border-0">
              <td className="py-2 text-gray-100">{a.userName}</td>
              <td className="py-2 text-right text-gray-300">{a.trades}</td>
              <td className="py-2 text-right text-gray-300">{a.winRate}%</td>
              <td
                className={`py-2 text-right ${
                  a.avgRoi >= 0 ? "text-[#a3e635]" : "text-red-400"
                }`}
              >
                {a.avgRoi > 0 ? "+" : ""}
                {a.avgRoi}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Ranked list with an inline magnitude bar — a single sequential measure. */
function Breakdown({ rows }: { rows: { name: string; trades: number }[] }) {
  if (!rows.length) return <Empty height={140} />
  const max = Math.max(...rows.map((r) => r.trades), 1)

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-3 text-sm">
          <span className="text-gray-300 w-16 sm:w-24 truncate" title={r.name}>
            {r.name}
          </span>
          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(r.trades / max) * 100}%`, background: CHART.accent }}
            />
          </div>
          <span className="text-gray-400 text-xs w-10 text-right">{r.trades}</span>
        </div>
      ))}
    </div>
  )
}
