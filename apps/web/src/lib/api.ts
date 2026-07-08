import { clearSession, getAccessToken } from "@/features/auth/session";

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const token = getAccessToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    clearSession();
    const currentPath = `${window.location.pathname}${window.location.search}`;
    const redirectTo = currentPath.startsWith("/auth") ? "/auth/login" : `/auth/login?expired=1`;
    window.location.assign(redirectTo);
  }

  return response;
}
