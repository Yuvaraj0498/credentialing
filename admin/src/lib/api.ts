/**
 * REST client for the Spring Boot API.
 * - Access token lives in memory only; the refresh token is an httpOnly cookie set by the API.
 * - On 401 the client transparently refreshes once and retries.
 * - Platform admins send the selected tenant in the X-Org-Id header.
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;
  constructor(status: number, message: string, fieldErrors?: Record<string, string> | null) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors || {};
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;
let onAuthLost: (() => void) | null = null;

const ORG_KEY = "zc_selected_org";

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}
export function setOnAuthLost(fn: (() => void) | null) {
  onAuthLost = fn;
}

export function getSelectedOrgId(): string | null {
  try {
    return localStorage.getItem(ORG_KEY);
  } catch {
    return null;
  }
}
export function setSelectedOrgId(id: string | number | null) {
  try {
    if (id == null) localStorage.removeItem(ORG_KEY);
    else localStorage.setItem(ORG_KEY, String(id));
  } catch {
    /* storage unavailable */
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

export function buildUrl(path: string, query?: Query) {
  // API_URL may be relative ("/api" = the same site the page was opened from)
  const url = new URL(API_URL + (path.startsWith("/") ? path : "/" + path), typeof window === "undefined" ? "http://localhost" : window.location.origin);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

function headers(extra?: HeadersInit, json = true): Headers {
  const h = new Headers(extra);
  if (json && !h.has("Content-Type")) h.set("Content-Type", "application/json");
  if (accessToken) h.set("Authorization", "Bearer " + accessToken);
  const org = getSelectedOrgId();
  if (org) h.set("X-Org-Id", org);
  return h;
}

/** Calls POST /auth/refresh using the httpOnly cookie. Concurrent callers share one request. */
export async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(API_URL + "/auth/refresh", { method: "POST", credentials: "include" });
        if (!res.ok) return false;
        const data = await res.json();
        accessToken = data.accessToken;
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => (refreshPromise = null), 0);
      }
    })();
  }
  return refreshPromise;
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    return new ApiError(res.status, body.message || res.statusText, body.fieldErrors);
  } catch {
    return new ApiError(res.status, res.status >= 500 ? "Server error. Please try again." : res.statusText);
  }
}

async function request<T>(method: string, path: string, opts: { query?: Query; body?: unknown; form?: FormData; raw?: boolean } = {}, retried = false): Promise<T> {
  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method,
      headers: headers(undefined, !opts.form),
      body: opts.form ? opts.form : opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check that the API is running and try again.");
  }
  if (res.status === 401 && !retried && !path.startsWith("/auth/")) {
    if (await refreshAccessToken()) return request<T>(method, path, opts, true);
    onAuthLost?.();
  }
  if (!res.ok) throw await parseError(res);
  if (opts.raw) return res as unknown as T;
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, { query }),
  post: <T>(path: string, body?: unknown, query?: Query) => request<T>("POST", path, { body, query }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, { body }),
  delete: <T>(path: string) => request<T>("DELETE", path),
  upload: <T>(path: string, form: FormData, method = "POST") => request<T>(method, path, { form }),
  /** Downloads a file endpoint and triggers a browser save. */
  download: async (path: string, query?: Query, fallbackName = "download") => {
    const res = await request<Response>("GET", path, { query, raw: true });
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
    const name = match ? decodeURIComponent(match[1]) : fallbackName;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}
