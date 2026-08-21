const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const LOGIN_PATH = "/login";

/**
 * `/auth/*` 401s are expected and must NOT bounce the browser:
 * - `/auth/me` 401s on every page load for a signed-out visitor, including a
 *   guest opening their invitation link, because AuthProvider wraps the whole
 *   app. Redirecting there would break the public invitation page outright.
 * - `/auth/login` 401s on wrong credentials, where the page shows the error.
 *
 * Any other 401 means an admin's session expired mid-use. Without this, every
 * later call failed into a React Query error state that pages render the same
 * as "no data yet" — a silently empty admin screen.
 */
function shouldRedirectToLogin(path: string) {
  if (path.startsWith("/auth/")) return false;
  if (typeof window === "undefined") return false;
  return window.location.pathname !== LOGIN_PATH;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    if (res.status === 401 && shouldRedirectToLogin(path)) {
      // A full navigation rather than a router push: it also drops the cached
      // auth state and every React Query cache entry filled under the old
      // session, so the next login starts clean.
      window.location.href = LOGIN_PATH;
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export const googleLoginUrl = `${API_URL}/auth/google`;
