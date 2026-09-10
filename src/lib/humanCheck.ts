/**
 * Configuration for the "I'm a human" check (Cloudflare Turnstile) on log in.
 *
 * Kept apart from the component so the page can ask whether the check is on
 * without importing it, and so the component file exports only a component —
 * which is what keeps fast refresh working on it.
 */
export const TURNSTILE_SITE_KEY: string | undefined =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || undefined;

export const humanCheckEnabled = Boolean(TURNSTILE_SITE_KEY);
