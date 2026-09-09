// Client-side API helper. Adds the resolved auth user headers to every request.

import type { AuthUser } from "./auth";
import { getStoredAuthUser, getOrCreateLocalGuest } from "./auth";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getAuthHeaders(): Record<string, string> {
  let user: AuthUser | null = getStoredAuthUser();
  if (!user) user = getOrCreateLocalGuest();
  return {
    "x-user-id": user.id,
    "x-user-email": user.email,
    "x-user-name": user.name || "",
  };
}

export async function apiFetch<T>(
  input: string,
  init: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...((init.headers as Record<string, string>) || {}),
  };
  const res = await fetch(input, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => apiFetch<T>(url),
  post: <T>(url: string, body?: unknown) =>
    apiFetch<T>(url, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(url: string, body?: unknown) =>
    apiFetch<T>(url, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(url: string, body?: unknown) =>
    apiFetch<T>(url, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  del: <T>(url: string) => apiFetch<T>(url, { method: "DELETE" }),
};
