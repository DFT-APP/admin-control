import { apiClient } from "@/lib/apiClient";

/**
 * Sends a console-side failure to the server so it lands in the same list as
 * the API's own errors. Without this a frontend crash exists only in the
 * operator's browser console, where nobody is looking.
 *
 * Deliberately silent and never awaited by callers: reporting a failure must
 * not be able to cause one, and a failed report has nowhere left to go.
 */
export function reportError(
  message: string,
  options: { stack?: string; context?: Record<string, unknown> } = {}
) {
  // No token means no signed-in admin, and the endpoint is admin-only — the
  // login screen's own failures are not reportable, and that is fine.
  if (!localStorage.getItem("token")) return;

  apiClient("/api/admin/logs/client-error", {
    method: "POST",
    body: JSON.stringify({
      message: message.slice(0, 2000),
      stack: options.stack?.slice(0, 8000),
      path: window.location.pathname,
      context: {
        userAgent: navigator.userAgent,
        ...options.context,
      },
    }),
  }).catch(() => {
    // The server is the thing that is unreachable. Nothing to do.
  });
}

/**
 * Catches what React's error boundary cannot: throws from event handlers,
 * timers and promise chains. Installed once at startup.
 */
export function installGlobalErrorReporting() {
  window.addEventListener("error", (event) => {
    reportError(event.message || "Uncaught error", {
      stack: event.error?.stack,
      context: {
        source: `${event.filename}:${event.lineno}:${event.colno}`,
        kind: "uncaught",
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    reportError(
      reason instanceof Error ? reason.message : String(reason ?? "Unhandled rejection"),
      {
        stack: reason instanceof Error ? reason.stack : undefined,
        context: { kind: "unhandledrejection" },
      }
    );
  });
}
