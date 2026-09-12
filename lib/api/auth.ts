import { apiRequest } from "@/lib/api/client";
import type { AuthenticatedUser, LoginCredentials, SessionState } from "@/lib/types/auth";

export function login(credentials: LoginCredentials): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

/** Public session probe: answers 200 either way, so a stale cookie never surfaces as a 401. */
export function getSession(signal?: AbortSignal): Promise<SessionState> {
  return apiRequest<SessionState>("/auth/session", { signal });
}

export function logout(): Promise<void> {
  return apiRequest<void>("/auth/logout", { method: "POST" });
}
