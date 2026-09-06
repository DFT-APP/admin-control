import { useState } from "react"
import { Search, AlertTriangle, ChevronRight } from "lucide-react"
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
} from "recharts"
import { DataTable } from "@/components/table/DataTable"
import { Modal, ModalActions } from "@/components/ui/modal"
import { CHART } from "@/lib/api-types"
import {
  useActivityLog,
  useAuditLog,
  useApiAnalytics,
  useSecurityEvents,
  useErrorLog,
  useDismissError,
  useDismissSecurityEvent,
  type ActivityEntry,
  type AuditEntry,
  type ErrorEntry,
  type RouteStat,
  type SecurityEvent,
} from "@/hooks/useLogs"

type Tab = "activity" | "audit" | "api" | "security" | "errors"

const TABS: { id: Tab; label: string }[] = [
  { id: "activity", label: "Users" },
  { id: "audit", label: "Admins" },
  { id: "api", label: "API" },
  { id: "security", label: "Refused" },
  { id: "errors", label: "Errors" },
]

export default function LogsPage() {
  const [tab, setTab] = useState<Tab>("activity")

  return (
    <div className="page">
      <div className="mb-6">
        <h1 className="page-title">Logs</h1>
        <p className="page-subtitle">
          What people do in the app, every change an admin makes, what the API is
          carrying, who was turned away, and everything that has failed.
        </p>
      </div>

      <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 mb-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`chip px-2 sm:px-4 ${tab === t.id ? "chip-active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "activity" && <ActivityTab />}
      {tab === "audit" && <AuditTab />}
      {tab === "api" && <ApiTab />}
      {tab === "security" && <SecurityTab />}
      {tab === "errors" && <ErrorsTab />}
    </div>
  )
}

/* ──────────────────────────── User activity ────────────────────────── */

function ActivityTab() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [failedOnly, setFailedOnly] = useState(false)
  const [open, setOpen] = useState<ActivityEntry | null>(null)

  const { data, isLoading, isError, error } = useActivityLog({
    page,
    search,
    category,
    failedOnly,
  })

  const columns = [
    {
      key: "action",
      label: "Did",
      primary: true,
      render: (e: ActivityEntry) => (
        <div className="flex flex-col min-w-0">
          <span className="text-gray-100 text-sm font-medium">
            {e.action}
            {e.targetId && <span className="text-gray-500"> #{e.targetId}</span>}
          </span>
          <span className="text-gray-500 text-xs font-mono truncate">
            {e.method} {e.path}
          </span>
        </div>
      ),
    },
    {
      key: "userName",
      label: "Who",
      render: (e: ActivityEntry) => (
        <div className="flex flex-col min-w-0">
          <span className="text-gray-300 text-sm truncate">{e.userName}</span>
          {e.userId != null && (
            <span className="text-gray-600 text-xs">#{e.userId}</span>
          )}
        </div>
      ),
    },
    {
      key: "category",
      label: "Area",
      render: (e: ActivityEntry) => (
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-gray-300 bg-white/5 capitalize">
          {e.category}
        </span>
      ),
    },
    {
      key: "statusCode",
      label: "Result",
      sortable: true,
      render: (e: ActivityEntry) => <StatusPill code={e.statusCode} />,
    },
    {
      key: "createdAt",
      label: "When",
      sortable: true,
      render: (e: ActivityEntry) => (
        <span className="text-gray-400 text-xs">
          {new Date(e.createdAt).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <>
      {isError && <ErrorBar message={(error as Error)?.message} />}

      {(data?.topUsers ?? []).length > 0 && (
        <div className="bg-[#111111] rounded-xl p-3 sm:p-4 border border-white/5 mb-4">
          <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-2.5">
            Busiest accounts · last 7 days
          </p>
          <div className="flex flex-wrap gap-2">
            {(data?.topUsers ?? []).map((u) => (
              <button
                key={u.userId}
                onClick={() => {
                  setSearch(u.userName)
                  setPage(1)
                }}
                className="chip"
                title={`Filter to ${u.userName}`}
              >
                {u.userName}
                <span className="text-gray-500 ml-1.5">{u.actions.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative w-full sm:w-72">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search action, path or person…"
            className="field pl-9"
          />
        </div>

        <button
          onClick={() => {
            setFailedOnly(!failedOnly)
            setPage(1)
          }}
          className={`chip ${failedOnly ? "chip-active" : ""}`}
        >
          Failed only
        </button>

        <button
          onClick={() => {
            setCategory("")
            setPage(1)
          }}
          className={`chip ${category === "" ? "chip-active" : ""}`}
        >
          All areas
        </button>
        {(data?.categories ?? []).map((c) => (
          <button
            key={c}
            onClick={() => {
              setCategory(category === c ? "" : c)
              setPage(1)
            }}
            className={`chip capitalize ${category === c ? "chip-active" : ""}`}
          >
            {c}
          </button>
        ))}
      </div>

      <DataTable
        data={data?.entries ?? []}
        columns={columns}
        loading={isLoading}
        emptyMessage="Nothing recorded yet — what people do in the app appears here as it happens"
        serverPagination={{
          page: data?.page ?? 1,
          totalPages: data?.totalPages ?? 1,
          total: data?.total,
          onPageChange: setPage,
        }}
        actions={(e: ActivityEntry) => (
          <button
            onClick={() => setOpen(e)}
            className="btn btn-sm btn-secondary hover:border-[#a3e635]"
          >
            Details
          </button>
        )}
      />

      {open && <ActivityModal entry={open} onClose={() => setOpen(null)} />}
    </>
  )
}

function ActivityModal({
  entry,
  onClose,
}: {
  entry: ActivityEntry
  onClose: () => void
}) {
  return (
    <Modal title={entry.action} onClose={onClose} wide>
      <div className="flex flex-col gap-4">
        <div className="grid gap-2 text-sm">
          <Row label="Who">
            {entry.userName}
            {entry.userId != null && (
              <span className="text-gray-500"> · #{entry.userId}</span>
            )}
          </Row>
          <Row label="Area">
            <span className="capitalize">{entry.category}</span>
          </Row>
          <Row label="Request">
            <span className="font-mono text-xs break-all">
              {entry.method} {entry.path}
            </span>
          </Row>
          <Row label="Result">
            <StatusPill code={entry.statusCode} />
          </Row>
          <Row label="When">{new Date(entry.createdAt).toLocaleString()}</Row>
          {entry.ip && <Row label="From">{entry.ip}</Row>}
          {entry.device && (
            <Row label="Device">
              <span className="break-all">{entry.device}</span>
            </Row>
          )}
        </div>

        <div>
          <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-1.5">
            What was sent
          </p>
          {entry.details ? (
            <pre className="bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto max-h-72">
              {JSON.stringify(entry.details, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-600 text-sm">No request body.</p>
          )}
          <p className="text-gray-600 text-xs mt-2">
            Passwords and device tokens are stripped before anything is stored.
          </p>
        </div>
      </div>

      <ModalActions>
        <button onClick={onClose} className="btn btn-secondary">
          Close
        </button>
      </ModalActions>
    </Modal>
  )
}

/* ───────────────────────────── Audit ───────────────────────────── */

function AuditTab() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [targetType, setTargetType] = useState("")
  const [failedOnly, setFailedOnly] = useState(false)
  const [open, setOpen] = useState<AuditEntry | null>(null)

  const { data, isLoading, isError, error } = useAuditLog({
    page,
    search,
    targetType,
    failedOnly,
  })

  const columns = [
    {
      key: "action",
      label: "Action",
      primary: true,
      render: (e: AuditEntry) => (
        <div className="flex flex-col min-w-0">
          <span className="text-gray-100 text-sm font-medium">
            {e.action}
            {e.targetId && <span className="text-gray-500"> #{e.targetId}</span>}
          </span>
          <span className="text-gray-500 text-xs font-mono truncate">
            {e.method} {e.path}
          </span>
        </div>
      ),
    },
    {
      key: "adminName",
      label: "By",
      render: (e: AuditEntry) => (
        <span className="text-gray-300 text-sm">{e.adminName}</span>
      ),
    },
    {
      key: "statusCode",
      label: "Result",
      sortable: true,
      render: (e: AuditEntry) => <StatusPill code={e.statusCode} />,
    },
    {
      key: "createdAt",
      label: "When",
      sortable: true,
      render: (e: AuditEntry) => (
        <span className="text-gray-400 text-xs">
          {new Date(e.createdAt).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <>
      {isError && <ErrorBar message={(error as Error)?.message} />}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative w-full sm:w-72">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search action, path or admin…"
            className="field pl-9"
          />
        </div>

        <button
          onClick={() => {
            setFailedOnly(!failedOnly)
            setPage(1)
          }}
          className={`chip ${failedOnly ? "chip-active" : ""}`}
        >
          Failed only
        </button>

        <button
          onClick={() => {
            setTargetType("")
            setPage(1)
          }}
          className={`chip ${targetType === "" ? "chip-active" : ""}`}
        >
          All areas
        </button>
        {(data?.targetTypes ?? []).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTargetType(targetType === t ? "" : t)
              setPage(1)
            }}
            className={`chip capitalize ${targetType === t ? "chip-active" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      <DataTable
        data={data?.entries ?? []}
        columns={columns}
        loading={isLoading}
        emptyMessage="Nothing recorded yet — admin actions appear here as they happen"
        serverPagination={{
          page: data?.page ?? 1,
          totalPages: data?.totalPages ?? 1,
          total: data?.total,
          onPageChange: setPage,
        }}
        actions={(e: AuditEntry) => (
          <button
            onClick={() => setOpen(e)}
            className="btn btn-sm btn-secondary hover:border-[#a3e635]"
          >
            Details
          </button>
        )}
      />

      {open && <AuditModal entry={open} onClose={() => setOpen(null)} />}
    </>
  )
}

function AuditModal({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  return (
    <Modal title={entry.action} onClose={onClose} wide>
      <div className="flex flex-col gap-4">
        <div className="grid gap-2 text-sm">
          <Row label="By">{entry.adminName}</Row>
          <Row label="Request">
            <span className="font-mono text-xs break-all">
              {entry.method} {entry.path}
            </span>
          </Row>
          <Row label="Result">
            <StatusPill code={entry.statusCode} />
          </Row>
          <Row label="When">{new Date(entry.createdAt).toLocaleString()}</Row>
          {entry.ip && <Row label="From">{entry.ip}</Row>}
        </div>

        <div>
          <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-1.5">
            What was sent
          </p>
          {entry.details ? (
            <pre className="bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto max-h-72">
              {JSON.stringify(entry.details, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-600 text-sm">No request body.</p>
          )}
          <p className="text-gray-600 text-xs mt-2">
            Passwords and device tokens are stripped before anything is stored.
          </p>
        </div>
      </div>

      <ModalActions>
        <button onClick={onClose} className="btn btn-secondary">
          Close
        </button>
      </ModalActions>
    </Modal>
  )
}

/* ────────────────────────── API traffic ────────────────────────── */

const RANGES = [
  { id: "24h", label: "24h" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
]

const fmt = (n: number | undefined) => (n == null ? "—" : n.toLocaleString())

/** Milliseconds only stay readable as milliseconds up to a point. */
const ms = (n: number | undefined) =>
  n == null ? "—" : n >= 1000 ? `${(n / 1000).toFixed(2)}s` : `${n}ms`

function ApiTab() {
  const [range, setRange] = useState("24h")
  const [view, setView] = useState<"busiest" | "slowest">("busiest")

  const { data, isLoading, isError, error } = useApiAnalytics(range)
  const s = data?.summary
  const failed = (s?.clientErrors ?? 0) + (s?.serverErrors ?? 0)

  // The bucket is an instant; how it should read depends on how far back the
  // range goes. An hour label on a month of data is unreadable, and a date
  // label on a single day says nothing.
  const series = (data?.series ?? []).map((point) => ({
    ...point,
    label:
      data?.grain === "hour"
        ? new Date(point.bucket).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : new Date(point.bucket).toLocaleDateString([], { month: "short", day: "numeric" }),
  }))

  const rows = view === "busiest" ? data?.routes ?? [] : data?.slowest ?? []

  const columns = [
    {
      key: "route",
      label: "Route",
      primary: true,
      render: (r: RouteStat) => (
        <div className="flex flex-col min-w-0">
          <span className="text-gray-100 text-sm font-mono truncate">{r.route}</span>
          <span className="text-gray-500 text-xs">{r.method}</span>
        </div>
      ),
    },
    {
      key: "hits",
      label: "Hits",
      sortable: true,
      render: (r: RouteStat) => (
        <span className="text-gray-200 text-sm font-medium">{fmt(r.hits)}</span>
      ),
    },
    {
      key: "errorRate",
      label: "Failed",
      sortable: true,
      render: (r: RouteStat) => (
        <div className="flex flex-col">
          <span
            className={`text-sm font-medium ${
              r.serverErrors > 0
                ? "text-red-400"
                : r.clientErrors > 0
                ? "text-amber-400"
                : "text-gray-500"
            }`}
          >
            {r.errorRate}%
          </span>
          {r.clientErrors + r.serverErrors > 0 && (
            <span className="text-gray-600 text-xs">
              {fmt(r.clientErrors)} refused · {fmt(r.serverErrors)} broke
            </span>
          )}
        </div>
      ),
    },
    {
      key: "avgMs",
      label: "Average",
      sortable: true,
      render: (r: RouteStat) => (
        <span className="text-gray-300 text-sm">{ms(r.avgMs)}</span>
      ),
    },
    {
      key: "maxMs",
      label: "Slowest",
      sortable: true,
      hideOnCard: true,
      render: (r: RouteStat) => (
        <span className="text-gray-500 text-sm">{ms(r.maxMs)}</span>
      ),
    },
  ]

  return (
    <>
      {isError && <ErrorBar message={(error as Error)?.message} />}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={`chip ${range === r.id ? "chip-active" : ""}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
        <Stat label="Requests" value={fmt(s?.hits)} hint={`${fmt(s?.routes)} routes`} />
        <Stat
          label="Failed"
          value={fmt(failed)}
          tone={(s?.serverErrors ?? 0) > 0 ? "bad" : failed > 0 ? "warn" : "plain"}
          hint={`${s?.errorRate ?? 0}% of all traffic`}
        />
        <Stat label="Average response" value={ms(s?.avgMs)} tone="plain" />
        <Stat label="Slowest response" value={ms(s?.maxMs)} tone="plain" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4">
        <ChartCard title="Traffic" subtitle={`Requests per ${data?.grain ?? "hour"}`}>
          {series.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={series} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="apiHitsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART.accent} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={38}
                />
                <Tooltip content={<TooltipBox />} cursor={{ stroke: "#ffffff20" }} />
                <Area
                  type="monotone"
                  dataKey="hits"
                  name="Requests"
                  stroke={CHART.accent}
                  strokeWidth={2}
                  fill="url(#apiHitsFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: CHART.accent, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <NoData />
          )}
        </ChartCard>

        <ChartCard
          title="Failures"
          subtitle="Refused by us, and broken on our side"
        >
          {series.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={series}
                margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
                barSize={8}
              >
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={38}
                />
                <Tooltip content={<TooltipBox />} cursor={{ fill: "#ffffff08" }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
                <Bar
                  dataKey="clientErrors"
                  name="Refused"
                  stackId="failures"
                  fill={CHART.series[1]}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="serverErrors"
                  name="Broke"
                  stackId="failures"
                  fill={CHART.loss}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoData />
          )}
        </ChartCard>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setView("busiest")}
          className={`chip ${view === "busiest" ? "chip-active" : ""}`}
        >
          Busiest routes
        </button>
        <button
          onClick={() => setView("slowest")}
          className={`chip ${view === "slowest" ? "chip-active" : ""}`}
        >
          Slowest routes
        </button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        loading={isLoading}
        emptyMessage={
          view === "slowest"
            ? "No route has been called often enough to time fairly"
            : "No traffic in this range"
        }
      />

      <p className="text-gray-600 text-xs mt-3">
        Counted per route, not per request: ids collapse, so /api/trades/41 and
        /api/trades/87 are one line. Health checks are left out — a load balancer
        polling every few seconds would drown everything else.
      </p>
    </>
  )
}

/* ───────────────────────── Refused requests ────────────────────── */

const KINDS: { id: SecurityEvent["kind"]; label: string; hint: string }[] = [
  { id: "unauthorized", label: "Bad credentials", hint: "Wrong, missing or expired token" },
  { id: "forbidden", label: "Not permitted", hint: "Signed in, but not allowed" },
  { id: "rate_limited", label: "Rate limited", hint: "Went faster than the limit" },
  { id: "probe", label: "Probes", hint: "Routes that do not exist" },
]

function SecurityTab() {
  const [page, setPage] = useState(1)
  const [kind, setKind] = useState("")
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState<SecurityEvent | null>(null)

  const { data, isLoading, isError, error } = useSecurityEvents({ page, kind, search })
  const counts = data?.counts ?? {}

  const columns = [
    {
      key: "message",
      label: "What happened",
      primary: true,
      render: (e: SecurityEvent) => (
        <div className="flex flex-col min-w-0">
          <span className="flex items-center gap-2">
            <KindPill kind={e.kind} />
            {e.occurrences > 1 && (
              <span className="text-amber-400 text-xs font-medium flex-shrink-0">
                ×{e.occurrences.toLocaleString()}
              </span>
            )}
          </span>
          <span className="text-gray-100 text-sm mt-1">{e.message}</span>
          {e.path && (
            <span className="text-gray-500 text-xs font-mono truncate">
              {e.method} {e.path}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "ip",
      label: "From",
      render: (e: SecurityEvent) => (
        <span className="text-gray-300 text-sm font-mono">{e.ip || "—"}</span>
      ),
    },
    {
      key: "lastSeenAt",
      label: "Last seen",
      sortable: true,
      render: (e: SecurityEvent) => (
        <span className="text-gray-400 text-xs">
          {new Date(e.lastSeenAt).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <>
      {isError && <ErrorBar message={(error as Error)?.message} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
        {KINDS.map((k) => {
          const c = counts[k.id]
          const active = kind === k.id
          return (
            <button
              key={k.id}
              onClick={() => {
                setKind(active ? "" : k.id)
                setPage(1)
              }}
              className={`text-left bg-[#111111] rounded-xl p-3 border transition-colors ${
                active ? "border-[#a3e635]/40" : "border-white/5 hover:border-white/20"
              }`}
            >
              <p className="text-gray-400 text-xs mb-1">{k.label}</p>
              <p
                className={`text-lg sm:text-xl font-bold ${
                  (c?.attempts ?? 0) > 0 ? "text-amber-400" : "text-white"
                }`}
              >
                {(c?.attempts ?? 0).toLocaleString()}
              </p>
              <p className="text-gray-600 text-xs mt-0.5">
                {c?.distinct ? `from ${c.distinct.toLocaleString()} origins` : k.hint}
              </p>
            </button>
          )
        })}
      </div>

      <div className="relative w-full sm:w-72 mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Search path or address…"
          className="field pl-9"
        />
      </div>

      <DataTable
        data={data?.events ?? []}
        columns={columns}
        loading={isLoading}
        emptyMessage="Nobody has been turned away — this list stays empty until someone is"
        serverPagination={{
          page: data?.page ?? 1,
          totalPages: data?.totalPages ?? 1,
          total: data?.total,
          onPageChange: setPage,
        }}
        actions={(e: SecurityEvent) => (
          <button
            onClick={() => setOpen(e)}
            className="btn btn-sm btn-secondary hover:border-[#a3e635]"
          >
            <ChevronRight size={14} />
            Open
          </button>
        )}
      />

      <p className="text-gray-600 text-xs mt-3">
        Repeat attempts from one address against one route collapse onto a single
        counted row, so a scanner cannot push everything else off the page.
      </p>

      {open && <SecurityModal event={open} onClose={() => setOpen(null)} />}
    </>
  )
}

function SecurityModal({
  event,
  onClose,
}: {
  event: SecurityEvent
  onClose: () => void
}) {
  const dismiss = useDismissSecurityEvent()

  return (
    <Modal title="Refused request" onClose={onClose} wide>
      <div className="flex flex-col gap-4">
        <div className="bg-[#0d0d0d] border border-white/10 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <KindPill kind={event.kind} />
            {event.statusCode && <StatusPill code={event.statusCode} />}
            {event.occurrences > 1 && (
              <span className="text-amber-400 text-xs font-medium">
                {event.occurrences.toLocaleString()} attempts
              </span>
            )}
          </div>
          <p className="text-gray-100 text-sm">{event.message}</p>
        </div>

        <div className="grid gap-2 text-sm">
          {event.path && (
            <Row label="Where">
              <span className="font-mono text-xs break-all">
                {event.method} {event.path}
              </span>
            </Row>
          )}
          {event.ip && <Row label="From">{event.ip}</Row>}
          {event.userId != null && <Row label="User">#{event.userId}</Row>}
          <Row label="First seen">{new Date(event.createdAt).toLocaleString()}</Row>
          <Row label="Last seen">{new Date(event.lastSeenAt).toLocaleString()}</Row>
        </div>

        {event.userAgent && (
          <div>
            <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-1.5">
              Client
            </p>
            <p className="bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-gray-400 break-all">
              {event.userAgent}
            </p>
          </div>
        )}
      </div>

      <ModalActions>
        <button onClick={onClose} className="btn btn-secondary">
          Close
        </button>
        <button
          onClick={() => dismiss.mutate(event.id, { onSuccess: onClose })}
          disabled={dismiss.isPending}
          className="btn btn-danger-solid"
        >
          {dismiss.isPending ? "Dismissing…" : "Dismiss"}
        </button>
      </ModalActions>
    </Modal>
  )
}

/* ───────────────────────────── Errors ──────────────────────────── */

function ErrorsTab() {
  const [page, setPage] = useState(1)
  const [source, setSource] = useState("")
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState<ErrorEntry | null>(null)

  const { data, isLoading, isError, error } = useErrorLog({ page, source, search })
  const counts = data?.counts ?? {}

  const columns = [
    {
      key: "message",
      label: "Error",
      primary: true,
      render: (e: ErrorEntry) => (
        <div className="flex flex-col min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <SourcePill source={e.source} />
            {e.occurrences > 1 && (
              <span className="text-amber-400 text-xs font-medium flex-shrink-0">
                ×{e.occurrences}
              </span>
            )}
          </span>
          <span className="text-gray-100 text-sm mt-1 break-words">{e.message}</span>
          {e.path && (
            <span className="text-gray-500 text-xs font-mono truncate">
              {e.method} {e.path}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "statusCode",
      label: "Status",
      render: (e: ErrorEntry) =>
        e.statusCode ? (
          <StatusPill code={e.statusCode} />
        ) : (
          <span className="text-gray-600 text-xs">—</span>
        ),
    },
    {
      key: "lastSeenAt",
      label: "Last seen",
      sortable: true,
      render: (e: ErrorEntry) => (
        <span className="text-gray-400 text-xs">
          {new Date(e.lastSeenAt).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <>
      {isError && <ErrorBar message={(error as Error)?.message} />}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-4">
        {(["backend", "admin"] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setSource(source === s ? "" : s)
              setPage(1)
            }}
            className={`text-left bg-[#111111] rounded-xl p-3 border transition-colors ${
              source === s ? "border-[#a3e635]/40" : "border-white/5 hover:border-white/20"
            }`}
          >
            <p className="text-gray-400 text-xs mb-1">
              {s === "backend" ? "API" : "This console"}
            </p>
            <p
              className={`text-lg sm:text-xl font-bold ${
                (counts[s]?.distinct ?? 0) > 0 ? "text-amber-400" : "text-white"
              }`}
            >
              {counts[s]?.distinct ?? 0}
              {(counts[s]?.total ?? 0) > (counts[s]?.distinct ?? 0) && (
                <span className="text-gray-500 text-sm font-normal">
                  {" "}
                  / {counts[s]?.total} hits
                </span>
              )}
            </p>
          </button>
        ))}
      </div>

      <div className="relative w-full sm:w-72 mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Search message or path…"
          className="field pl-9"
        />
      </div>

      <DataTable
        data={data?.errors ?? []}
        columns={columns}
        loading={isLoading}
        emptyMessage="Nothing has failed — this list stays empty until something does"
        serverPagination={{
          page: data?.page ?? 1,
          totalPages: data?.totalPages ?? 1,
          total: data?.total,
          onPageChange: setPage,
        }}
        actions={(e: ErrorEntry) => (
          <button
            onClick={() => setOpen(e)}
            className="btn btn-sm btn-secondary hover:border-[#a3e635]"
          >
            <ChevronRight size={14} />
            Open
          </button>
        )}
      />

      {open && <ErrorModal entry={open} onClose={() => setOpen(null)} />}
    </>
  )
}

function ErrorModal({ entry, onClose }: { entry: ErrorEntry; onClose: () => void }) {
  const dismiss = useDismissError()

  return (
    <Modal title="Error detail" onClose={onClose} wide>
      <div className="flex flex-col gap-4">
        <div className="bg-[#0d0d0d] border border-white/10 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <SourcePill source={entry.source} />
            {entry.statusCode && <StatusPill code={entry.statusCode} />}
            {entry.occurrences > 1 && (
              <span className="text-amber-400 text-xs font-medium">
                seen {entry.occurrences} times
              </span>
            )}
          </div>
          <p className="text-gray-100 text-sm break-words">{entry.message}</p>
        </div>

        <div className="grid gap-2 text-sm">
          {entry.path && (
            <Row label="Where">
              <span className="font-mono text-xs break-all">
                {entry.method} {entry.path}
              </span>
            </Row>
          )}
          <Row label="First seen">{new Date(entry.createdAt).toLocaleString()}</Row>
          <Row label="Last seen">{new Date(entry.lastSeenAt).toLocaleString()}</Row>
          {entry.userId != null && <Row label="User">#{entry.userId}</Row>}
        </div>

        {entry.stack && (
          <div>
            <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-1.5">
              Stack
            </p>
            <pre className="bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-red-300/90 overflow-x-auto max-h-72">
              {entry.stack}
            </pre>
          </div>
        )}

        {entry.context && (
          <div>
            <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-1.5">
              Context
            </p>
            <pre className="bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-gray-400 overflow-x-auto max-h-52">
              {JSON.stringify(entry.context, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <ModalActions>
        <button onClick={onClose} className="btn btn-secondary">
          Close
        </button>
        <button
          onClick={() => dismiss.mutate(entry.id, { onSuccess: onClose })}
          disabled={dismiss.isPending}
          className="btn btn-danger-solid"
        >
          {dismiss.isPending ? "Dismissing…" : "Dismiss"}
        </button>
      </ModalActions>
    </Modal>
  )
}

/* ───────────────────────────── Shared ──────────────────────────── */

function Stat({
  label,
  value,
  hint,
  tone = "accent",
}: {
  label: string
  value: string
  hint?: string
  tone?: "accent" | "plain" | "warn" | "bad"
}) {
  const color =
    tone === "accent"
      ? "text-[#a3e635]"
      : tone === "warn"
      ? "text-amber-400"
      : tone === "bad"
      ? "text-red-400"
      : "text-white"
  return (
    <div className="bg-[#111111] rounded-xl p-3 sm:p-4 border border-white/5">
      <p className="text-gray-400 text-xs mb-1.5">{label}</p>
      <p className={`${color} text-lg sm:text-xl font-bold tracking-tight`}>{value}</p>
      {hint && <p className="text-gray-600 text-xs mt-1">{hint}</p>}
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-[#111111] rounded-xl p-4 sm:p-5 border border-white/5">
      <div className="mb-4">
        <h3 className="text-white text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

/**
 * Recharts types its tooltip payload loosely; this is the slice the charts on
 * this page actually render.
 */
type TooltipEntry = {
  dataKey?: string | number
  name?: string | number
  color?: string
  value?: number | string
}

const TooltipBox = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
}) => {
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

function NoData() {
  return (
    <div className="flex items-center justify-center text-gray-600 text-sm h-[180px]">
      Nothing in this range
    </div>
  )
}

function KindPill({ kind }: { kind: SecurityEvent["kind"] }) {
  const label = KINDS.find((k) => k.id === kind)?.label ?? kind
  // Something breaking through a permission check is a different order of
  // problem from someone mistyping a password, and should not look the same.
  const tone =
    kind === "forbidden"
      ? "text-red-400 bg-red-400/10"
      : kind === "probe"
      ? "text-gray-300 bg-white/5"
      : "text-amber-400 bg-amber-400/10"
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${tone}`}>
      {label}
    </span>
  )
}

function StatusPill({ code }: { code: number }) {
  const tone =
    code < 300
      ? "text-[#a3e635] bg-[#a3e635]/10"
      : code < 500
      ? "text-amber-400 bg-amber-400/10"
      : "text-red-400 bg-red-400/10"
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${tone}`}>
      {code}
    </span>
  )
}

function SourcePill({ source }: { source: "backend" | "admin" }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-gray-300 bg-white/5">
      {source === "backend" ? "API" : "Console"}
    </span>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <span className="text-gray-500 w-24 flex-shrink-0">{label}</span>
      <span className="text-gray-300 min-w-0">{children}</span>
    </div>
  )
}

function ErrorBar({ message }: { message?: string }) {
  return (
    <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm mb-4">
      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
      {message || "Something went wrong"}
    </div>
  )
}
