export function getAccessToken() {
  return localStorage.getItem("qualis.accessToken") ?? sessionStorage.getItem("qualis.accessToken");
}

export function hasSession() {
  return Boolean(getAccessToken());
}

export type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

export function getSessionUser(): SessionUser | null {
  const rawUser = localStorage.getItem("qualis.user") ?? sessionStorage.getItem("qualis.user");

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem("qualis.accessToken");
    storage.removeItem("qualis.refreshToken");
    storage.removeItem("qualis.user");
  }
}
