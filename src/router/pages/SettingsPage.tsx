import { useState } from "react"
import { Modal, ConfirmModal, Field, Input, ModalActions } from "@/components/ui/modal"
import {
  useAdmins,
  useSystemStatus,
  useAddAdmin,
  useRemoveAdmin,
  useChangePassword,
  type AdminUserRow,
} from "@/hooks/useSettings"
import { useAuth } from "@/hooks/useAuth"

export default function SettingsPage() {
  return (
    <div className="page">
      <div className="mb-6">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          Who can administer the platform, your own credentials, and what the server is running.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-start">
        <AdminsCard />
        <div className="flex flex-col gap-3 sm:gap-4">
          <AccountCard />
          <SystemCard />
        </div>
      </div>
    </div>
  )
}

function Card({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-[#111111] rounded-xl p-4 sm:p-5 border border-white/5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-white text-sm font-semibold">{title}</h2>
          {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

/* ────────────────────────── Administrators ─────────────────────── */

function AdminsCard() {
  const { data, isLoading, isError, error } = useAdmins()
  const removeAdmin = useRemoveAdmin()
  const [adding, setAdding] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<AdminUserRow | null>(null)

  const admins = data?.admins ?? []
  const isLastAdmin = admins.length <= 1

  return (
    <Card
      title="Administrators"
      subtitle="Accounts that can sign in to this panel"
      action={
        <button
          onClick={() => setAdding(true)}
          className="btn btn-sm btn-primary"
        >
          Add admin
        </button>
      }
    >
      {isError && (
        <p className="text-red-300 text-sm">
          {(error as Error)?.message || "Could not load admins"}
        </p>
      )}

      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : (
        <div className="flex flex-col">
          {admins.map((a) => {
            const isSelf = a.userId === data?.currentUserId
            return (
              <div
                key={a.userId}
                className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-white/5 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-gray-100 text-sm font-medium truncate">
                    {a.userName}
                    {isSelf && (
                      <span className="ml-2 text-[#a3e635] text-xs font-normal">you</span>
                    )}
                  </p>
                  <p className="text-gray-500 text-xs truncate">{a.userEmail}</p>
                </div>

                <button
                  onClick={() => setConfirmRemove(a)}
                  disabled={isSelf || isLastAdmin}
                  title={
                    isSelf
                      ? "You cannot revoke your own access"
                      : isLastAdmin
                      ? "There must be at least one admin"
                      : undefined
                  }
                  className="btn btn-sm btn-danger disabled:opacity-30"
                >
                  Revoke
                </button>
              </div>
            )
          })}
        </div>
      )}

      {adding && <AddAdminModal onClose={() => setAdding(false)} />}

      {confirmRemove && (
        <ConfirmModal
          title="Revoke admin access"
          message={`${confirmRemove.userName} will lose access to this panel. Their account and data are untouched.`}
          confirmLabel="Revoke"
          loading={removeAdmin.isPending}
          onConfirm={() =>
            removeAdmin.mutate(confirmRemove.userId, {
              onSuccess: () => setConfirmRemove(null),
            })
          }
          onClose={() => setConfirmRemove(null)}
        />
      )}
    </Card>
  )
}

function AddAdminModal({ onClose }: { onClose: () => void }) {
  const addAdmin = useAddAdmin()
  const [email, setEmail] = useState("")

  return (
    <Modal title="Add an administrator" onClose={onClose}>
      <div className="flex flex-col gap-3 sm:gap-4">
        <Field label="Email of an existing user">
          <Input value={email} onChange={setEmail} type="email" inputMode="email" placeholder="person@example.com" />
        </Field>
        <p className="text-gray-500 text-xs">
          The account must already exist. Granting admin gives full access to every
          section of this panel, including credits and withdrawals.
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
          onClick={() =>
            addAdmin.mutate({ userEmail: email.trim() }, { onSuccess: onClose })
          }
          disabled={!email.trim() || addAdmin.isPending}
          className="btn btn-primary"
        >
          {addAdmin.isPending ? "Adding…" : "Add admin"}
        </button>
      </ModalActions>
    </Modal>
  )
}

/* ──────────────────────────── My account ───────────────────────── */

function AccountCard() {
  const { account } = useAuth()
  const changePassword = useChangePassword()

  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")

  const mismatch = confirm.length > 0 && next !== confirm
  const tooShort = next.length > 0 && next.length < 8
  const ready = current && next.length >= 8 && next === confirm

  const submit = () => {
    if (!ready) return
    changePassword.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setCurrent("")
          setNext("")
          setConfirm("")
        },
      }
    )
  }

  return (
    <Card title="Your account" subtitle={account?.userEmail}>
      <div className="flex flex-col gap-3">
        <Field label="Current password">
          <Input value={current} onChange={setCurrent} type="password" autoComplete="current-password" />
        </Field>
        <Field label="New password">
          <Input value={next} onChange={setNext} type="password" autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password">
          <Input value={confirm} onChange={setConfirm} type="password" autoComplete="new-password" />
        </Field>

        {tooShort && (
          <p className="text-amber-400 text-xs">Use at least 8 characters.</p>
        )}
        {mismatch && <p className="text-red-400 text-xs">The two entries do not match.</p>}

        <button
          onClick={submit}
          disabled={!ready || changePassword.isPending}
          className="btn btn-primary self-stretch xs:self-start"
        >
          {changePassword.isPending ? "Updating…" : "Change password"}
        </button>
      </div>
    </Card>
  )
}

/* ────────────────────────────── System ─────────────────────────── */

function uptime(seconds: number) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}m`
  return `${m}m`
}

function SystemCard() {
  const { data, isLoading } = useSystemStatus()
  const dbOk = data?.database === "connected"

  return (
    <Card title="System" subtitle="Live status of the API server">
      {isLoading || !data ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          {data.legacyTokensAccepted && (
            <div className="bg-amber-400/10 border border-amber-400/30 text-amber-300 rounded-lg p-3 text-xs mb-1">
              <strong className="font-semibold">Legacy tokens are being accepted.</strong>{" "}
              Old unsigned tokens still work, which keeps the forgery hole open. Turn
              <code className="mx-1">ACCEPT_LEGACY_TOKENS</code>off once clients have
              re-authenticated.
            </div>
          )}

          <Line label="Environment" value={data.environment} />
          <Line
            label="Database"
            value={
              <span className={dbOk ? "text-[#a3e635]" : "text-red-400"}>
                {dbOk ? `connected · ${data.databaseLatencyMs}ms` : data.database}
              </span>
            }
          />
          <Line label="Uptime" value={uptime(data.uptimeSeconds)} />
          <Line label="Node" value={data.nodeVersion} />
          <Line label="Platform" value={data.platform} />
          <Line label="Host" value={data.hostname} />
          <Line
            label="Memory"
            value={`${data.memory.heapUsedMb} / ${data.memory.heapTotalMb} MB heap · ${data.memory.rssMb} MB rss`}
          />
          <Line label="Server time" value={new Date(data.serverTime).toLocaleString()} />
        </div>
      )}
    </Card>
  )
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-0.5 xs:gap-3 border-b border-white/5 py-1.5 last:border-0">
      <span className="text-gray-500 text-xs flex-shrink-0">{label}</span>
      <span className="text-gray-200 text-xs xs:text-right break-all">{value}</span>
    </div>
  )
}
