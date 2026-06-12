/**
 * API klijent za license-server admin — HTTP Basic auth.
 * Kredencijali (base64) se čuvaju u localStorage nakon prijave.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const AUTH_KEY = "ls_admin_auth";

export interface License {
  id: number;
  license_key: string;
  client_name: string;
  client_email?: string | null;
  hardware_id?: string | null;
  status: "active" | "suspended" | "expired" | "revoked";
  expires_at?: string | null;
  issued_at: string;
  features: string[];
  notes?: string | null;
  last_validated_at?: string | null;
  last_seen_at?: string | null;
  validation_count: number;
  panconnect_version?: string | null;
  created_at: string;
}

export interface Stats {
  total_licenses: number;
  active_licenses: number;
  suspended_licenses: number;
  expired_licenses: number;
  validations_today: number;
  validations_this_month: number;
  active_last_24h: number;
}

export interface ValidationLogEntry {
  id: number;
  license_key: string;
  hardware_id?: string | null;
  ip_address?: string | null;
  panconnect_version?: string | null;
  status: string;
  reason?: string | null;
  token_issued: boolean;
  timestamp: string;
}

export function getAuth(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_KEY);
}

export function storeAuth(username: string, password: string) {
  localStorage.setItem(AUTH_KEY, btoa(`${username}:${password}`));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const auth = getAuth();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: `Basic ${auth}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") window.location.reload();
    throw new ApiError(401, "Sesija istekla");
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Probna prijava — validira kredencijale protiv /stats endpointa. */
export async function tryLogin(username: string, password: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/admin/stats`, {
    headers: { Authorization: `Basic ${btoa(`${username}:${password}`)}` },
  });
  if (res.status === 401) throw new ApiError(401, "Pogrešni kredencijali");
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }
  storeAuth(username, password);
}

export function formatDate(iso?: string | null, withTime = false): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("sr-Latn-BA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
  } catch {
    return iso;
  }
}
