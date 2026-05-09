import { msalInstance, apiScope } from "./msal";

// Single fetch wrapper for the whole app. Acquires a token via MSAL silently
// (with interactive fallback) and attaches it as Authorization: Bearer on every
// request. Errors raise on non-2xx so TanStack Query's error path can fire.
export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  let token = "";
  if (account) {
    try {
      const r = await msalInstance.acquireTokenSilent({ scopes: [apiScope], account });
      token = r.accessToken;
    } catch {
      const r = await msalInstance.acquireTokenPopup({ scopes: [apiScope] });
      token = r.accessToken;
    }
  }

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch { /* not JSON */ }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("application/json") ? await res.json() : (await res.text() as unknown as T);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
