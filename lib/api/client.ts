const API_BASE_URL = "/api/v1";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

interface ApiErrorPayload {
  message?: string;
  validationErrors?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly validationErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined;
}

async function csrfToken(): Promise<string> {
  const cookieToken = readCookie("XSRF-TOKEN");
  if (cookieToken) return cookieToken;

  const response = await fetch(`${API_BASE_URL}/auth/csrf`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new ApiError("Unable to initialize a secure session", response.status);
  }
  const payload = (await response.json()) as { token: string };
  return payload.token;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(typeof init?.body === "string" ? { "Content-Type": "application/json" } : {}),
  };
  new Headers(init?.headers).forEach((value, name) => {
    headers[name] = value;
  });
  if (!SAFE_METHODS.has(method)) {
    headers["X-XSRF-TOKEN"] = await csrfToken();
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ApiError(
      payload.message ?? `Request failed with status ${response.status}`,
      response.status,
      payload.validationErrors,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
