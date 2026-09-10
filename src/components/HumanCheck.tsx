import { useEffect, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY as SITE_KEY } from "@/lib/humanCheck";

/**
 * "I'm a human", via Cloudflare Turnstile.
 *
 * Shown only when VITE_TURNSTILE_SITE_KEY is set. The widget hands back a
 * one-time token that rides along with the log in request; the API checks it
 * with Cloudflare (for origins listed in its TURNSTILE_ORIGINS), so nothing
 * decided here is trusted on its own.
 *
 * The script is loaded on first use rather than from index.html, so the rest
 * of the panel never talks to Cloudflare. Production's CSP has to allow
 * https://challenges.cloudflare.com as a script and frame source.
 */

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptLoading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  if (!scriptLoading) {
    scriptLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () =>
        window.turnstile
          ? resolve(window.turnstile)
          : reject(new Error("Turnstile did not initialise"));
      script.onerror = () => {
        // Let a later mount try again — a blocked request is often transient.
        scriptLoading = null;
        script.remove();
        reject(new Error("Turnstile did not load"));
      };
      document.head.appendChild(script);
    });
  }

  return scriptLoading;
}

type Props = {
  /** A fresh token, or null once the current one expires or is reset. */
  onToken: (token: string | null) => void;
  /**
   * Bump to ask for a new check. A token is spent by the request it rides on,
   * so a failed log in needs a fresh one before the next attempt.
   */
  resetKey: number;
  onError: (message: string) => void;
};

export function HumanCheck({ onToken, resetKey, onError }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [shown, setShown] = useState(false);

  // The widget is rendered once, but the parent's callbacks change identity on
  // every render. Reading them through refs keeps the widget pointed at the
  // current ones without re-rendering it.
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    loadTurnstile()
      .then((api) => {
        if (cancelled || !container.current) return;
        widgetId.current = api.render(container.current, {
          sitekey: SITE_KEY,
          theme: "dark",
          // Fills the card like the fields do, instead of a fixed 300px box
          // floating in the middle of it.
          size: "flexible",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => {
            onTokenRef.current(null);
            onErrorRef.current(
              "The human check hit a problem. Reload the page and try again."
            );
          },
        });
        setShown(true);
      })
      .catch(() => {
        if (cancelled) return;
        onErrorRef.current(
          "The human check could not load. Check your connection or pause content blockers, then reload."
        );
      });

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
      }
      widgetId.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey === 0 || !widgetId.current || !window.turnstile) return;
    window.turnstile.reset(widgetId.current);
    onTokenRef.current(null);
  }, [resetKey]);

  if (!SITE_KEY) return null;

  // Full width to line up with the fields, its height reserved and faded in
  // once rendered, so nothing below jumps or pops when the script arrives.
  // Its square corners are Cloudflare's: the widget is drawn where this page's
  // CSS cannot reach.
  return (
    <div
      ref={container}
      className={`mb-6 min-h-[65px] w-full transition-opacity duration-300 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
