import { useState } from "react"
import { DataTable } from "@/components/table/DataTable"
import {
  useAnalysts,
  useUpdateAnalyst,
  useDeleteAnalyst,
  useSetAnalystStatus,
  type AdminAnalyst,
  type AnalystStatusFilter,
} from "@/hooks/useAdmin"
import { Modal, ConfirmModal, Field, Input, Toggle, ModalActions } from "@/components/ui/modal"

const STATUS_TABS: { key: AnalystStatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
]

const STATUS_STYLES: Record<string, string> = {
  Approved: "bg-[#a3e635]/10 border-[#a3e635]/30 text-[#a3e635]",
  Pending: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  Rejected: "bg-red-500/10 border-red-500/30 text-red-400",
}

const columns = [
  {
    key: "userName",
    label: "Analyst",
    sortable: true,
    primary: true,
    render: (a: AdminAnalyst) => (
      <div className="flex items-center gap-2">
        <span>{a.userEmoji || "👤"}</span>
        <span className="text-gray-100 font-medium">{a.userName}</span>
      </div>
    ),
  },
  { key: "userEmail", label: "Email" },
  {
    key: "totalTrades",
    label: "Trades",
    sortable: true,
    render: (a: AdminAnalyst) => (
      <span className="text-gray-300">
        {a.totalTrades}{" "}
        <span className="text-gray-500 text-xs">({a.activeTrades} active)</span>
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (a: AdminAnalyst) => (
      <div className="flex flex-col gap-1">
        <span
          className={`inline-flex w-fit px-2 py-0.5 rounded-full border text-xs ${
            STATUS_STYLES[a.status] ?? "bg-white/5 border-white/10 text-gray-300"
          }`}
        >
          {a.status}
        </span>
        {/* The reason is the whole point of keeping a rejection on record, so
            show it inline rather than hiding it behind the edit modal. */}
        {a.status === "Rejected" && a.rejectionReason && (
          <span
            className="text-gray-500 text-xs lg:max-w-[220px] lg:truncate"
            title={a.rejectionReason}
          >
            {a.rejectionReason}
          </span>
        )}
      </div>
    ),
  },
]

export default function AnalystPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<AnalystStatusFilter>("all")
  const [editing, setEditing] = useState<AdminAnalyst | null>(null)
  const [rejecting, setRejecting] = useState<AdminAnalyst | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AdminAnalyst | null>(null)

  const { data, isLoading, isError, error } = useAnalysts(page, search, statusFilter)
  const deleteAnalyst = useDeleteAnalyst()
  const setStatus = useSetAnalystStatus()

  const analysts = data?.analysts ?? []

  return (
    <div className="page">
      <h1 className="page-title mb-5 sm:mb-6">Analysts</h1>

      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm mb-4">
          {(error as Error)?.message || "Failed to load analysts"}
        </div>
      )}

      {/* Filtering happens server-side: with 50 rows per page a client-side
          filter would only ever search the page already loaded. */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar -mx-1 px-1 py-0.5 sm:flex-wrap sm:overflow-visible">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatusFilter(tab.key)
              setPage(1)
            }}
            className={`chip flex-1 sm:flex-none ${
              statusFilter === tab.key
                ? "bg-[#a3e635] border-[#a3e635] text-black hover:text-black"
                : ""
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="w-full">
        <DataTable
          data={analysts}
          columns={columns}
          loading={isLoading}
          emptyMessage="No analysts found"
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
          actions={(a: AdminAnalyst) => {
            const busy = setStatus.isPending
            return (
              <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:justify-end">
                {/* Approve is offered to anyone not already approved — including
                    a rejected application an admin has changed their mind about. */}
                {a.status !== "Approved" && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      setStatus.mutate({ analystId: a.analystId, status: "approved" })
                    }
                    className="btn btn-sm btn-accent-soft"
                  >
                    Approve
                  </button>
                )}

                {a.status !== "Rejected" && (
                  <button
                    disabled={busy}
                    onClick={() => setRejecting(a)}
                    className="btn btn-sm btn-danger"
                  >
                    Reject
                  </button>
                )}

                {/* Only meaningful once a decision exists to undo. */}
                {a.status === "Rejected" && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      setStatus.mutate({ analystId: a.analystId, status: "pending" })
                    }
                    className="btn btn-sm btn-secondary"
                  >
                    Reopen
                  </button>
                )}

                <button
                  onClick={() => setEditing(a)}
                  className="btn btn-sm btn-secondary hover:border-[#a3e635]"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(a)}
                  className="btn btn-sm btn-danger"
                >
                  Delete
                </button>
              </div>
            )
          }}
        />
      </div>

      {editing && (
        <EditAnalystModal analyst={editing} onClose={() => setEditing(null)} />
      )}

      {rejecting && (
        <RejectAnalystModal
          analyst={rejecting}
          loading={setStatus.isPending}
          onConfirm={(reason) =>
            setStatus.mutate(
              {
                analystId: rejecting.analystId,
                status: "rejected",
                rejectionReason: reason,
              },
              { onSuccess: () => setRejecting(null) }
            )
          }
          onClose={() => setRejecting(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete analyst"
          message={`Remove analyst "${confirmDelete.userName}"? Their analyst profile will be deleted and the account demoted.`}
          confirmLabel="Delete"
          loading={deleteAnalyst.isPending}
          onConfirm={() =>
            deleteAnalyst.mutate(confirmDelete.analystId, {
              onSuccess: () => setConfirmDelete(null),
            })
          }
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

function RejectAnalystModal({
  analyst,
  loading,
  onConfirm,
  onClose,
}: {
  analyst: AdminAnalyst
  loading?: boolean
  onConfirm: (reason: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState(analyst.rejectionReason ?? "")

  return (
    <Modal title={`Reject ${analyst.userName}`} onClose={onClose}>
      <p className="text-gray-300 text-sm">
        Their application will be marked <span className="text-red-400">Rejected</span> and
        they will be notified. The account and its profile are kept, so the decision can be
        reopened later.
      </p>

      <div className="mt-4">
        <Field label="Reason (optional — shown to the analyst)">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={180}
            placeholder="e.g. Track record could not be verified"
            className="field resize-none"
          />
        </Field>
        <p className="text-gray-600 text-xs mt-1 text-right">{reason.length}/180</p>
      </div>

      <ModalActions>
        <button
          onClick={onClose}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(reason)}
          disabled={loading}
          className="btn btn-danger-solid"
        >
          {loading ? "Rejecting…" : "Reject analyst"}
        </button>
      </ModalActions>
    </Modal>
  )
}

function EditAnalystModal({
  analyst,
  onClose,
}: {
  analyst: AdminAnalyst
  onClose: () => void
}) {
  const updateAnalyst = useUpdateAnalyst()
  const [form, setForm] = useState({
    bio: analyst.bio ?? "",
    twitter: analyst.twitter ?? "",
    youtube: analyst.youtube ?? "",
    discord: analyst.discord ?? "",
    timeZone: analyst.timeZone ?? "",
    isApproved: analyst.isApproved,
  })

  const submit = () => {
    updateAnalyst.mutate(
      { analystId: analyst.analystId, ...form },
      { onSuccess: onClose }
    )
  }

  return (
    <Modal title={`Edit analyst — ${analyst.userName}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Field label="Bio">
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            className="field resize-none"
          />
        </Field>
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
          <Field label="Twitter">
            <Input value={form.twitter} onChange={(v) => setForm({ ...form, twitter: v })} />
          </Field>
          <Field label="YouTube">
            <Input value={form.youtube} onChange={(v) => setForm({ ...form, youtube: v })} />
          </Field>
          <Field label="Discord">
            <Input value={form.discord} onChange={(v) => setForm({ ...form, discord: v })} />
          </Field>
          <Field label="Time zone">
            <Input value={form.timeZone} onChange={(v) => setForm({ ...form, timeZone: v })} />
          </Field>
        </div>
        <Toggle
          label="Approved analyst"
          checked={form.isApproved}
          onChange={(v) => setForm({ ...form, isApproved: v })}
        />
        {analyst.status === "Rejected" && (
          <p className="text-amber-400/80 text-xs">
            This application is rejected. Use Approve or Reopen in the table to clear that —
            saving here only changes profile fields.
          </p>
        )}
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
          disabled={updateAnalyst.isPending}
          className="btn btn-primary"
        >
          {updateAnalyst.isPending ? "Saving…" : "Save"}
        </button>
      </ModalActions>
    </Modal>
  )
}
