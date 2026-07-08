import { clearSession } from "@/features/auth/session";

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);

  if (response.status === 401) {
    clearSession();
    const currentPath = `${window.location.pathname}${window.location.search}`;
    const redirectTo = currentPath.startsWith("/auth") ? "/auth/login" : `/auth/login?expired=1`;
    window.location.assign(redirectTo);
  }

  return response;
}
