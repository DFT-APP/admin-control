import { useState } from "react"
import { Mail, Bell, Users, UserPlus, X, Search, Check } from "lucide-react"
import { Modal, ModalActions, Field } from "@/components/ui/modal"
import { useUsers, type AdminUser } from "@/hooks/useAdmin"
import {
  useAudienceCount,
  useBroadcastHistory,
  useSendBroadcast,
  TITLE_MAX,
  BODY_MAX,
  MAX_SELECTED,
  type Audience,
  type SentBroadcast,
} from "@/hooks/useBroadcast"

export default function BroadcastPage() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [audience, setAudience] = useState<Audience>("selected")
  const [selected, setSelected] = useState<AdminUser[]>([])
  const [sendPush, setSendPush] = useState(true)
  const [sendEmail, setSendEmail] = useState(false)
  const [picking, setPicking] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const userIds = selected.map((u) => u.userId)
  const { data: count, isFetching: counting } = useAudienceCount(audience, userIds)
  const send = useSendBroadcast()

  const hasChannel = sendPush || sendEmail
  const hasAudience = audience === "all" || selected.length > 0
  const ready =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    hasChannel &&
    hasAudience &&
    !send.isPending

  const submit = () => {
    send.mutate(
      {
        title: title.trim(),
        body: body.trim(),
        audience,
        userIds: audience === "selected" ? userIds : undefined,
        sendPush,
        sendEmail,
      },
      {
        onSuccess: () => {
          setConfirming(false)
          setTitle("")
          setBody("")
          setSelected([])
          setAudience("selected")
        },
      }
    )
  }

  return (
    <div className="page">
      <div className="mb-6">
        <h1 className="page-title">Announcements</h1>
        <p className="page-subtitle">
          Send a message to everyone, or to specific people. A push notification
          lands in their in-app inbox; an email goes to the address on their
          account. Neither can be taken back.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="bg-[#111111] rounded-xl border border-white/5 p-4 sm:p-5 flex flex-col gap-5">
          {/* ── Message ── */}
          <div className="flex flex-col gap-3">
            <Field label={`Title (${title.length}/${TITLE_MAX})`}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                placeholder="Scheduled maintenance on Sunday"
                className="field"
              />
            </Field>

            <Field label={`Message (${body.length}/${BODY_MAX})`}>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                rows={7}
                placeholder={
                  "What you want people to know.\n\nLeave a blank line between paragraphs — the email keeps them apart."
                }
                className="field resize-y min-h-[9rem]"
              />
            </Field>
          </div>

          {/* ── Channels ── */}
          <div>
            <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-2">
              Send as
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <ChannelToggle
                icon={<Bell size={16} />}
                label="Push notification"
                hint="Also saved to their in-app inbox"
                checked={sendPush}
                onChange={setSendPush}
                reach={count ? `${count.withPush} reachable` : undefined}
              />
              <ChannelToggle
                icon={<Mail size={16} />}
                label="Email"
                hint="Sent to the account address"
                checked={sendEmail}
                onChange={setSendEmail}
                reach={count ? `${count.withEmail} reachable` : undefined}
              />
            </div>
            {!hasChannel && (
              <p className="text-amber-400 text-xs mt-2">Pick at least one channel.</p>
            )}
          </div>

          {/* ── Audience ── */}
          <div>
            <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-2">
              Who receives it
            </p>
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <AudienceCard
                icon={<UserPlus size={16} />}
                label="Specific users"
                active={audience === "selected"}
                onClick={() => setAudience("selected")}
              />
              <AudienceCard
                icon={<Users size={16} />}
                label="Everyone"
                active={audience === "all"}
                onClick={() => setAudience("all")}
                danger
              />
            </div>

            {audience === "selected" ? (
              <>
                <button
                  onClick={() => setPicking(true)}
                  className="btn btn-sm btn-secondary hover:border-[#a3e635]"
                >
                  {selected.length ? "Edit recipients" : "Choose recipients"}
                </button>

                {selected.length > 0 && (
                  <ul className="flex flex-wrap gap-2 mt-3">
                    {selected.map((u) => (
                      <li key={u.userId}>
                        <button
                          onClick={() =>
                            setSelected((s) => s.filter((x) => x.userId !== u.userId))
                          }
                          className="chip flex items-center gap-1.5 hover:border-red-400/50"
                          title={`Remove ${u.userName}`}
                        >
                          {u.userName}
                          <X size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-amber-300/90 text-sm bg-amber-400/10 border border-amber-400/25 rounded-lg p-3">
                This goes to every account on the platform.
              </p>
            )}
          </div>

          {/* ── Send ── */}
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 pt-4 border-t border-white/5">
            <p className="text-sm text-gray-400">
              {!hasAudience ? (
                "No recipients yet"
              ) : counting ? (
                "Counting…"
              ) : count ? (
                <>
                  Reaching{" "}
                  <span className="text-white font-semibold">{count.total}</span>{" "}
                  {count.total === 1 ? "person" : "people"}
                </>
              ) : (
                "—"
              )}
            </p>
            <button
              onClick={() => setConfirming(true)}
              disabled={!ready}
              className="btn btn-primary"
            >
              Review and send
            </button>
          </div>
        </div>

        <HistoryPanel />
      </div>

      {picking && (
        <RecipientPicker
          selected={selected}
          onDone={(next) => {
            setSelected(next)
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}

      {confirming && (
        <ConfirmSend
          title={title.trim()}
          body={body.trim()}
          audience={audience}
          total={count?.total ?? 0}
          pushReach={sendPush ? count?.withPush ?? 0 : null}
          emailReach={sendEmail ? count?.withEmail ?? 0 : null}
          sending={send.isPending}
          onConfirm={submit}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  )
}

function ChannelToggle({
  icon,
  label,
  hint,
  checked,
  onChange,
  reach,
}: {
  icon: React.ReactNode
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
  reach?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`text-left rounded-xl p-3 border transition-colors ${
        checked
          ? "border-[#a3e635]/40 bg-[#a3e635]/[0.06]"
          : "border-white/10 hover:border-white/25"
      }`}
    >
      <span className="flex items-center gap-2">
        <span className={checked ? "text-[#a3e635]" : "text-gray-500"}>{icon}</span>
        <span className="text-gray-100 text-sm font-medium">{label}</span>
        {checked && <Check size={14} className="text-[#a3e635] ml-auto" />}
      </span>
      <span className="block text-gray-500 text-xs mt-1">{hint}</span>
      {reach && <span className="block text-gray-600 text-xs mt-0.5">{reach}</span>}
    </button>
  )
}

function AudienceCard({
  icon,
  label,
  active,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  danger?: boolean
}) {
  const activeRing = danger ? "border-amber-400/50 bg-amber-400/[0.07]" : "border-[#a3e635]/40 bg-[#a3e635]/[0.06]"
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-xl p-3 border transition-colors ${
        active ? activeRing : "border-white/10 hover:border-white/25"
      }`}
    >
      <span className={active ? (danger ? "text-amber-400" : "text-[#a3e635]") : "text-gray-500"}>
        {icon}
      </span>
      <span className="text-gray-100 text-sm font-medium">{label}</span>
    </button>
  )
}

function RecipientPicker({
  selected,
  onDone,
  onClose,
}: {
  selected: AdminUser[]
  onDone: (next: AdminUser[]) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  // Staged locally so closing without confirming leaves the composer untouched.
  const [draft, setDraft] = useState<AdminUser[]>(selected)

  const { data, isLoading } = useUsers(page, search)
  const users = data?.users ?? []
  const chosen = new Set(draft.map((u) => u.userId))
  const atLimit = draft.length >= MAX_SELECTED

  const toggle = (user: AdminUser) =>
    setDraft((d) =>
      chosen.has(user.userId)
        ? d.filter((u) => u.userId !== user.userId)
        : atLimit
        ? d
        : [...d, user]
    )

  return (
    <Modal title="Choose recipients" onClose={onClose} wide>
      <div className="flex flex-col gap-3">
        <div className="relative">
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
            placeholder="Search by name or email…"
            className="field pl-9"
          />
        </div>

        <p className="text-gray-500 text-xs">
          {draft.length} selected
          {atLimit && (
            <span className="text-amber-400"> — {MAX_SELECTED} is the maximum</span>
          )}
        </p>

        <ul className="max-h-[45vh] overflow-y-auto divide-y divide-white/5 -mr-1 pr-1">
          {isLoading ? (
            <li className="py-6 text-center text-gray-500 text-sm">Loading…</li>
          ) : users.length === 0 ? (
            <li className="py-6 text-center text-gray-500 text-sm">No users found</li>
          ) : (
            users.map((u) => {
              const on = chosen.has(u.userId)
              return (
                <li key={u.userId}>
                  <button
                    onClick={() => toggle(u)}
                    disabled={!on && atLimit}
                    className="w-full flex items-center gap-3 py-2.5 text-left disabled:opacity-40"
                  >
                    <span
                      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        on ? "bg-[#a3e635] border-[#a3e635]" : "border-white/25"
                      }`}
                    >
                      {on && <Check size={11} className="text-black" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm text-gray-200 truncate">
                        {u.userName}
                      </span>
                      <span className="block text-xs text-gray-500 truncate">
                        {u.userEmail}
                      </span>
                    </span>
                    <span className="ml-auto text-xs text-gray-600 flex-shrink-0">
                      {u.status}
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>

        {(data?.totalPages ?? 1) > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              Page {page} of {data?.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn btn-sm btn-secondary"
              >
                Prev
              </button>
              <button
                disabled={page >= (data?.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
                className="btn btn-sm btn-secondary"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ModalActions>
        <button onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button onClick={() => onDone(draft)} className="btn btn-primary">
          Use {draft.length} recipient{draft.length === 1 ? "" : "s"}
        </button>
      </ModalActions>
    </Modal>
  )
}

function ConfirmSend({
  title,
  body,
  audience,
  total,
  pushReach,
  emailReach,
  sending,
  onConfirm,
  onClose,
}: {
  title: string
  body: string
  audience: Audience
  total: number
  pushReach: number | null
  emailReach: number | null
  sending: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  // Sending to everyone is the one action with no undo and no partial scope,
  // so it asks for the word to be typed rather than a second click in the same
  // place the first one landed.
  const [typed, setTyped] = useState("")
  const needsTyping = audience === "all"
  const armed = !needsTyping || typed.trim().toUpperCase() === "SEND"

  return (
    <Modal title="Send this announcement?" onClose={onClose} wide>
      <div className="flex flex-col gap-4">
        <div className="bg-[#0d0d0d] border border-white/10 rounded-lg p-4">
          <p className="text-white font-semibold text-sm mb-1.5">{title}</p>
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {body}
          </p>
        </div>

        <div className="grid gap-2 text-sm">
          <Row label="Recipients">
            <span className="text-white font-semibold">{total}</span>{" "}
            {audience === "all" ? "— everyone on the platform" : "selected"}
          </Row>
          {pushReach !== null && (
            <Row label="Push">
              {pushReach} of {total} have a device registered
              {pushReach < total && (
                <span className="text-gray-500">
                  {" "}
                  — the rest still get it in their inbox
                </span>
              )}
            </Row>
          )}
          {emailReach !== null && (
            <Row label="Email">
              {emailReach} of {total} have an address on file
            </Row>
          )}
        </div>

        {needsTyping && (
          <div className="bg-amber-400/10 border border-amber-400/25 rounded-lg p-3">
            <p className="text-amber-200 text-sm mb-2.5">
              This reaches all {total} accounts and cannot be undone. Type{" "}
              <span className="font-semibold">SEND</span> to confirm.
            </p>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="SEND"
              autoComplete="off"
              className="field"
            />
          </div>
        )}
      </div>

      <ModalActions>
        <button onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={!armed || sending}
          className="btn btn-primary"
        >
          {sending ? "Sending…" : `Send to ${total}`}
        </button>
      </ModalActions>
    </Modal>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <span className="text-gray-500 w-20 flex-shrink-0">{label}</span>
      <span className="text-gray-300 min-w-0">{children}</span>
    </div>
  )
}

function HistoryPanel() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useBroadcastHistory(page)
  const sent = data?.broadcasts ?? []

  return (
    <div className="bg-[#111111] rounded-xl border border-white/5 p-4 sm:p-5 flex flex-col">
      <h2 className="text-white text-[15px] font-semibold mb-3">Sent</h2>

      {isLoading ? (
        <p className="text-gray-500 text-sm py-6 text-center">Loading…</p>
      ) : sent.length === 0 ? (
        <p className="text-gray-600 text-sm py-6 text-center">
          Nothing has been sent yet
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/5">
          {sent.map((b) => (
            <SentRow key={b.id} broadcast={b} />
          ))}
        </ul>
      )}

      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400 mt-4 pt-3 border-t border-white/5">
          <span>
            Page {page} of {data?.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn btn-sm btn-secondary"
            >
              Prev
            </button>
            <button
              disabled={page >= (data?.totalPages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
              className="btn btn-sm btn-secondary"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SentRow({ broadcast: b }: { broadcast: SentBroadcast }) {
  const channels = [
    b.sendPush && `${b.pushSent} push`,
    b.sendEmail && `${b.emailSent} email`,
  ].filter(Boolean)

  return (
    <li className="py-3">
      <p className="text-gray-100 text-sm font-medium break-words">{b.title}</p>
      <p className="text-gray-500 text-xs mt-0.5 line-clamp-2 break-words">{b.body}</p>
      <p className="text-gray-600 text-xs mt-1.5">
        {b.audience === "all" ? "Everyone" : `${b.recipientCount} selected`}
        {channels.length > 0 && ` · ${channels.join(" · ")}`}
        {b.senderName && ` · ${b.senderName}`}
      </p>
      <p className="text-gray-700 text-xs">{new Date(b.createdAt).toLocaleString()}</p>
    </li>
  )
}
