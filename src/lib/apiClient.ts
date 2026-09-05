// Without this the base URL is the string "undefined", so every request goes to
// `<dev server>/undefined/api/...` and comes back a 404 — which the panel then
// reports as a generic "Something went wrong" instead of a config problem.
const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

if (!import.meta.env.VITE_API_URL) {
  console.warn(
    `VITE_API_URL is not set — falling back to ${API_URL}. ` +
      "Copy admin/.env.example to admin/.env and restart the dev server."
  );
}

type ApiError = {
  message?: string;
  code?: number;
};

/** Thrown for any non-2xx response, carrying the status so callers can branch. */
export class ApiHttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
  }
}

type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

/**
 * Registered once at startup. The API client cannot import the auth store
 * directly (the store imports the client), so the app injects the callback.
 */
export function setSessionExpiredHandler(handler: SessionExpiredHandler) {
  onSessionExpired = handler;
}

/**
 * A rejected token means the session is over — expired, revoked, or belonging to
 * an account that has lost admin rights. Every one of those should drop the
 * operator at the login screen instead of leaving a shell full of error toasts.
 */
function handleAuthFailure(status: number) {
  if (status === 401 || status === 403) onSessionExpired?.();
}

/**
 * A request that never settles leaves a page spinning with no way back. Every
 * call through here is a small JSON request against our own API; large uploads
 * go through apiUpload, whose lifetime is bounded by its progress events.
 */
const REQUEST_TIMEOUT_MS = 30_000;

export async function apiClient<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("token");

  // The browser has to set its own multipart boundary, so never force a
  // Content-Type when the body is a FormData.
  const isFormData = options.body instanceof FormData;

  // Honour a caller's own signal as well as the timeout — whichever aborts
  // first wins.
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout])
    : timeout;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${url}`, {
      ...options,
      signal,
      headers: {
        ...(!isFormData && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });
  } catch (e) {
    // Only genuine network failures and aborts land here — an HTTP error
    // status does not.
    if (timeout.aborted) {
      throw new ApiHttpError("The server took too long to respond", 0);
    }
    if ((e as Error)?.name === "AbortError") {
      throw new ApiHttpError("Request cancelled", 0);
    }
    throw new ApiHttpError("Cannot reach the server", 0);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    handleAuthFailure(res.status);
    throw new ApiHttpError(
      (data as ApiError)?.message || "Something went wrong",
      res.status
    );
  }

  return data as T;
}

/**
 * Multipart upload with progress. `fetch` cannot report upload progress, and
 * video files are large enough that a silent multi-minute wait is unusable, so
 * this path goes through XMLHttpRequest instead.
 *
 * @param onProgress receives 0–100 for the transfer itself. It reaches 100 once
 * the bytes are sent, while the server is still transcoding.
 */
export function apiUpload<T = unknown>(
  url: string,
  {
    method = "POST",
    body,
    onProgress,
  }: {
    method?: "POST" | "PUT";
    body: FormData;
    onProgress?: (percent: number) => void;
  }
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const token = localStorage.getItem("token");
    const xhr = new XMLHttpRequest();

    xhr.open(method, `${API_URL}${url}`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: unknown = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // Keep the empty object — the status check below still applies.
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T);
      } else {
        handleAuthFailure(xhr.status);
        reject(new ApiHttpError((data as ApiError)?.message || "Upload failed", xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiHttpError("Network error", 0));
    xhr.onabort = () => reject(new ApiHttpError("Upload cancelled", 0));

    xhr.send(body);
  });
}
