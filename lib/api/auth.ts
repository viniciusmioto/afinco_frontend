import { apiRequest } from "@/lib/api/client";
import type { AuthenticatedUser, LoginCredentials } from "@/lib/types/auth";

export function login(credentials: LoginCredentials): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function getCurrentUser(signal?: AbortSignal): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>("/auth/me", { signal });
}

export function logout(): Promise<void> {
  return apiRequest<void>("/auth/logout", { method: "POST" });
}
