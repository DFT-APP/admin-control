import { useState } from "react"
import { Link } from "react-router-dom"
import { DataTable } from "@/components/table/DataTable"
import { Modal, ModalActions } from "@/components/ui/modal"
import {
  useReports,
  useResolveReport,
  REPORT_STATUSES,
  REPORT_REASONS,
  REASON_LABELS,
  REPORT_STATUS_LABELS,
  type TradeReport,
  type ReportStatus,
  type ReportReason,
} from "@/hooks/useReports"

/** Anything older than this has missed the 24-hour review window outright. */
const OVERDUE_HOURS = 24

const hoursSince = (iso: string) =>
  (Date.now() - new Date(iso).getTime()) / 36e5

export default function ReportsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("PENDING")
  const [reason, setReason] = useState("")
  const [open, setOpen] = useState<TradeReport | null>(null)

  const { data, isLoading, isError, error } = useReports({ page, status, reason })
  const counts = data?.counts ?? {}

  const columns = [
    {
      key: "reason",
      label: "Reported as",
      primary: true,
      render: (r: TradeReport) => (
        <div className="flex flex-col min-w-0">
          <span className="flex items-center gap-2">
            <ReasonPill reason={r.reason} />
            {r.reportsOnTrade > 1 && (
              <span className="text-amber-400 text-xs font-medium">
                ×{r.reportsOnTrade} on this trade
              </span>
            )}
          </span>
          <span className="text-gray-500 text-xs mt-1">
            #{r.id} · reported by {r.reporterName || "Unknown"}
          </span>
        </div>
      ),
    },
    {
      key: "tradeId",
      label: "Trade",
      render: (r: TradeReport) => (
        <div className="flex flex-col">
          <span className="text-gray-100 text-sm">
            {r.token || "?"}/{r.pair || "?"}
          </span>
          <span className="text-gray-500 text-xs">
            #{r.tradeId} · {r.exchange || "—"}
            {r.tradeDeleted && <span className="text-red-400"> · deleted</span>}
          </span>
        </div>
      ),
    },
    {
      key: "analystName",
      label: "Analyst",
      render: (r: TradeReport) => (
        <span className="text-gray-300 text-sm">{r.analystName || "Unknown"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (r: TradeReport) => <ReportPill status={r.status} />,
    },
    {
      key: "createdAt",
      label: "Waiting",
      sortable: true,
      render: (r: TradeReport) => <Waiting report={r} />,
    },
  ]

  return (
    <div className="page">
      <div className="mb-6">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">
          Trades users have flagged from the app. Every report should be actioned
          or dismissed within {OVERDUE_HOURS} hours of arriving.
        </p>
      </div>

      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm mb-4">
          {(error as Error)?.message || "Could not load reports"}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-4">
        {REPORT_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(status === s ? "" : s)
              setPage(1)
            }}
            className={`text-left bg-[#111111] rounded-xl p-3 border transition-colors ${
              status === s ? "border-[#a3e635]/40" : "border-white/5 hover:border-white/20"
            }`}
          >
            <p className="text-gray-400 text-xs mb-1">{REPORT_STATUS_LABELS[s]}</p>
            <p
              className={`text-lg sm:text-xl font-bold ${
                s === "PENDING" && (counts[s] ?? 0) > 0 ? "text-amber-400" : "text-white"
              }`}
            >
              {counts[s] ?? 0}
            </p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => {
            setReason("")
            setPage(1)
          }}
          className={`chip ${reason === "" ? "chip-active" : ""}`}
        >
          All reasons
        </button>
        {REPORT_REASONS.map((r) => (
          <button
            key={r}
            onClick={() => {
              setReason(reason === r ? "" : r)
              setPage(1)
            }}
            className={`chip ${reason === r ? "chip-active" : ""}`}
          >
            {REASON_LABELS[r]}
          </button>
        ))}
      </div>

      <DataTable
        data={data?.reports ?? []}
        columns={columns}
        loading={isLoading}
        emptyMessage={
          status === "PENDING"
            ? "Nothing waiting — the queue is clear"
            : "No reports match this filter"
        }
        serverPagination={{
          page: data?.page ?? 1,
          totalPages: data?.totalPages ?? 1,
          total: data?.total,
          onPageChange: setPage,
        }}
        actions={(r: TradeReport) => (
          <button
            onClick={() => setOpen(r)}
            className="btn btn-sm btn-secondary hover:border-[#a3e635]"
          >
            {r.status === "PENDING" ? "Review" : "View"}
          </button>
        )}
      />

      {open && <ReportModal report={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function Waiting({ report }: { report: TradeReport }) {
  const hours = hoursSince(report.createdAt)
  const overdue = report.status === "PENDING" && hours > OVERDUE_HOURS
  const label =
    hours < 1
      ? "under an hour"
      : hours < 48
      ? `${Math.round(hours)}h`
      : `${Math.round(hours / 24)} days`

  return (
    <span className={`text-xs ${overdue ? "text-amber-400 font-medium" : "text-gray-400"}`}>
      {label}
      {overdue && " overdue"}
    </span>
  )
}

function ReasonPill({ reason }: { reason: ReportReason }) {
  // Scam and pump-and-dump are accusations of fraud; spam and fake are noise.
  const severe = reason === "scam" || reason === "pump_dump"
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
        severe ? "text-red-400 bg-red-400/10" : "text-gray-300 bg-white/5"
      }`}
    >
      {REASON_LABELS[reason]}
    </span>
  )
}

function ReportPill({ status }: { status: ReportStatus }) {
  const tone =
    status === "PENDING"
      ? "text-amber-400 bg-amber-400/10"
      : status === "REVIEWED"
      ? "text-[#a3e635] bg-[#a3e635]/10"
      : "text-gray-400 bg-white/5"
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${tone}`}>
      {REPORT_STATUS_LABELS[status]}
    </span>
  )
}

function ReportModal({
  report,
  onClose,
}: {
  report: TradeReport
  onClose: () => void
}) {
  const resolve = useResolveReport()
  // Several people flagging one trade is the normal shape, and one verdict
  // settles all of them — so the bulk gesture is the default when it applies.
  const [applyToTrade, setApplyToTrade] = useState(report.reportsOnTrade > 1)

  const act = (status: "REVIEWED" | "DISMISSED") =>
    resolve.mutate(
      { id: report.id, status, scope: applyToTrade ? "trade" : undefined },
      { onSuccess: onClose }
    )

  return (
    <Modal title={`Report #${report.id}`} onClose={onClose} wide>
      <div className="flex flex-col gap-4">
        <div className="bg-[#0d0d0d] border border-white/10 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ReasonPill reason={report.reason} />
            <ReportPill status={report.status} />
          </div>
          <Waiting report={report} />
        </div>

        {report.details && (
          <div>
            <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-1.5">
              What the reporter said
            </p>
            <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {report.details}
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Detail label="Reported by">
            <p className="text-gray-200 text-sm">{report.reporterName || "Unknown"}</p>
            <p className="text-gray-500 text-xs break-all">{report.reporterEmail}</p>
          </Detail>
          <Detail label="Analyst behind the trade">
            <p className="text-gray-200 text-sm">{report.analystName || "Unknown"}</p>
            {report.analystId != null && (
              <Link to="/analysts" className="text-[#a3e635] text-xs hover:underline">
                Open analysts
              </Link>
            )}
          </Detail>
        </div>

        <Detail label="The trade">
          <p className="text-gray-100 text-sm">
            {report.token || "?"}/{report.pair || "?"} · {report.type || "—"} ·{" "}
            {report.exchange || "—"}
          </p>
          <p className="text-gray-500 text-xs">
            #{report.tradeId} · {report.tradeStatus || "—"}
            {report.profitLossPercentage != null &&
              ` · ${report.profitLossPercentage > 0 ? "+" : ""}${report.profitLossPercentage}%`}
            {report.tradeCreatedAt &&
              ` · posted ${new Date(report.tradeCreatedAt).toLocaleDateString()}`}
          </p>
          {report.tradeComment && (
            <p className="text-gray-400 text-xs mt-1.5 whitespace-pre-wrap break-words">
              “{report.tradeComment}”
            </p>
          )}
          {report.tradeDeleted ? (
            <p className="text-red-400 text-xs mt-1.5">
              This trade has already been deleted.
            </p>
          ) : (
            <Link to="/trades" className="text-[#a3e635] text-xs hover:underline">
              Open trades to edit or delete it
            </Link>
          )}
        </Detail>

        {report.reportsOnTrade > 1 && (
          <label className="flex items-start gap-2.5 bg-[#0d0d0d] border border-white/10 rounded-lg p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={applyToTrade}
              onChange={(e) => setApplyToTrade(e.target.checked)}
              className="mt-0.5 accent-[#a3e635]"
            />
            <span className="text-sm text-gray-300">
              Apply this verdict to all {report.reportsOnTrade} reports on trade #
              {report.tradeId}
              <span className="block text-gray-500 text-xs mt-0.5">
                One decision about the trade settles every complaint about it.
              </span>
            </span>
          </label>
        )}
      </div>

      <ModalActions>
        <button onClick={onClose} className="btn btn-secondary">
          Close
        </button>
        <button
          onClick={() => act("DISMISSED")}
          disabled={resolve.isPending}
          className="btn btn-secondary"
        >
          Dismiss
        </button>
        <button
          onClick={() => act("REVIEWED")}
          disabled={resolve.isPending}
          className="btn btn-primary"
        >
          {resolve.isPending ? "Saving…" : "Mark actioned"}
        </button>
      </ModalActions>
    </Modal>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-1.5">{label}</p>
      {children}
    </div>
  )
}
