import { useEffect, useMemo, useState } from "react"
import {
  useCoinIcons,
  useUploadCoinIcon,
  useReplaceCoinIcon,
  useDeleteCoinIcon,
  MARKETS,
  type CoinIcon,
  type Market,
} from "@/hooks/useCoinIcons"
import { Modal, ConfirmModal, Field, Input, ModalActions } from "@/components/ui/modal"
import { ApiHttpError } from "@/lib/apiClient"

const MARKET_LABELS: Record<Market, string> = {
  crypto: "Crypto",
  stocks: "Stocks",
  forex: "Forex",
}

/**
 * The stored URL is derived from the symbol, so it stays the same when the
 * artwork is replaced — and the browser would keep showing the old file. The
 * object's last-modified time changes on every upload, which makes it the right
 * cache key for the preview.
 */
const previewSrc = (icon: CoinIcon) =>
  `${icon.url}?v=${Date.parse(icon.updatedAt) || 0}`

const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

export default function CoinIconsPage() {
  const [market, setMarket] = useState<Market>("crypto")
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [adding, setAdding] = useState(false)
  const [replacing, setReplacing] = useState<CoinIcon | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CoinIcon | null>(null)

  // The listing is a bucket scan, so it is not worth one request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading, isError, error } = useCoinIcons({ market, page, search })
  const deleteIcon = useDeleteCoinIcon()

  const icons = data?.icons ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="page">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="page-title">Coin Icons</h1>
        <button
          onClick={() => setAdding(true)}
          className="btn btn-primary w-full xs:w-auto"
        >
          Add icon
        </button>
      </div>

      <p className="text-gray-500 text-sm mb-5 sm:mb-6 max-w-2xl">
        The ticker logos the app shows next to every trade. Each icon is stored
        under its symbol, so replacing one updates it everywhere without any
        app release.
      </p>

      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm mb-4">
          {(error as Error)?.message || "Failed to load coin icons"}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 mb-5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-0.5 sm:mx-0 sm:px-0 sm:overflow-visible">
          {MARKETS.map((m) => (
            <button
              key={m}
              onClick={() => {
                setMarket(m)
                setPage(1)
              }}
              className={`chip flex-1 sm:flex-none ${market === m ? "chip-active" : ""}`}
            >
              {MARKET_LABELS[m]}
            </button>
          ))}
        </div>

        <span className="hidden sm:block w-px h-6 bg-white/10 mx-1" />

        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search symbol…"
          aria-label="Search symbol"
          type="search"
          className="field sm:w-52"
        />

        {data && (
          <span className="text-gray-500 text-sm sm:ml-auto">
            {data.total} icon{data.total === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-500 text-sm">Loading…</div>
      ) : icons.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm">
          {search
            ? `No icon matches "${search}" in ${MARKET_LABELS[market]}`
            : `No icons stored for ${MARKET_LABELS[market]} yet`}
        </div>
      ) : (
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3">
          {icons.map((icon) => (
            <IconCard
              key={icon.key}
              icon={icon}
              onReplace={() => setReplacing(icon)}
              onDelete={() => setConfirmDelete(icon)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-6 text-sm text-gray-400">
        <span>
          Page {data?.page ?? 1} of {totalPages}
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
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn btn-sm btn-secondary"
          >
            Next
          </button>
        </div>
      </div>

      {adding && (
        <AddIconModal market={market} onClose={() => setAdding(false)} />
      )}

      {replacing && (
        <ReplaceIconModal icon={replacing} onClose={() => setReplacing(null)} />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete coin icon"
          message={`Delete the ${confirmDelete.symbol} icon? The app falls back to its placeholder coin for this symbol until a new icon is uploaded.`}
          confirmLabel="Delete"
          loading={deleteIcon.isPending}
          onConfirm={() =>
            deleteIcon.mutate(
              { symbol: confirmDelete.symbol, market: confirmDelete.market },
              { onSuccess: () => setConfirmDelete(null) }
            )
          }
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

/* ─────────────────────────── Shared pieces ─────────────────────── */

/**
 * Many coin logos are genuinely dark (ETH, XRP) or carry no fill at all, which
 * renders black. The app draws them on a light chip for exactly this reason, so
 * the panel previews them the same way — otherwise half the grid looks empty.
 */
function IconChip({ src, alt, size }: { src: string; alt: string; size: number }) {
  return (
    <div
      className="rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0"
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="object-contain"
        style={{ width: size * 0.72, height: size * 0.72 }}
      />
    </div>
  )
}

function IconCard({
  icon,
  onReplace,
  onDelete,
}: {
  icon: CoinIcon
  onReplace: () => void
  onDelete: () => void
}) {
  return (
    <div className="group relative bg-[#0d0d0d] border border-white/10 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-white/25 transition-colors">
      <IconChip src={previewSrc(icon)} alt={icon.symbol} size={56} />

      <span className="text-gray-100 text-sm font-medium truncate max-w-full">
        {icon.symbol}
      </span>
      <span className="text-gray-600 text-[11px]">
        {formatSize(icon.size)} · {formatDate(icon.updatedAt)}
      </span>

      {/* With a mouse the actions stay out of the way until the card is
          hovered, so a wall of 550 icons reads as artwork rather than as a wall
          of buttons; keyboard focus reveals them too. A touch screen has no
          hover, so there they are always visible. */}
      <div className="flex gap-1.5 hover-reveal">
        <button
          onClick={onReplace}
          className="px-2.5 py-1.5 rounded text-xs bg-[#111111] border border-white/10 text-gray-200 hover:border-[#a3e635]"
        >
          Replace
        </button>
        <button
          onClick={onDelete}
          className="px-2.5 py-1.5 rounded text-xs bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

/**
 * File picker with a live preview of the chosen SVG, rendered on the same light
 * chip the app uses. Uploading a logo that turns out to be invisible on the
 * app's background is the failure this is here to prevent.
 */
function IconPicker({
  file,
  onPick,
}: {
  file: File | null
  onPick: (f: File | null) => void
}) {
  // Object URLs have to be released, and the effect below is the only place
  // that knows when the chosen file is replaced.
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  return (
    <div className="flex items-center gap-3">
      {objectUrl ? (
        <IconChip src={objectUrl} alt="" size={56} />
      ) : (
        <div className="w-14 h-14 rounded-full border border-dashed border-white/15 shrink-0" />
      )}

      <div className="flex flex-col gap-1 min-w-0">
        <input
          type="file"
          accept=".svg,image/svg+xml"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          className="text-sm text-gray-400 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-[#a3e635] file:text-black file:font-medium file:cursor-pointer"
        />
        <span className="text-gray-500 text-xs truncate">
          {file ? `${file.name} · ${formatSize(file.size)}` : "SVG only"}
        </span>
      </div>
    </div>
  )
}

/** The exact URL the app will request, so the operator can sanity-check it. */
function KeyHint({ market, symbol }: { market: string; symbol: string }) {
  return (
    <p className="text-gray-600 text-xs break-all">
      Stored as{" "}
      <span className="text-gray-400 font-mono">
        {market}/{symbol || "SYMBOL"}.svg
      </span>
    </p>
  )
}

/* ──────────────────────────────── Add ──────────────────────────── */

function AddIconModal({ market, onClose }: { market: Market; onClose: () => void }) {
  const uploadIcon = useUploadCoinIcon()
  const [symbol, setSymbol] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [targetMarket, setTargetMarket] = useState<Market>(market)

  // A 409 means the symbol already has artwork. Rather than making the operator
  // cancel and hunt for it in the grid, the same dialog offers the overwrite.
  const conflict =
    uploadIcon.error instanceof ApiHttpError && uploadIcon.error.status === 409

  const cleanSymbol = symbol.trim().toUpperCase()

  const submit = (overwrite = false) => {
    if (!file || !cleanSymbol) return
    uploadIcon.mutate(
      { file, symbol: cleanSymbol, market: targetMarket, overwrite },
      { onSuccess: onClose }
    )
  }

  return (
    <Modal title="Add coin icon" onClose={uploadIcon.isPending ? () => {} : onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Market">
          <div className="grid grid-cols-3 gap-2">
            {MARKETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTargetMarket(m)}
                className={`chip px-2 ${targetMarket === m ? "chip-active" : ""}`}
              >
                {MARKET_LABELS[m]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Symbol">
          <Input
            value={symbol}
            onChange={(v) => setSymbol(v.toUpperCase())}
            placeholder="BTC"
          />
        </Field>

        <KeyHint market={targetMarket} symbol={cleanSymbol} />

        <Field label="Icon file">
          <IconPicker file={file} onPick={setFile} />
        </Field>

        {uploadIcon.isError && (
          <p className="text-red-300 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {(uploadIcon.error as Error)?.message || "Upload failed"}
          </p>
        )}
      </div>

      <ModalActions>
        <button
          onClick={onClose}
          disabled={uploadIcon.isPending}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={() => submit(conflict)}
          disabled={!file || !cleanSymbol || uploadIcon.isPending}
          className={`px-4 py-2 rounded-lg font-medium disabled:opacity-50 ${
            conflict
              ? "bg-amber-400 text-black hover:bg-amber-300"
              : "bg-[#a3e635] text-black hover:bg-[#bef264]"
          }`}
        >
          {uploadIcon.isPending
            ? "Uploading…"
            : conflict
            ? `Overwrite ${cleanSymbol}`
            : "Upload"}
        </button>
      </ModalActions>
    </Modal>
  )
}

/* ────────────────────────────── Replace ────────────────────────── */

function ReplaceIconModal({
  icon,
  onClose,
}: {
  icon: CoinIcon
  onClose: () => void
}) {
  const replaceIcon = useReplaceCoinIcon()
  const [file, setFile] = useState<File | null>(null)

  const submit = () => {
    if (!file) return
    replaceIcon.mutate(
      { file, symbol: icon.symbol, market: icon.market },
      { onSuccess: onClose }
    )
  }

  return (
    <Modal
      title={`Replace ${icon.symbol} icon`}
      onClose={replaceIcon.isPending ? () => {} : onClose}
    >
      <div className="flex flex-col gap-4">
        <Field label="Current">
          <div className="flex items-center gap-3">
            <IconChip src={previewSrc(icon)} alt={icon.symbol} size={56} />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-gray-200 text-sm">{icon.symbol}</span>
              <span className="text-gray-500 text-xs">
                {formatSize(icon.size)} · updated {formatDate(icon.updatedAt)}
              </span>
            </div>
          </div>
        </Field>

        <Field label="New icon">
          <IconPicker file={file} onPick={setFile} />
        </Field>

        <KeyHint market={icon.market} symbol={icon.symbol} />

        <p className="text-amber-400/80 text-xs">
          The old artwork is overwritten and cannot be recovered. Devices that
          already loaded it may keep showing the old logo for a few minutes.
        </p>

        {replaceIcon.isError && (
          <p className="text-red-300 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {(replaceIcon.error as Error)?.message || "Update failed"}
          </p>
        )}
      </div>

      <ModalActions>
        <button
          onClick={onClose}
          disabled={replaceIcon.isPending}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!file || replaceIcon.isPending}
          className="btn btn-primary"
        >
          {replaceIcon.isPending ? "Saving…" : "Replace"}
        </button>
      </ModalActions>
    </Modal>
  )
}
