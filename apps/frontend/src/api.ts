const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const runtimeDefaultApiBaseUrl =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : "http://localhost:4000";

const API_BASE_URL =
  configuredApiBaseUrl && typeof window !== "undefined"
    ? configuredApiBaseUrl.replace("localhost", window.location.hostname)
    : configuredApiBaseUrl || runtimeDefaultApiBaseUrl;

export interface SessionUser {
  id: string;
  email: string;
  roleName: "admin" | "employee";
  mustResetPassword: boolean;
}

export interface Session {
  token: string;
  user: SessionUser;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `請求失敗：${response.status}`);
  }

  return response.json() as Promise<T>;
}

export { API_BASE_URL };
