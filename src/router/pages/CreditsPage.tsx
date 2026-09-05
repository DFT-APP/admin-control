import { useState } from "react"
import { DataTable } from "@/components/table/DataTable"
import { Modal, Field, Input, ModalActions } from "@/components/ui/modal"
import {
  useWallets,
  useLedger,
  useWithdrawals,
  useAdjustCredits,
  useUpdateWithdrawalStatus,
  WITHDRAWAL_TRANSITIONS,
  type AdminWallet,
  type LedgerEntry,
  type AdminWithdrawal,
} from "@/hooks/useCredits"

type Tab = "wallets" | "ledger" | "withdrawals"

const TABS: { id: Tab; label: string }[] = [
  { id: "wallets", label: "Wallets" },
  { id: "ledger", label: "Ledger" },
  { id: "withdrawals", label: "Withdrawals" },
]

const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })

export default function CreditsPage() {
  const [tab, setTab] = useState<Tab>("wallets")

  return (
    <div className="page">
      <div className="mb-6">
        <h1 className="page-title">Credits</h1>
        <p className="page-subtitle">
          Wallet balances, every movement behind them, and the payout queue.
        </p>
      </div>

      {/* Three sections, so on a phone each tab takes a third of the width
          rather than wrapping unpredictably. */}
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

      {tab === "wallets" && <WalletsTab />}
      {tab === "ledger" && <LedgerTab />}
      {tab === "withdrawals" && <WithdrawalsTab />}
    </div>
  )
}

/* ───────────────────────────── Wallets ─────────────────────────── */

function WalletsTab() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [adjusting, setAdjusting] = useState<AdminWallet | null>(null)

  const { data, isLoading, isError, error } = useWallets(page, search)
  const totals = data?.totals

  const columns = [
    {
      key: "userName",
      label: "User",
      primary: true,
      render: (w: AdminWallet) => (
        <div className="flex flex-col">
          <span className="text-gray-100 font-medium">{w.userName}</span>
          <span className="text-gray-500 text-xs">{w.userEmail}</span>
        </div>
      ),
    },
    {
      key: "balance",
      label: "Balance",
      sortable: true,
      render: (w: AdminWallet) => (
        <span className={w.balance > 0 ? "text-[#a3e635] font-medium" : "text-gray-500"}>
          {money(w.balance)}
        </span>
      ),
    },
    {
      key: "entries",
      label: "Movements",
      sortable: true,
      render: (w: AdminWallet) => <span className="text-gray-400">{w.entries}</span>,
    },
    {
      key: "updatedAt",
      label: "Last change",
      sortable: true,
      render: (w: AdminWallet) => (
        <span className="text-gray-400 text-xs">
          {new Date(w.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
  ]

  return (
    <>
      {isError && <ErrorBar message={(error as Error)?.message} />}

      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
        <Tile label="Credits in circulation" value={totals ? money(totals.totalBalance) : "—"} accent />
        <Tile label="Wallets" value={totals ? String(totals.totalWallets) : "—"} />
        <Tile label="With a balance" value={totals ? String(totals.fundedWallets) : "—"} />
      </div>

      <DataTable
        data={data?.wallets ?? []}
        columns={columns}
        loading={isLoading}
        emptyMessage="No wallets found"
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
        actions={(w: AdminWallet) => (
          <button
            onClick={() => setAdjusting(w)}
            className="btn btn-sm btn-secondary hover:border-[#a3e635]"
          >
            Adjust
          </button>
        )}
      />

      {adjusting && (
        <AdjustModal wallet={adjusting} onClose={() => setAdjusting(null)} />
      )}
    </>
  )
}

function AdjustModal({
  wallet,
  onClose,
}: {
  wallet: AdminWallet
  onClose: () => void
}) {
  const adjust = useAdjustCredits()
  const [direction, setDirection] = useState<"CREDIT" | "DEBIT">("CREDIT")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")

  const value = Number(amount)
  const valid = amount.trim() !== "" && !Number.isNaN(value) && value > 0
  const overdraw = direction === "DEBIT" && valid && value > wallet.balance
  const projected = valid
    ? direction === "CREDIT"
      ? wallet.balance + value
      : wallet.balance - value
    : wallet.balance

  const submit = () => {
    if (!valid || overdraw) return
    adjust.mutate(
      { userId: wallet.userId, direction, amount: value, note: note || undefined },
      { onSuccess: onClose }
    )
  }

  return (
    <Modal title={`Adjust ${wallet.userName}'s wallet`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="bg-[#0d0d0d] border border-white/10 rounded-lg p-3">
          <p className="text-gray-500 text-xs">Current balance</p>
          <p className="text-white text-xl font-bold">{money(wallet.balance)}</p>
        </div>

        <Field label="Direction">
          <div className="grid grid-cols-2 gap-2">
            {(["CREDIT", "DEBIT"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={`chip px-2 ${direction === d ? "chip-active" : ""}`}
              >
                {d === "CREDIT" ? "Add credits" : "Remove credits"}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Amount">
          <Input value={amount} onChange={setAmount} type="number" inputMode="decimal" placeholder="0" />
        </Field>

        <Field label="Note (recorded with the adjustment)">
          <Input value={note} onChange={setNote} placeholder="Reason for this change" />
        </Field>

        {valid && (
          <p className={`text-xs ${overdraw ? "text-red-400" : "text-gray-400"}`}>
            {overdraw
              ? `Cannot remove ${money(value)} — the balance is only ${money(wallet.balance)}.`
              : `New balance will be ${money(projected)}.`}
          </p>
        )}

        <p className="text-gray-600 text-xs">
          This writes an ADMIN_ADJUSTMENT entry to the ledger with your user id attached.
        </p>
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
          disabled={!valid || overdraw || adjust.isPending}
          className="btn btn-primary"
        >
          {adjust.isPending ? "Saving…" : "Apply"}
        </button>
      </ModalActions>
    </Modal>
  )
}

/* ────────────────────────────── Ledger ─────────────────────────── */

function LedgerTab() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [direction, setDirection] = useState("")
  const [referenceType, setReferenceType] = useState("")

  const { data, isLoading, isError, error } = useLedger({
    page,
    direction,
    referenceType,
    search,
  })

  const columns = [
    {
      key: "createdAt",
      label: "When",
      sortable: true,
      render: (e: LedgerEntry) => (
        <span className="text-gray-400 text-xs">
          {new Date(e.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "userName",
      label: "User",
      primary: true,
      render: (e: LedgerEntry) => (
        <span className="text-gray-100 font-medium">{e.userName}</span>
      ),
    },
    {
      key: "direction",
      label: "Direction",
      render: (e: LedgerEntry) => (
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            e.direction === "CREDIT"
              ? "text-[#a3e635] bg-[#a3e635]/10"
              : "text-orange-300 bg-orange-400/10"
          }`}
        >
          {e.direction === "CREDIT" ? "+ In" : "− Out"}
        </span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (e: LedgerEntry) => (
        <span className="text-gray-100 font-medium">{money(e.amount)}</span>
      ),
    },
    {
      key: "balanceAfter",
      label: "Balance",
      render: (e: LedgerEntry) => (
        <span className="text-gray-400 text-xs">
          {money(e.balanceBefore)} → {money(e.balanceAfter)}
        </span>
      ),
    },
    {
      key: "referenceType",
      label: "Reason",
      render: (e: LedgerEntry) => (
        <div className="flex flex-col">
          <span className="text-gray-300 text-xs">{e.referenceType || "—"}</span>
          {e.referenceId != null && (
            <span className="text-gray-600 text-xs">ref #{e.referenceId}</span>
          )}
        </div>
      ),
    },
  ]

  const selectClass = "field sm:w-48"

  return (
    <>
      {isError && <ErrorBar message={(error as Error)?.message} />}

      <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 mb-4">
        <select
          value={direction}
          onChange={(e) => {
            setDirection(e.target.value)
            setPage(1)
          }}
          className={selectClass}
        >
          <option value="">All directions</option>
          <option value="CREDIT">Credits in</option>
          <option value="DEBIT">Credits out</option>
        </select>

        <select
          value={referenceType}
          onChange={(e) => {
            setReferenceType(e.target.value)
            setPage(1)
          }}
          className={selectClass}
        >
          <option value="">All reasons</option>
          {(data?.referenceTypes ?? []).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        data={data?.entries ?? []}
        columns={columns}
        loading={isLoading}
        emptyMessage="No ledger entries match this filter"
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
      />
    </>
  )
}

/* ─────────────────────────── Withdrawals ───────────────────────── */

function WithdrawalsTab() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")
  const [acting, setActing] = useState<AdminWithdrawal | null>(null)

  const { data, isLoading, isError, error } = useWithdrawals(page, status)
  const counts = data?.counts ?? {}

  const columns = [
    {
      key: "userName",
      label: "User",
      primary: true,
      render: (w: AdminWithdrawal) => (
        <div className="flex flex-col">
          <span className="text-gray-100 font-medium">{w.userName || "Unknown"}</span>
          <span className="text-gray-500 text-xs">{w.userEmail}</span>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (w: AdminWithdrawal) => (
        <span className="text-gray-100 font-medium">{money(w.amount)}</span>
      ),
    },
    {
      key: "method",
      label: "Destination",
      render: (w: AdminWithdrawal) => (
        <div className="flex flex-col lg:max-w-[220px]">
          <span className="text-gray-300 text-xs">{w.method.replace(/_/g, " ")}</span>
          <span className="text-gray-500 text-xs break-all lg:truncate" title={w.destination}>
            {w.destination}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (w: AdminWithdrawal) => <WithdrawalPill status={w.status} />,
    },
    {
      key: "createdAt",
      label: "Requested",
      sortable: true,
      render: (w: AdminWithdrawal) => (
        <span className="text-gray-400 text-xs">
          {new Date(w.createdAt).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <>
      {isError && <ErrorBar message={(error as Error)?.message} />}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 mb-4">
        {["PENDING", "PROCESSING", "PAID", "FAILED", "CANCELLED"].map((s) => (
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
            <p className="text-gray-400 text-xs mb-1">{s}</p>
            <p className="text-white text-lg sm:text-xl font-bold">{counts[s] ?? 0}</p>
          </button>
        ))}
      </div>

      <DataTable
        data={data?.withdrawals ?? []}
        columns={columns}
        loading={isLoading}
        emptyMessage="No withdrawal requests"
        serverPagination={{
          page: data?.page ?? 1,
          totalPages: data?.totalPages ?? 1,
          total: data?.total,
          onPageChange: setPage,
        }}
        actions={(w: AdminWithdrawal) => (
          <button
            onClick={() => setActing(w)}
            className="btn btn-sm btn-secondary hover:border-[#a3e635]"
          >
            {WITHDRAWAL_TRANSITIONS[w.status]?.length ? "Review" : "History"}
          </button>
        )}
      />

      {acting && (
        <WithdrawalModal withdrawal={acting} onClose={() => setActing(null)} />
      )}
    </>
  )
}

function WithdrawalPill({ status }: { status: string }) {
  const tone =
    status === "PAID"
      ? "text-[#a3e635] bg-[#a3e635]/10"
      : status === "PENDING"
      ? "text-amber-400 bg-amber-400/10"
      : status === "PROCESSING"
      ? "text-blue-300 bg-blue-400/10"
      : "text-red-400 bg-red-400/10"
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${tone}`}>{status}</span>
}

function WithdrawalModal({
  withdrawal,
  onClose,
}: {
  withdrawal: AdminWithdrawal
  onClose: () => void
}) {
  const update = useUpdateWithdrawalStatus()
  const [note, setNote] = useState("")
  const next = WITHDRAWAL_TRANSITIONS[withdrawal.status] ?? []

  const move = (status: string) =>
    update.mutate(
      { withdrawalId: withdrawal.withdrawalId, status, note: note || undefined },
      { onSuccess: onClose }
    )

  return (
    <Modal title={`Withdrawal #${withdrawal.withdrawalId}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="bg-[#0d0d0d] border border-white/10 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs">{withdrawal.userName}</p>
            <p className="text-white text-xl font-bold">{money(withdrawal.amount)}</p>
          </div>
          <WithdrawalPill status={withdrawal.status} />
        </div>

        <div>
          <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-1">
            Paying out to
          </p>
          <p className="text-gray-200 text-sm">{withdrawal.method.replace(/_/g, " ")}</p>
          <p className="text-gray-400 text-xs break-all">{withdrawal.destination}</p>
        </div>

        <div>
          <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-2">History</p>
          <div className="flex flex-col gap-2">
            {withdrawal.history.map((h, i) => (
              <div
                key={i}
                className="flex flex-col xs:flex-row xs:items-start gap-0.5 xs:gap-2 text-xs"
              >
                <span className="text-gray-300 xs:w-24 xs:shrink-0">{h.status}</span>
                <span className="text-gray-500 xs:flex-1">{h.note || "—"}</span>
                <span className="text-gray-600">{new Date(h.at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {next.length > 0 ? (
          <>
            <Field label="Note (saved with the status change)">
              <Input value={note} onChange={setNote} placeholder="Optional" />
            </Field>
            <div>
              <p className="text-gray-500 text-xs mb-2">
                Marking this FAILED or CANCELLED refunds the amount to the user's wallet.
              </p>
              <div className="flex flex-wrap gap-2">
                {next.map((s) => (
                  <button
                    key={s}
                    onClick={() => move(s)}
                    disabled={update.isPending}
                    className={`btn btn-sm ${
                      s === "PAID"
                        ? "btn-primary"
                        : s === "FAILED" || s === "CANCELLED"
                        ? "btn-danger"
                        : "btn-secondary"
                    }`}
                  >
                    Mark {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-sm">
            This withdrawal is {withdrawal.status.toLowerCase()} — it cannot move further.
          </p>
        )}
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

/* ───────────────────────────── Shared ──────────────────────────── */

function Tile({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="bg-[#111111] rounded-xl p-3 sm:p-4 border border-white/5">
      <p className="text-gray-400 text-[11px] sm:text-xs mb-1 leading-snug">{label}</p>
      <p className={`text-lg sm:text-2xl font-bold tabular-nums ${accent ? "text-[#a3e635]" : "text-white"}`}>
        {value}
      </p>
    </div>
  )
}

function ErrorBar({ message }: { message?: string }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm mb-4">
      {message || "Something went wrong"}
    </div>
  )
}
