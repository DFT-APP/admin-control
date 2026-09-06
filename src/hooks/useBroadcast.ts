import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import type { ApiResponse, Paginated } from "@/lib/api-types";

export type Audience = "all" | "selected";

export type AudienceCount = {
  total: number;
  withPush: number;
  withEmail: number;
};

export type SentBroadcast = {
  id: number;
  title: string;
  body: string;
  audience: Audience;
  recipientUserIds: number[] | null;
  sendPush: boolean;
  sendEmail: boolean;
  recipientCount: number;
  pushSent: number;
  emailSent: number;
  createdAt: string;
  senderName: string | null;
};

/** Mirrors the server's own limits so the composer can stop you before the API does. */
export const TITLE_MAX = 140;
export const BODY_MAX = 4000;
export const MAX_SELECTED = 500;

/**
 * How many people the current audience actually reaches. Kept live as the
 * selection changes so the confirmation step names a real number rather than
 * "everyone".
 */
export function useAudienceCount(audience: Audience, userIds: number[]) {
  const key = audience === "all" ? "all" : userIds.join(",");
  return useQuery({
    queryKey: ["admin", "broadcast", "audience", audience, key],
    queryFn: () => {
      const params = new URLSearchParams({ audience });
      if (audience === "selected") params.set("userIds", userIds.join(","));
      return apiClient<ApiResponse<AudienceCount>>(
        `/api/admin/broadcast/audience?${params.toString()}`
      ).then((r) => r.data);
    },
    // Nothing to resolve until at least one person is picked.
    enabled: audience === "all" || userIds.length > 0,
  });
}

export function useBroadcastHistory(page: number) {
  return useQuery({
    queryKey: ["admin", "broadcast", "history", page],
    queryFn: () =>
      apiClient<ApiResponse<Paginated<{ broadcasts: SentBroadcast[] }>>>(
        `/api/admin/broadcast?page=${page}&limit=20`
      ).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
}

export type SendResult = {
  id: number;
  recipientCount: number;
  pushSent: number;
  emailSent: number;
  reachableByPush: number;
  reachableByEmail: number;
};

export function useSendBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      title: string;
      body: string;
      audience: Audience;
      userIds?: number[];
      sendPush: boolean;
      sendEmail: boolean;
    }) =>
      apiClient<ApiResponse<SendResult>>("/api/admin/broadcast", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          // The server refuses an "everyone" send without this, so a mistyped
          // request can never reach the whole user base.
          ...(payload.audience === "all" ? { confirm: "ALL" } : {}),
        }),
      }).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin", "broadcast"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      const parts = [
        data.pushSent > 0 && `${data.pushSent} push`,
        data.emailSent > 0 && `${data.emailSent} email`,
      ].filter(Boolean);
      toast.success(
        parts.length
          ? `Sent to ${data.recipientCount} — ${parts.join(", ")} delivered`
          : `Recorded for ${data.recipientCount}, but nothing could be delivered`
      );
    },
    onError: (e: Error) => toast.error(e.message || "The broadcast was not sent"),
  });
}
