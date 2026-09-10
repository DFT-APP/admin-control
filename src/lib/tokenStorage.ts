/**
 * Where the session token lives, decided by "Remember me" at sign-in.
 *
 * Remembered: localStorage, so the session survives closing the browser.
 * Not remembered: sessionStorage, so it ends with the browser session — the
 * right default on a shared machine. Readers check both, which means nothing
 * outside this file needs to know which one was chosen.
 */
const TOKEN_KEY = "token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string, remember: boolean) {
  // Clear both first, so switching the choice never leaves a stale copy behind.
  clearToken();
  (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}
