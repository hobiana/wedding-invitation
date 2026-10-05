import type { HouseholdAdminDto, ListHouseholdsQuery, Page } from "@invitation-app/shared";

const API_URL =import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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

/**
 * Le plafond de `limit` côté API. Le tableau de bord et le plan de table ont
 * besoin de tous les foyers : ils demandent ce plafond, et comparent `total` à
 * ce qu'ils ont reçu pour ne jamais tronquer en silence.
 */
export const HOUSEHOLDS_MAX_LIMIT = 500;

/**
 * Le chemin de `GET /admin/households` pour ces paramètres. Un paramètre absent
 * ne part pas, une recherche blanche non plus — l'API appliquerait ses défauts
 * de toute façon, et la clé de cache resterait polluée par des valeurs vides.
 */
export function householdsPath(query: ListHouseholdsQuery): string {
  const params = new URLSearchParams();
  const q = query.q?.trim();
  if (q) params.set("q", q);
  if (query.status) params.set("status", query.status);
  if (query.sort) params.set("sort", query.sort);
  if (query.order) params.set("order", query.order);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  const chaine = params.toString();
  return chaine ? `/admin/households?${chaine}` : "/admin/households";
}

/** Passe par `api.get` — c'est ce que les tests des écrans interceptent. */
export function listHouseholds(query: ListHouseholdsQuery): Promise<Page<HouseholdAdminDto>> {
  return api.get<Page<HouseholdAdminDto>>(householdsPath(query));
}
