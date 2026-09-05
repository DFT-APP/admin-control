import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { ApiResponse } from "@/lib/api-types";

/**
 * Notifications for the signed-in admin account. The endpoint is scoped to the
 * caller's own user_id — there is no platform-wide feed — so this drives the
 * dashboard activity rail with whatever this operator has actually received.
 *
 * Rows come straight off the model, hence the snake_case.
 */
export type Notification = {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string | null;
  image: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
};

type NotificationsPayload = {
  notifications: Notification[];
  unreadCount: number;
  pagination: { page: number; limit: number; total: number; hasNextPage: boolean };
};

export function useNotifications(limit = 8) {
  return useQuery({
    queryKey: ["notifications", limit],
    queryFn: () =>
      apiClient<ApiResponse<NotificationsPayload>>(
        `/api/notifications?page=1&limit=${limit}`
      ).then((r) => r.data),
    // The rail is glanceable, not a live console — a minute of staleness is fine.
    staleTime: 60_000,
  });
}
