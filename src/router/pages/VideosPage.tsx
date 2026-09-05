import { useState } from "react"
import { DataTable } from "@/components/table/DataTable"
import {
  useVideos,
  useUploadVideo,
  useUpdateVideo,
  useDeleteVideo,
  useSetVideoPublished,
  VIDEO_TYPE,
  type AdminVideo,
} from "@/hooks/useVideos"
import { Modal, ConfirmModal, Field, Toggle, ModalActions } from "@/components/ui/modal"

const TYPE_FILTERS = [
  { label: "All", value: "" as const },
  { label: "Bullish", value: VIDEO_TYPE.BULLISH },
  { label: "Bearish", value: VIDEO_TYPE.BEARISH },
]

const STATUS_FILTERS = [
  { label: "All", value: "" as const },
  { label: "Published", value: true },
  { label: "Hidden", value: false },
]

/** Stored names carry their S3 folder prefix; only the file name is useful here. */
const fileName = (name: string) => name.split("/").pop() ?? name

function TypeBadge({ type }: { type: number }) {
  const bullish = type === VIDEO_TYPE.BULLISH
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
        bullish ? "text-[#a3e635] bg-[#a3e635]/10" : "text-red-400 bg-red-400/10"
      }`}
    >
      {bullish ? "Bullish" : "Bearish"}
    </span>
  )
}

function Poster({ video, className }: { video: AdminVideo; className: string }) {
  return video.thumbUrl ? (
    <img
      src={video.thumbUrl}
      alt=""
      loading="lazy"
      className={`${className} object-cover rounded-md border border-white/10 bg-black`}
    />
  ) : (
    <div
      className={`${className} rounded-md border border-white/10 bg-black/40 flex items-center justify-center text-gray-600 text-xs`}
    >
      —
    </div>
  )
}

const columns = [
  {
    key: "thumbUrl",
    label: "Preview",
    // Shown beside the file name on a card instead.
    hideOnCard: true,
    render: (v: AdminVideo) =>
      <Poster video={v} className="w-12 h-20" />,
  },
  {
    key: "videoId",
    label: "ID",
    sortable: true,
    render: (v: AdminVideo) => <span className="text-gray-500">#{v.videoId}</span>,
  },
  {
    key: "name",
    label: "File",
    primary: true,
    render: (v: AdminVideo) => (
      <div className="flex items-center gap-3 min-w-0">
        <Poster video={v} className="w-11 h-16 flex-shrink-0 lg:hidden" />
        <div className="flex flex-col min-w-0 lg:max-w-xs">
          <span className="text-gray-100 font-medium truncate">{fileName(v.name)}</span>
          <span className="text-gray-500 text-xs truncate">{v.name}</span>
        </div>
      </div>
    ),
  },
  {
    key: "type",
    label: "Type",
    sortable: true,
    render: (v: AdminVideo) => <TypeBadge type={v.type} />,
  },
  {
    key: "isPublished",
    label: "Status",
    sortable: true,
    render: (v: AdminVideo) => (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          v.isPublished ? "text-[#a3e635] bg-[#a3e635]/10" : "text-gray-400 bg-white/5"
        }`}
      >
        {v.isPublished ? "Published" : "Hidden"}
      </span>
    ),
  },
]

export default function VideosPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [type, setType] = useState<number | "">("")
  const [published, setPublished] = useState<boolean | "">("")
  const [uploading, setUploading] = useState(false)
  const [previewing, setPreviewing] = useState<AdminVideo | null>(null)
  const [editing, setEditing] = useState<AdminVideo | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AdminVideo | null>(null)

  const { data, isLoading, isError, error } = useVideos({ page, type, search, published })
  const deleteVideo = useDeleteVideo()
  const setVideoPublished = useSetVideoPublished()

  const videos = data?.videos ?? []

  return (
    <div className="page">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
        <h1 className="page-title">Videos</h1>
        <button
          onClick={() => setUploading(true)}
          className="btn btn-primary w-full xs:w-auto"
        >
          Upload video
        </button>
      </div>

      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm mb-4">
          {(error as Error)?.message || "Failed to load videos"}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 mb-4">
        <FilterGroup label="Type">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => {
                setType(f.value)
                setPage(1)
              }}
              className={`chip flex-1 sm:flex-none ${type === f.value ? "chip-active" : ""}`}
            >
              {f.label}
            </button>
          ))}
        </FilterGroup>

        <span className="hidden sm:block w-px h-6 bg-white/10 mx-1" />

        <FilterGroup label="Status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => {
                setPublished(f.value)
                setPage(1)
              }}
              className={`chip flex-1 sm:flex-none ${published === f.value ? "chip-active" : ""}`}
            >
              {f.label}
            </button>
          ))}
        </FilterGroup>
      </div>

      <div className="w-full">
        <DataTable
          data={videos}
          columns={columns}
          loading={isLoading}
          emptyMessage="No videos found"
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
          actions={(v: AdminVideo) => (
            <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:justify-end">
              <button
                onClick={() => setPreviewing(v)}
                className="btn btn-sm btn-secondary hover:border-[#a3e635]"
              >
                Play
              </button>
              <button
                onClick={() =>
                  setVideoPublished.mutate({
                    videoId: v.videoId,
                    isPublished: !v.isPublished,
                  })
                }
                disabled={
                  setVideoPublished.isPending &&
                  setVideoPublished.variables?.videoId === v.videoId
                }
                className={`btn btn-sm ${
                  v.isPublished
                    ? "btn-secondary hover:border-amber-400"
                    : "btn-accent-soft"
                }`}
              >
                {v.isPublished ? "Hide" : "Publish"}
              </button>
              <button
                onClick={() => setEditing(v)}
                className="btn btn-sm btn-secondary hover:border-[#a3e635]"
              >
                Edit
              </button>
              <button
                onClick={() => setConfirmDelete(v)}
                className="btn btn-sm btn-danger"
              >
                Delete
              </button>
            </div>
          )}
        />
      </div>

      {uploading && <UploadVideoModal onClose={() => setUploading(false)} />}

      {editing && <EditVideoModal video={editing} onClose={() => setEditing(null)} />}

      {previewing && (
        <Modal title={fileName(previewing.name)} onClose={() => setPreviewing(null)}>
          {previewing.videoUrl ? (
            <video
              src={previewing.videoUrl}
              poster={previewing.thumbUrl ?? undefined}
              controls
              autoPlay
              className="w-full max-h-[55dvh] rounded-lg bg-black"
            />
          ) : (
            <p className="text-gray-400 text-sm">This video has no playable URL.</p>
          )}
          <ModalActions>
            <button
              onClick={() => setPreviewing(null)}
              className="btn btn-secondary"
            >
              Close
            </button>
          </ModalActions>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete video"
          message={`Delete "${fileName(confirmDelete.name)}"? The video and its thumbnail are removed from storage. This cannot be undone.`}
          confirmLabel="Delete"
          loading={deleteVideo.isPending}
          onConfirm={() =>
            deleteVideo.mutate(confirmDelete.videoId, {
              onSuccess: () => setConfirmDelete(null),
            })
          }
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

/* ─────────────────────────── Shared pieces ─────────────────────── */

/**
 * Both filter rows start with a chip called "All". Side by side on a phone
 * that is unreadable, so below sm each group gets its own labelled row; from
 * sm up the label collapses into a screen-reader-only name on the group.
 */
function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2 min-w-0">
      <span className="sm:hidden text-gray-500 text-xs w-12 flex-shrink-0">{label}</span>
      {children}
    </div>
  )
}

function TypePicker({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex gap-2">
      {[
        { label: "Bullish", value: VIDEO_TYPE.BULLISH },
        { label: "Bearish", value: VIDEO_TYPE.BEARISH },
      ].map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            value === o.value
              ? "bg-[#1a2a1a] text-[#a3e635] border-[#a3e635]/40"
              : "bg-[#0d0d0d] text-gray-400 border-white/10 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function FilePicker({
  file,
  onPick,
}: {
  file: File | null
  onPick: (f: File | null) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        accept="video/*"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        className="text-sm text-gray-400 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-[#a3e635] file:text-black file:font-medium file:cursor-pointer"
      />
      {file && (
        <span className="text-gray-500 text-xs">
          {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
        </span>
      )}
    </div>
  )
}

/**
 * The bar tracks the browser upload only. Once every byte is sent the server
 * still has to transcode and push to S3, so the label switches to "Processing".
 */
function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-[#a3e635] transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-gray-400 text-xs">
        {percent < 100 ? `Uploading… ${percent}%` : "Processing video…"}
      </span>
    </div>
  )
}

/* ─────────────────────────────── Upload ────────────────────────── */

function UploadVideoModal({ onClose }: { onClose: () => void }) {
  const uploadVideo = useUploadVideo()
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState<number>(VIDEO_TYPE.BULLISH)
  const [isPublished, setIsPublished] = useState(true)
  const [percent, setPercent] = useState(0)

  const submit = () => {
    if (!file) return
    setPercent(0)
    uploadVideo.mutate(
      { file, type, isPublished, onProgress: setPercent },
      { onSuccess: onClose }
    )
  }

  return (
    <Modal title="Upload video" onClose={uploadVideo.isPending ? () => {} : onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Type">
          <TypePicker value={type} onChange={setType} />
        </Field>
        <Field label="Video file">
          <FilePicker file={file} onPick={setFile} />
        </Field>
        <Toggle
          label="Publish immediately"
          checked={isPublished}
          onChange={setIsPublished}
        />
        {!isPublished && (
          <p className="text-gray-500 text-xs -mt-2">
            The video is uploaded but stays out of the app until you publish it.
          </p>
        )}
        {uploadVideo.isPending && <ProgressBar percent={percent} />}

        {/* The dialog stays open on failure, so it has to say why — a toast
            fired minutes into a transcode is easy to miss. */}
        {uploadVideo.isError && (
          <p className="text-red-300 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {(uploadVideo.error as Error)?.message || "Upload failed"}
          </p>
        )}
      </div>

      <ModalActions>
        <button
          onClick={onClose}
          disabled={uploadVideo.isPending}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!file || uploadVideo.isPending}
          className="btn btn-primary"
        >
          {uploadVideo.isPending ? "Uploading…" : "Upload"}
        </button>
      </ModalActions>
    </Modal>
  )
}

/* ──────────────────────────────── Edit ─────────────────────────── */

function EditVideoModal({
  video,
  onClose,
}: {
  video: AdminVideo
  onClose: () => void
}) {
  const updateVideo = useUpdateVideo()
  const [type, setType] = useState<number>(video.type)
  const [isPublished, setIsPublished] = useState(video.isPublished)
  const [file, setFile] = useState<File | null>(null)
  const [percent, setPercent] = useState(0)

  const unchanged = type === video.type && isPublished === video.isPublished && !file

  const submit = () => {
    setPercent(0)
    updateVideo.mutate(
      { videoId: video.videoId, type, isPublished, file, onProgress: setPercent },
      { onSuccess: onClose }
    )
  }

  return (
    <Modal
      title={`Edit video #${video.videoId}`}
      onClose={updateVideo.isPending ? () => {} : onClose}
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-3 items-start">
          {video.thumbUrl && (
            <img
              src={video.thumbUrl}
              alt=""
              className="w-16 h-28 object-cover rounded-md border border-white/10 bg-black"
            />
          )}
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-gray-200 text-sm truncate">{fileName(video.name)}</span>
            <span className="text-gray-500 text-xs break-all">{video.name}</span>
          </div>
        </div>

        <Field label="Type">
          <TypePicker value={type} onChange={setType} />
        </Field>

        <Toggle
          label={isPublished ? "Published" : "Hidden"}
          checked={isPublished}
          onChange={setIsPublished}
        />

        <Field label="Replace video (optional)">
          <FilePicker file={file} onPick={setFile} />
        </Field>

        {file && (
          <p className="text-amber-400/80 text-xs">
            The current video and thumbnail are deleted from storage once the new file is processed.
          </p>
        )}

        {updateVideo.isPending && <ProgressBar percent={percent} />}

        {updateVideo.isError && (
          <p className="text-red-300 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {(updateVideo.error as Error)?.message || "Update failed"}
          </p>
        )}
      </div>

      <ModalActions>
        <button
          onClick={onClose}
          disabled={updateVideo.isPending}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={unchanged || updateVideo.isPending}
          className="btn btn-primary"
        >
          {updateVideo.isPending ? "Saving…" : "Save"}
        </button>
      </ModalActions>
    </Modal>
  )
}
