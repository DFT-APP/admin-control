import { useState } from "react"
import { DataTable } from "@/components/table/DataTable"
import { Modal, ModalActions } from "@/components/ui/modal"
import { useSignals, type AdminSignal } from "@/hooks/useSignals"

const STATUS_FILTERS = [
  { label: "Live", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Pending", value: "PENDING" },
  { label: "Closed", value: "CLOSED" },
]

const price = (n: number | null) =>
  n == null ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: 8 })

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "ACTIVE"
      ? "text-[#a3e635] bg-[#a3e635]/10"
      : status === "PENDING"
      ? "text-amber-400 bg-amber-400/10"
      : "text-gray-300 bg-white/5"
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${tone}`}>{status}</span>
  )
}

function Pnl({ value }: { value: number | null }) {
  if (value == null) return <span className="text-gray-500">—</span>
  return (
    <span className={value >= 0 ? "text-[#a3e635]" : "text-red-400"}>
      {value > 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  )
}

const columns = [
  {
    key: "market",
    label: "Market",
    primary: true,
    render: (s: AdminSignal) => (
      <div className="flex flex-col">
        <span className="text-gray-100 font-medium">{s.market}</span>
        <span className="text-gray-500 text-xs">
          {s.exchange}
          {s.leverage ? ` · ${s.leverage}x` : ""}
        </span>
      </div>
    ),
  },
  {
    key: "analyst",
    label: "Analyst",
    render: (s: AdminSignal) => <span className="text-gray-200">{s.analyst}</span>,
  },
  {
    key: "tradeCall",
    label: "Call",
    render: (s: AdminSignal) => {
      const buy = (s.tradeCall || "").toLowerCase() === "buy"
      return (
        <span className={buy ? "text-[#a3e635]" : "text-red-400"}>
          {(s.tradeCall || "—").toUpperCase()}
        </span>
      )
    },
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (s: AdminSignal) => <StatusPill status={s.status} />,
  },
  {
    key: "profitLossPercentage",
    label: "P/L",
    sortable: true,
    render: (s: AdminSignal) => <Pnl value={s.profitLossPercentage} />,
  },
  {
    key: "redemptions",
    label: "Unlocked",
    sortable: true,
    render: (s: AdminSignal) => (
      <div className="flex flex-col">
        <span className="text-gray-200">{s.redemptions}</span>
        <span className="text-gray-500 text-xs">of {s.reach} followers</span>
      </div>
    ),
  },
  {
    key: "createdAt",
    label: "Posted",
    sortable: true,
    render: (s: AdminSignal) => (
      <span className="text-gray-400 text-xs">
        {new Date(s.createdAt).toLocaleString()}
      </span>
    ),
  },
]

export default function SignalsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")
  const [search, setSearch] = useState("")
  const [viewing, setViewing] = useState<AdminSignal | null>(null)

  const { data, isLoading, isError, error } = useSignals({ page, status, search })
  const summary = data?.summary

  return (
    <div className="page">
      <div className="mb-6">
        <h1 className="page-title">Signals</h1>
        <p className="page-subtitle">
          Trade calls currently open to followers. Editing and closing live in Trades.
        </p>
      </div>

      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm mb-4">
          {(error as Error)?.message || "Failed to load signals"}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <Tile label="Active now" value={summary?.active} accent />
        <Tile label="Pending entry" value={summary?.pending} />
        <Tile label="Closed (24h)" value={summary?.closedToday} />
        <Tile label="Unlocked (24h)" value={summary?.redemptionsToday} />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar -mx-1 px-1 py-0.5 sm:flex-wrap sm:overflow-visible">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => {
              setStatus(f.value)
              setPage(1)
            }}
            className={`chip ${status === f.value ? "chip-active" : ""}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <DataTable
        data={data?.signals ?? []}
        columns={columns}
        loading={isLoading}
        emptyMessage="No signals match this filter"
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        serverPagination={{
          page: data?.page ?? 1,
          totalPages: data?.totalPages ?? 1,
          total: data?.total,
          onPageChange: setPage,
        }}
        actions={(s: AdminSignal) => (
          <button
            onClick={() => setViewing(s)}
            className="btn btn-sm btn-secondary hover:border-[#a3e635]"
          >
            Details
          </button>
        )}
      />

      {viewing && (
        <Modal
          title={`${viewing.market} — ${viewing.analyst}`}
          onClose={() => setViewing(null)}
          wide
        >
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
            <Row label="Signal ID" value={`#${viewing.signalId}`} />
            <Row label="Status" value={viewing.status} />
            <Row label="Call" value={(viewing.tradeCall || "—").toUpperCase()} />
            <Row label="Type" value={viewing.type || "—"} />
            <Row label="Exchange" value={viewing.exchange || "—"} />
            <Row label="Leverage" value={viewing.leverage ? `${viewing.leverage}x` : "—"} />
            <Row label="Margin" value={viewing.marginType || "—"} />
            <Row label="Risk" value={viewing.riskPercentage != null ? `${viewing.riskPercentage}%` : "—"} />
            <Row label="Credit cost" value={viewing.credit != null ? String(viewing.credit) : "—"} />
            <Row label="Entry from" value={price(viewing.entryFrom)} />
            <Row label="Entry to" value={price(viewing.entryTo)} />
            <Row label="Stop loss" value={price(viewing.stopLoss)} />
            <Row label="TP1" value={price(viewing.tp1)} />
            <Row label="TP2" value={price(viewing.tp2)} />
            <Row label="TP3" value={price(viewing.tp3)} />
            <Row label="Last price" value={price(viewing.lastPrice)} />
            <Row label="Unlocked by" value={`${viewing.redemptions} users`} />
            <Row label="Analyst reach" value={`${viewing.reach} followers`} />
            <Row label="Posted" value={new Date(viewing.createdAt).toLocaleString()} />
          </div>

          <ModalActions>
            <button
              onClick={() => setViewing(null)}
              className="btn btn-secondary"
            >
              Close
            </button>
          </ModalActions>
        </Modal>
      )}
    </div>
  )
}

function Tile({
  label,
  value,
  accent,
}: {
  label: string
  value: number | undefined
  accent?: boolean
}) {
  return (
    <div className="bg-[#111111] rounded-xl p-3 sm:p-4 border border-white/5">
      <p className="text-gray-400 text-[11px] sm:text-xs mb-1 leading-snug">{label}</p>
      <p className={`text-lg sm:text-2xl font-bold tabular-nums ${accent ? "text-[#a3e635]" : "text-white"}`}>
        {value ?? "—"}
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-white/5 py-2">
      <span className="text-gray-500 text-[11px] uppercase tracking-wide">{label}</span>
      <span className="text-gray-200 text-sm break-words">{value}</span>
    </div>
  )
}
