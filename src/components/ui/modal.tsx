import { useEffect, useRef, type ReactNode } from "react"
import { X } from "lucide-react"

/**
 * How many dialogs are currently mounted. The page behind a dialog must not
 * scroll, but a dialog opened from another one would otherwise release the
 * lock for both when only the inner one closes.
 */
let openDialogs = 0

function useDialogChrome(onClose: () => void) {
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null

    // Locking `overflow` alone still lets iOS Safari rubber-band the page
    // behind the sheet, which drags the dialog with it.
    if (openDialogs === 0) {
      document.body.style.overflow = "hidden"
      document.body.style.touchAction = "none"
    }
    openDialogs += 1

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      openDialogs -= 1
      if (openDialogs === 0) {
        document.body.style.overflow = ""
        document.body.style.touchAction = ""
      }
      previouslyFocused.current?.focus?.()
    }
  }, [onClose])
}

export function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  /** Use a wider container for dense / multi-column content. */
  wide?: boolean
}) {
  useDialogChrome(onClose)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/70 backdrop-blur-[2px] sm:p-4 overlay-in"
      onClick={onClose}
      role="presentation"
    >
      {/*
        Phones get a bottom sheet: it opens under the thumb, uses the full
        width, and stops short of the status bar. From sm up it becomes a
        conventional centred dialog.
      */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`
          w-full ${wide ? "sm:max-w-3xl" : "sm:max-w-md"}
          max-h-[92dvh] sm:max-h-[88dvh] flex flex-col
          bg-[#111111] border border-white/10
          rounded-t-2xl sm:rounded-2xl shadow-2xl sheet-in
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* The grab handle reads as "drag me down to dismiss" on a phone,
            which is where the sheet shape sets that expectation. */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center flex-shrink-0">
          <span className="h-1 w-10 rounded-full bg-white/15" />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-3 sm:pt-5 pb-3 flex-shrink-0 border-b border-white/5">
          <h2 className="text-white text-base sm:text-lg font-semibold leading-snug min-w-0 break-words">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-2 -mt-1 p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Only the body scrolls, so the title and the action row stay put
            while a long form is filled in. */}
        <div
          className="flex-1 min-h-0 overflow-y-auto touch-scroll px-5 sm:px-6 py-4 sm:py-5"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Footer row for a dialog's buttons. Stacked and full width on a phone —
 * two 40px buttons side by side leave neither of them thumb-sized — and
 * right-aligned from xs up. The primary action is written first so it reads
 * top-of-stack on mobile; `flex-col-reverse` keeps Cancel on the left of the
 * horizontal layout.
 */
export function ModalActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse xs:flex-row xs:justify-end gap-2 mt-6 pt-4 border-t border-white/5">
      {children}
    </div>
  )
}

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  loading,
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  confirmLabel: string
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-gray-300 text-sm leading-relaxed">{message}</p>
      <ModalActions>
        <button onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="btn btn-danger-solid"
        >
          {loading ? "Working…" : confirmLabel}
        </button>
      </ModalActions>
    </Modal>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-gray-400 text-xs">{label}</span>
      {children}
    </label>
  )
}

export function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  inputMode,
  autoComplete,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  /** Picks the phone keyboard — numeric fields should not open QWERTY. */
  inputMode?: "text" | "numeric" | "decimal" | "email" | "tel" | "url" | "search"
  autoComplete?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode ?? (type === "number" ? "decimal" : undefined)}
      autoComplete={autoComplete}
      className="field"
    />
  )
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 w-full bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-2 min-h-[44px] text-left hover:border-white/25 transition-colors"
    >
      <span className="text-gray-200 text-sm">{label}</span>
      <span
        className={`w-10 h-5 rounded-full p-0.5 flex-shrink-0 transition-colors ${
          checked ? "bg-[#a3e635]" : "bg-white/10"
        }`}
      >
        <span
          className={`block w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </span>
    </button>
  )
}
