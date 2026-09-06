import { useState } from "react"
import { DataTable } from "@/components/table/DataTable"
import { Modal, Field, ModalActions } from "@/components/ui/modal"
import {
  useTickets,
  useRespondToTicket,
  TICKET_STATUSES,
  TICKET_CATEGORIES,
  STATUS_LABELS,
  type SupportTicket,
  type TicketStatus,
} from "@/hooks/useSupport"

const PAGE_SIZE = 25

export default function SupportPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")
  const [category, setCategory] = useState("")
  const [open, setOpen] = useState<SupportTicket | null>(null)

  const { data, isLoading, isError, error } = useTickets({ page, status, category })
  const counts = data?.counts ?? {}
  const total = data?.pagination.total ?? 0

  const columns = [
    {
      key: "subject",
      label: "Ticket",
      primary: true,
      render: (t: SupportTicket) => (
        <div className="flex flex-col min-w-0">
          <span className="text-gray-100 font-medium break-words">{t.subject}</span>
          <span className="text-gray-500 text-xs">
            #{t.id} · {t.category}
          </span>
        </div>
      ),
    },
    {
      key: "user",
      label: "From",
      render: (t: SupportTicket) => (
        <div className="flex flex-col">
          <span className="text-gray-200 text-sm">{t.user?.userName || "Unknown"}</span>
          <span className="text-gray-500 text-xs break-all">{t.user?.userEmail}</span>
        </div>
      ),
    },
    {
      key: "message",
      label: "Message",
      hideOnCard: true,
      render: (t: SupportTicket) => (
        <p className="text-gray-400 text-xs lg:max-w-[280px] lg:truncate" title={t.message}>
          {t.message}
        </p>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (t: SupportTicket) => <StatusPill status={t.status} />,
    },
    {
      key: "createdAt",
      label: "Opened",
      sortable: true,
      render: (t: SupportTicket) => (
        <span className="text-gray-400 text-xs">
          {new Date(t.createdAt).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <div className="page">
      <div className="mb-6">
        <h1 className="page-title">Support</h1>
        <p className="page-subtitle">
          Tickets raised from the app. Replying emails the user and pushes the
          answer back into their ticket.
        </p>
      </div>

      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm mb-4">
          {(error as Error)?.message || "Could not load tickets"}
        </div>
      )}

      {/* Counts span the whole backlog, not the current page, so they stay
          meaningful while a filter is applied. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
        {TICKET_STATUSES.map((s) => (
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
            <p className="text-gray-400 text-xs mb-1">{STATUS_LABELS[s]}</p>
            <p className="text-white text-lg sm:text-xl font-bold">{counts[s] ?? 0}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => {
            setCategory("")
            setPage(1)
          }}
          className={`chip ${category === "" ? "chip-active" : ""}`}
        >
          All categories
        </button>
        {TICKET_CATEGORIES.map((c) => (
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
        data={data?.tickets ?? []}
        columns={columns}
        loading={isLoading}
        emptyMessage="No tickets match this filter"
        serverPagination={{
          page,
          totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
          total,
          onPageChange: setPage,
        }}
        actions={(t: SupportTicket) => (
          <button
            onClick={() => setOpen(t)}
            className="btn btn-sm btn-secondary hover:border-[#a3e635]"
          >
            {t.adminResponse ? "View" : "Reply"}
          </button>
        )}
      />

      {open && <TicketModal ticket={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

export function StatusPill({ status }: { status: TicketStatus }) {
  const tone =
    status === "RESOLVED"
      ? "text-[#a3e635] bg-[#a3e635]/10"
      : status === "OPEN"
      ? "text-amber-400 bg-amber-400/10"
      : status === "IN_PROGRESS"
      ? "text-blue-300 bg-blue-400/10"
      : "text-gray-400 bg-white/5"
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${tone}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function TicketModal({
  ticket,
  onClose,
}: {
  ticket: SupportTicket
  onClose: () => void
}) {
  const respond = useRespondToTicket()
  // Pre-filled so editing an existing reply is the same gesture as writing one.
  const [reply, setReply] = useState(ticket.adminResponse ?? "")

  const trimmed = reply.trim()
  const unchanged = trimmed === (ticket.adminResponse ?? "").trim()

  const send = () => {
    if (!trimmed || unchanged) return
    respond.mutate({ id: ticket.id, response: trimmed }, { onSuccess: onClose })
  }

  const setStatus = (status: TicketStatus) =>
    respond.mutate({ id: ticket.id, status }, { onSuccess: onClose })

  return (
    <Modal title={`#${ticket.id} · ${ticket.subject}`} onClose={onClose} wide>
      <div className="flex flex-col gap-4">
        <div className="bg-[#0d0d0d] border border-white/10 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-gray-200 text-sm">{ticket.user?.userName || "Unknown"}</p>
            <p className="text-gray-500 text-xs break-all">{ticket.user?.userEmail}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs capitalize">{ticket.category}</span>
            <StatusPill status={ticket.status} />
          </div>
        </div>

        <div>
          <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-1.5">
            Their message · {new Date(ticket.createdAt).toLocaleString()}
          </p>
          <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {ticket.message}
          </p>
        </div>

        <Field label={ticket.adminResponse ? "Your reply (editing sends again)" : "Your reply"}>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="Write the answer the user will see in the app…"
            className="field resize-y min-h-[7rem]"
          />
        </Field>
        <p className="text-gray-500 text-xs -mt-2">
          Sending a reply moves an open ticket to In progress and emails the user.
        </p>

        <div>
          <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-2">
            Set status
          </p>
          <div className="flex flex-wrap gap-2">
            {TICKET_STATUSES.filter((s) => s !== ticket.status).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                disabled={respond.isPending}
                className="btn btn-sm btn-secondary"
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ModalActions>
        <button onClick={onClose} className="btn btn-secondary">
          Close
        </button>
        <button
          onClick={send}
          disabled={!trimmed || unchanged || respond.isPending}
          className="btn btn-primary"
        >
          {respond.isPending ? "Sending…" : "Send reply"}
        </button>
      </ModalActions>
    </Modal>
  )
}
