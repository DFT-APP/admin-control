import { useState } from "react"
import { DataTable } from "@/components/table/DataTable"
import {
  useAllTrades,
  useUpdateTrade,
  useDeleteTrade,
  type AdminTradeFull,
} from "@/hooks/useAdmin"
import { Modal, ConfirmModal, Field, Input, Toggle, ModalActions } from "@/components/ui/modal"
import { Avatar } from "@/components/ui/avatar"

const STATUS_OPTIONS = ["ACTIVE", "PENDING", "FOLLOWING", "CLOSED"]
const TYPE_OPTIONS = ["LONG", "SHORT", "FUTURES", "SPOT"]

const pct = (v: AdminTradeFull["profitLossPercentage"]) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""))
  return isNaN(n) ? null : n
}

const columns = [
  {
    key: "tradeId",
    label: "ID",
    sortable: true,
    render: (t: AdminTradeFull) => <span className="text-gray-500">#{t.tradeId}</span>,
  },
  {
    key: "trader",
    label: "Trader",
    render: (t: AdminTradeFull) => (
      <div className="flex items-center gap-2">
        <Avatar emoji={t.traderEmoji} name={t.trader} />
        <span className="text-gray-100 font-medium">{t.trader}</span>
      </div>
    ),
  },
  {
    key: "pair",
    label: "Pair",
    sortable: true,
    primary: true,
    render: (t: AdminTradeFull) => (
      <div className="flex flex-col">
        <span className="text-gray-100 font-medium">{t.pair}</span>
        <span className="text-gray-500 text-xs">{t.exchange}</span>
      </div>
    ),
  },
  {
    key: "type",
    label: "Type",
    render: (t: AdminTradeFull) => (
      <span className="text-gray-300">
        {t.type}
        {t.leverage ? <span className="text-gray-500"> · {t.leverage}x</span> : null}
      </span>
    ),
  },
  {
    key: "tradeStatusType",
    label: "Status",
    render: (t: AdminTradeFull) => {
      const s = t.tradeStatusType || t.status
      const color =
        s === "ACTIVE"
          ? "text-[#a3e635] bg-[#a3e635]/10"
          : s === "CLOSED"
          ? "text-gray-300 bg-white/5"
          : "text-amber-400 bg-amber-400/10"
      return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>{s}</span>
      )
    },
  },
  {
    key: "profitLossPercentage",
    label: "P/L %",
    sortable: true,
    render: (t: AdminTradeFull) => {
      const n = pct(t.profitLossPercentage)
      if (n === null) return <span className="text-gray-500">—</span>
      return (
        <span className={n >= 0 ? "text-[#a3e635]" : "text-red-400"}>
          {n >= 0 ? "+" : ""}
          {n.toFixed(2)}%
        </span>
      )
    },
  },
  {
    key: "createdAt",
    label: "Created",
    sortable: true,
    render: (t: AdminTradeFull) => (
      <span className="text-gray-400 text-xs">
        {new Date(t.createdAt).toLocaleDateString()}
      </span>
    ),
  },
]

export default function TradesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [type, setType] = useState("")
  const [viewing, setViewing] = useState<AdminTradeFull | null>(null)
  const [editing, setEditing] = useState<AdminTradeFull | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AdminTradeFull | null>(null)

  const { data, isLoading, isError, error } = useAllTrades({
    page,
    search,
    status,
    type,
  })
  const deleteTrade = useDeleteTrade()

  const trades = data?.trades ?? []

  const filterSelect = "field sm:w-44"

  return (
    <div className="page">
      <h1 className="page-title mb-5 sm:mb-6">All Trades</h1>

      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm mb-4">
          {(error as Error)?.message || "Failed to load trades"}
        </div>
      )}

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 mb-4">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          className={filterSelect}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value)
            setPage(1)
          }}
          className={filterSelect}
        >
          <option value="">All types</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full">
        <DataTable
          data={trades}
          columns={columns}
          loading={isLoading}
          emptyMessage="No trades found"
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
          actions={(t: AdminTradeFull) => (
            <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:justify-end">
              <button
                onClick={() => setViewing(t)}
                className="btn btn-sm btn-secondary hover:border-[#a3e635]"
              >
                View
              </button>
              <button
                onClick={() => setEditing(t)}
                className="btn btn-sm btn-secondary hover:border-[#a3e635]"
              >
                Edit
              </button>
              <button
                onClick={() => setConfirmDelete(t)}
                className="btn btn-sm btn-danger"
              >
                Delete
              </button>
            </div>
          )}
        />
      </div>

      {viewing && <ViewTradeModal trade={viewing} onClose={() => setViewing(null)} />}

      {editing && <EditTradeModal trade={editing} onClose={() => setEditing(null)} />}

      {confirmDelete && (
        <ConfirmModal
          title="Delete trade"
          message={`Delete trade #${confirmDelete.tradeId} (${confirmDelete.pair} on ${confirmDelete.exchange})? This cannot be undone.`}
          confirmLabel="Delete"
          loading={deleteTrade.isPending}
          onConfirm={() =>
            deleteTrade.mutate(confirmDelete.tradeId, {
              onSuccess: () => setConfirmDelete(null),
            })
          }
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

/* ─────────────────────────── View (all params) ─────────────────── */

function Row({ label, value }: { label: string; value: unknown }) {
  let display: string
  if (value === null || value === undefined || value === "") display = "—"
  else if (Array.isArray(value)) display = value.length ? value.join(", ") : "—"
  else if (typeof value === "boolean") display = value ? "Yes" : "No"
  else if (typeof value === "object") display = JSON.stringify(value)
  else display = String(value)

  return (
    <div className="flex flex-col gap-0.5 border-b border-white/5 py-2">
      <span className="text-gray-500 text-[11px] uppercase tracking-wide">{label}</span>
      <span className="text-gray-200 text-sm break-words">{display}</span>
    </div>
  )
}

function ViewTradeModal({
  trade,
  onClose,
}: {
  trade: AdminTradeFull
  onClose: () => void
}) {
  // Show every parameter returned by the API.
  const entries = Object.entries(trade).filter(
    ([k]) => !["traderEmoji"].includes(k)
  )

  return (
    <Modal title={`Trade #${trade.tradeId} — ${trade.pair}`} onClose={onClose} wide>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6">
        {entries.map(([key, value]) => (
          <Row key={key} label={camelToLabel(key)} value={value} />
        ))}
      </div>
      <ModalActions>
        <button
          onClick={onClose}
          className="btn btn-secondary"
        >
          Close
        </button>
      </ModalActions>
    </Modal>
  )
}

function camelToLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

/* ─────────────────────────── Edit (full control) ───────────────── */

function EditTradeModal({
  trade,
  onClose,
}: {
  trade: AdminTradeFull
  onClose: () => void
}) {
  const updateTrade = useUpdateTrade()
  const [form, setForm] = useState({
    title: trade.title ?? "",
    pair: trade.pair ?? "",
    exchange: trade.exchange ?? "",
    type: trade.type ?? "",
    order: trade.order ?? "",
    tradeCall: trade.tradeCall ?? "",
    status: trade.status ?? "",
    tradeStatusType: trade.tradeStatusType ?? "",
    tradeStrategy: trade.tradeStrategy ?? "",
    tradeTypeName: trade.tradeTypeName ?? "",
    tradeTypeOption: trade.tradeTypeOption ?? "",
    tradeRiskType: trade.tradeRiskType ?? "",
    amount: trade.amount ?? "",
    balance: trade.balance ?? "",
    leverage: trade.leverage != null ? String(trade.leverage) : "",
    marginType: trade.marginType ?? "",
    riskPercentage: trade.riskPercentage != null ? String(trade.riskPercentage) : "",
    risk: trade.risk ?? "",
    entryFrom: trade.entryFrom ?? "",
    entryTo: trade.entryTo ?? "",
    limitToMarket: trade.limitToMarket ?? "",
    stopLoss: trade.stopLoss ?? "",
    stopLossMode: trade.stopLossMode ?? "",
    stopLossComment: trade.stopLossComment ?? "",
    tp1: trade.tp1 ?? "",
    tp2: trade.tp2 ?? "",
    tp3: trade.tp3 ?? "",
    tpClose: trade.tpClose ?? "",
    takeProfitNow: trade.takeProfitNow != null ? String(trade.takeProfitNow) : "",
    closePrice: trade.closePrice != null ? String(trade.closePrice) : "",
    closeStatus: trade.closeStatus != null ? String(trade.closeStatus) : "",
    closedAt: trade.closedAt ? trade.closedAt.slice(0, 16) : "",
    profitLoss: trade.profitLoss != null ? String(trade.profitLoss) : "",
    profitLossPercentage:
      trade.profitLossPercentage != null ? String(trade.profitLossPercentage) : "",
    token: trade.token ?? "",
    tokenAddress: trade.tokenAddress ?? "",
    challengeName: trade.challengeName ?? "",
    credit: trade.credit != null ? String(trade.credit) : "",
    comment: trade.comment ?? "",
    description: trade.description ?? "",
    tags: (trade.tags ?? []).join(", "),
    isTradeActive: trade.isTradeActive,
    dex: trade.dex,
    default: trade.default,
  })

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }))

  const submit = () => {
    const toNum = (v: string) => (v.trim() === "" ? null : Number(v))
    const payload: Record<string, unknown> = {
      ...form,
      leverage: toNum(form.leverage),
      closeStatus: toNum(form.closeStatus),
      closedAt: form.closedAt ? new Date(form.closedAt).toISOString() : null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    }
    updateTrade.mutate(
      { tradeId: trade.tradeId, ...(payload as Partial<AdminTradeFull>) },
      { onSuccess: onClose }
    )
  }

  const txt = (k: keyof typeof form, label: string, placeholder?: string) => (
    <Field label={label}>
      <Input
        value={form[k] as string}
        onChange={(v) => set(k, v)}
        placeholder={placeholder}
      />
    </Field>
  )

  return (
    <Modal title={`Edit trade #${trade.tradeId}`} onClose={onClose} wide>
      <div className="flex flex-col gap-5">
        <Section title="Core">
          {txt("title", "Title")}
          {txt("pair", "Pair")}
          {txt("exchange", "Exchange")}
          <Field label="Type">
            <Select
              value={form.type}
              options={TYPE_OPTIONS}
              onChange={(v) => set("type", v)}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              options={STATUS_OPTIONS}
              onChange={(v) => set("status", v)}
            />
          </Field>
          <Field label="Trade status type">
            <Select
              value={form.tradeStatusType}
              options={STATUS_OPTIONS}
              onChange={(v) => set("tradeStatusType", v)}
            />
          </Field>
          {txt("order", "Order")}
          {txt("tradeCall", "Trade call")}
          {txt("tradeStrategy", "Strategy")}
          {txt("tradeTypeName", "Trade type name")}
          {txt("tradeTypeOption", "Trade type option")}
          {txt("tradeRiskType", "Trade risk type")}
        </Section>

        <Section title="Sizing & risk">
          {txt("amount", "Amount")}
          {txt("balance", "Balance")}
          {txt("leverage", "Leverage")}
          <Field label="Margin type">
            <Select
              value={form.marginType}
              options={["ISOLATED", "CROSS"]}
              onChange={(v) => set("marginType", v)}
            />
          </Field>
          {txt("riskPercentage", "Risk %")}
          {txt("risk", "Risk")}
          {txt("credit", "Credit")}
        </Section>

        <Section title="Entries & targets">
          {txt("entryFrom", "Entry from")}
          {txt("entryTo", "Entry to")}
          {txt("limitToMarket", "Limit to market")}
          {txt("stopLoss", "Stop loss")}
          {txt("stopLossMode", "Stop loss mode")}
          {txt("tp1", "TP1")}
          {txt("tp2", "TP2")}
          {txt("tp3", "TP3")}
          {txt("tpClose", "TP close")}
          {txt("takeProfitNow", "Take profit now")}
        </Section>

        <Section title="Close & P/L">
          {txt("closePrice", "Close price")}
          {txt("closeStatus", "Close status")}
          {txt("profitLoss", "Profit / loss")}
          {txt("profitLossPercentage", "Profit / loss %")}
          <Field label="Closed at">
            <Input type="datetime-local" value={form.closedAt} onChange={(v) => set("closedAt", v)} />
          </Field>
        </Section>

        <Section title="Token & meta">
          {txt("token", "Token")}
          {txt("tokenAddress", "Token address")}
          {txt("challengeName", "Challenge name")}
          {txt("tags", "Tags (comma separated)")}
        </Section>

        <div className="flex flex-col gap-3">
          <Field label="Stop loss comment">
            <Textarea value={form.stopLossComment} onChange={(v) => set("stopLossComment", v)} />
          </Field>
          <Field label="Comment">
            <Textarea value={form.comment} onChange={(v) => set("comment", v)} />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={(v) => set("description", v)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Toggle
            label="Trade active"
            checked={form.isTradeActive}
            onChange={(v) => set("isTradeActive", v)}
          />
          <Toggle label="DEX" checked={form.dex} onChange={(v) => set("dex", v)} />
          <Toggle label="Default" checked={form.default} onChange={(v) => set("default", v)} />
        </div>
      </div>

      <ModalActions>
        <button
          onClick={onClose}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={updateTrade.isPending}
          className="btn btn-primary"
        >
          {updateTrade.isPending ? "Saving…" : "Save"}
        </button>
      </ModalActions>
    </Modal>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-gray-400 text-xs uppercase tracking-wide mb-2">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </div>
  )
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="field"
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

function Textarea({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
      className="field resize-none"
    />
  )
}
