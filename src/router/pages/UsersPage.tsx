import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { DataTable } from "@/components/table/DataTable"
import {
  useUsers,
  useUpdateUser,
  useDeleteUser,
  type AdminUser,
} from "@/hooks/useAdmin"
import { Modal, ConfirmModal, Field, Input, Toggle, ModalActions } from "@/components/ui/modal"
import { Avatar } from "@/components/ui/avatar"

const columns = [
  {
    key: "userId",
    label: "ID",
    sortable: true,
    render: (u: AdminUser) => <span className="text-gray-500">#{u.userId}</span>,
  },
  {
    key: "userName",
    label: "Name",
    sortable: true,
    primary: true,
    render: (u: AdminUser) => (
      <div className="flex items-center gap-2">
        <Avatar emoji={u.userEmoji} name={u.userName} />
        <span className="text-gray-100 font-medium">{u.userName}</span>
      </div>
    ),
  },
  { key: "userEmail", label: "Email" },
  {
    key: "availableBalance",
    label: "Balance",
    render: (u: AdminUser) => (
      <span className="text-gray-300">
        {Number(u.availableBalance ?? 0).toLocaleString()}
      </span>
    ),
  },
  { key: "status", label: "Role" },
]

export default function UsersPage() {
  // The header's global search lands here as ?q=, so the URL — not local state —
  // owns the term. That keeps a fresh header search applying to a page that is
  // already open, and makes a filtered list shareable.
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get("q") ?? ""

  const [page, setPage] = useState(1)
  const [viewing, setViewing] = useState<AdminUser | null>(null)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null)

  const { data, isLoading, isError, error } = useUsers(page, search)
  const deleteUser = useDeleteUser()

  // Typing replaces the current entry so a search does not bury the back button
  // under one history step per keystroke.
  const applySearch = (value: string) => {
    setSearchParams(value ? { q: value } : {}, { replace: true })
    setPage(1)
  }

  const users = data?.users ?? []

  return (
    <div className="page">
      <h1 className="page-title mb-5 sm:mb-6">Users</h1>

      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm mb-4">
          {(error as Error)?.message || "Failed to load users"}
        </div>
      )}

      <div className="w-full">
        <DataTable
          data={users}
          columns={columns}
          loading={isLoading}
          emptyMessage="No users found"
          searchValue={search}
          onSearchChange={applySearch}
          serverPagination={{
            page: data?.page ?? 1,
            totalPages: data?.totalPages ?? 1,
            total: data?.total,
            onPageChange: setPage,
          }}
          actions={(u: AdminUser) => (
            <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:justify-end">
              <button
                onClick={() => setViewing(u)}
                className="btn btn-sm btn-secondary hover:border-[#a3e635]"
              >
                View
              </button>
              <button
                onClick={() => setEditing(u)}
                className="btn btn-sm btn-secondary hover:border-[#a3e635]"
              >
                Edit
              </button>
              <button
                onClick={() => setConfirmDelete(u)}
                className="btn btn-sm btn-danger"
              >
                Delete
              </button>
            </div>
          )}
        />
      </div>

      {viewing && <ViewUserModal user={viewing} onClose={() => setViewing(null)} />}

      {editing && (
        <EditUserModal user={editing} onClose={() => setEditing(null)} />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete user"
          message={`Permanently delete "${confirmDelete.userName}"? This cannot be undone.`}
          confirmLabel="Delete"
          loading={deleteUser.isPending}
          onConfirm={() =>
            deleteUser.mutate(confirmDelete.userId, {
              onSuccess: () => setConfirmDelete(null),
            })
          }
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

/* ───────────────────────────── View (all params) ───────────────── */

function camelToLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

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

function ViewUserModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const entries = Object.entries(user)
  return (
    <Modal title={`User #${user.userId} — ${user.userName}`} onClose={onClose} wide>
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

/* ───────────────────────────── Edit modal ───────────────────────── */

function EditUserModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const updateUser = useUpdateUser()
  const [form, setForm] = useState({
    userName: user.userName ?? "",
    userEmail: user.userEmail ?? "",
    phone: user.phone ?? "",
    userEmoji: user.userEmoji ?? "",
    profileColor: user.profileColor ?? "",
    colorId: user.colorId != null ? String(user.colorId) : "",
    selectedBgColorIndex:
      user.selectedBgColorIndex != null ? String(user.selectedBgColorIndex) : "",
    deviceType: user.deviceType ?? "",
    availableBalance: String(user.availableBalance ?? ""),
    redeemBalance: String(user.redeemBalance ?? ""),
    isAdmin: user.isAdmin,
    isAdminApprovedAnalyst: user.isAdminApprovedAnalyst,
    isAnalystFormFilled: user.isAnalystFormFilled,
  })
  const [password, setPassword] = useState("")

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }))

  const submit = () => {
    const trimmed = password.trim()
    const toNum = (v: string) => (v.trim() === "" ? null : Number(v))
    updateUser.mutate(
      {
        userId: user.userId,
        ...form,
        colorId: toNum(form.colorId),
        selectedBgColorIndex: toNum(form.selectedBgColorIndex),
        ...(trimmed ? { password: trimmed } : {}),
      },
      {
        onSuccess: () => {
          setPassword("")
          onClose()
        },
      }
    )
  }

  return (
    <Modal title={`Edit user #${user.userId}`} onClose={onClose} wide>
      <div className="flex flex-col gap-5">
        <div>
          <h3 className="text-gray-400 text-xs uppercase tracking-wide mb-2">Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Name">
              <Input value={form.userName} onChange={(v) => set("userName", v)} />
            </Field>
            <Field label="Email">
              <Input type="email" inputMode="email" value={form.userEmail} onChange={(v) => set("userEmail", v)} />
            </Field>
            <Field label="Phone">
              <Input type="tel" inputMode="tel" value={form.phone} onChange={(v) => set("phone", v)} />
            </Field>
            <Field label="Emoji">
              <Input value={form.userEmoji} onChange={(v) => set("userEmoji", v)} />
            </Field>
            <Field label="Profile color">
              <Input value={form.profileColor} onChange={(v) => set("profileColor", v)} placeholder="#a3e635" />
            </Field>
            <Field label="Color ID">
              <Input type="number" value={form.colorId} onChange={(v) => set("colorId", v)} />
            </Field>
            <Field label="Background color index">
              <Input
                type="number"
                value={form.selectedBgColorIndex}
                onChange={(v) => set("selectedBgColorIndex", v)}
              />
            </Field>
            <Field label="Device type">
              <Input value={form.deviceType} onChange={(v) => set("deviceType", v)} placeholder="ios / android / web" />
            </Field>
          </div>
        </div>

        <div>
          <h3 className="text-gray-400 text-xs uppercase tracking-wide mb-2">Security & balances</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Leave blank to keep"
              />
            </Field>
            <Field label="Available balance">
              <Input
                type="number"
                value={form.availableBalance}
                onChange={(v) => set("availableBalance", v)}
              />
            </Field>
            <Field label="Redeem balance">
              <Input
                type="number"
                value={form.redeemBalance}
                onChange={(v) => set("redeemBalance", v)}
              />
            </Field>
          </div>
        </div>

        <div>
          <h3 className="text-gray-400 text-xs uppercase tracking-wide mb-2">Roles & status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Toggle
              label="Admin access"
              checked={form.isAdmin}
              onChange={(v) => set("isAdmin", v)}
            />
            <Toggle
              label="Approved analyst"
              checked={form.isAdminApprovedAnalyst}
              onChange={(v) => set("isAdminApprovedAnalyst", v)}
            />
            <Toggle
              label="Analyst form filled"
              checked={form.isAnalystFormFilled}
              onChange={(v) => set("isAnalystFormFilled", v)}
            />
          </div>
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
          disabled={updateUser.isPending}
          className="btn btn-primary"
        >
          {updateUser.isPending ? "Saving…" : "Save"}
        </button>
      </ModalActions>
    </Modal>
  )
}
