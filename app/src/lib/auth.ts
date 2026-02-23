import type { User } from "./api";

export function saveSession(token: string, user: User) {
  localStorage.setItem("zeroone_token", token);
  localStorage.setItem("zeroone_user", JSON.stringify(user));
}

export function getSession(): { token: string; user: User } | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("zeroone_token");
  const raw = localStorage.getItem("zeroone_user");
  if (!token || !raw) return null;
  try {
    return { token, user: JSON.parse(raw) as User };
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("zeroone_token");
  localStorage.removeItem("zeroone_user");
}
