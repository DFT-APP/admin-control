import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiUpload } from "@/lib/apiClient";

/* ───────────────────────────── Types ───────────────────────────── */

type ApiResponse<T> = {
  status: boolean;
  code: number;
  message: string;
  data: T;
};

/** 1 = bullish, 2 = bearish — the values the backend stores on Videos.type. */
export const VIDEO_TYPE = { BULLISH: 1, BEARISH: 2 } as const;

export type AdminVideo = {
  videoId: number;
  name: string;
  thumbName: string | null;
  type: number;
  typeLabel: string;
  /** Hidden videos keep their files but are dropped from the app feed. */
  isPublished: boolean;
  videoUrl: string | null;
  thumbUrl: string | null;
};

export type VideoFilters = {
  page: number;
  type?: number | "";
  search?: string;
  published?: boolean | "";
};

type Paginated<T> = {
  total: number;
  page: number;
  totalPages: number;
} & T;

/* ───────────────────────────── Queries ─────────────────────────── */

export function useVideos(filters: VideoFilters) {
  const { page, type, search, published } = filters;
  return useQuery({
    queryKey: ["admin", "videos", page, type ?? "", search ?? "", published ?? ""],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (type) params.set("type", String(type));
      if (search) params.set("search", search);
      if (typeof published === "boolean") params.set("published", String(published));
      return apiClient<ApiResponse<Paginated<{ videos: AdminVideo[] }>>>(
        `/api/admin/videos?${params.toString()}`
      ).then((r) => r.data);
    },
    placeholderData: (prev) => prev,
  });
}

/* ──────────────────────────── Mutations ────────────────────────── */

export function useUploadVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      type,
      isPublished = true,
      onProgress,
    }: {
      file: File;
      type: number;
      isPublished?: boolean;
      onProgress?: (percent: number) => void;
    }) => {
      const body = new FormData();
      body.append("video", file);
      body.append("type", String(type));
      body.append("isPublished", String(isPublished));
      return apiUpload<ApiResponse<AdminVideo>>("/api/admin/videos", {
        method: "POST",
        body,
        onProgress,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "videos"] });
      toast.success("Video uploaded");
    },
    onError: (e: Error) => toast.error(e.message || "Upload failed"),
  });
}

export function useUpdateVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      videoId,
      type,
      isPublished,
      file,
      onProgress,
    }: {
      videoId: number;
      type: number;
      isPublished?: boolean;
      file?: File | null;
      onProgress?: (percent: number) => void;
    }) => {
      const body = new FormData();
      body.append("type", String(type));
      if (typeof isPublished === "boolean") body.append("isPublished", String(isPublished));
      if (file) body.append("video", file);
      return apiUpload<ApiResponse<AdminVideo>>(`/api/admin/videos/${videoId}`, {
        method: "PUT",
        body,
        onProgress,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "videos"] });
      toast.success("Video updated");
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });
}

/** One-click publish / hide, without touching the file or its type. */
export function useSetVideoPublished() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ videoId, isPublished }: { videoId: number; isPublished: boolean }) =>
      apiClient<ApiResponse<AdminVideo>>(`/api/admin/videos/${videoId}/publish`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "videos"] });
      toast.success(vars.isPublished ? "Video published" : "Video hidden");
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });
}

export function useDeleteVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (videoId: number) =>
      apiClient<ApiResponse<unknown>>(`/api/admin/videos/${videoId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "videos"] });
      toast.success("Video deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });
}
