import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import type { ApiResponse } from "@/lib/api-types";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export type SupportTicket = {
  id: number;
  userId: number;
  subject: string;
  category: string;
  message: string;
  status: TicketStatus;
  adminResponse: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { userId: number; userName: string | null; userEmail: string | null };
};

type TicketPage = {
  tickets: SupportTicket[];
  counts: Partial<Record<TicketStatus, number>>;
  pagination: { page: number; limit: number; total: number; hasNextPage: boolean };
};

/** Mirrors the enums the API validates against — see support.validation.js. */
export const TICKET_STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

export const TICKET_CATEGORIES = [
  "general",
  "trade",
  "payment",
  "account",
  "bug",
  "other",
] as const;

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const PAGE_SIZE = 25;

export function useTickets(filters: {
  page: number;
  status?: string;
  category?: string;
}) {
  const { page, status, category } = filters;
  return useQuery({
    queryKey: ["admin", "support", "tickets", page, status ?? "", category ?? ""],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      return apiClient<ApiResponse<TicketPage>>(
        `/api/admin/support/tickets?${params.toString()}`
      ).then((r) => r.data);
    },
    placeholderData: (prev) => prev,
  });
}

/**
 * The dashboard panel wants the newest few open tickets, which is the same
 * endpoint with a tighter filter — kept separate so the two caches do not
 * invalidate each other's pagination.
 */
export function useOpenTicketsPreview() {
  return useQuery({
    queryKey: ["admin", "support", "preview"],
    queryFn: () =>
      apiClient<ApiResponse<TicketPage>>(
        "/api/admin/support/tickets?page=1&limit=8&status=OPEN"
      ).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
}

export function useRespondToTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      response,
      status,
    }: {
      id: number;
      response?: string;
      status?: TicketStatus;
    }) =>
      apiClient<ApiResponse<SupportTicket>>(`/api/admin/support/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...(response !== undefined ? { response } : {}),
          ...(status !== undefined ? { status } : {}),
        }),
      }),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "support"] });
      toast.success(
        vars.response !== undefined
          ? `Reply sent to ${res.data.user?.userName ?? "the user"}`
          : `Ticket marked ${STATUS_LABELS[res.data.status]}`
      );
    },
    onError: (e: Error) => toast.error(e.message || "Could not update the ticket"),
  });
}
