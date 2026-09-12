"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSession } from "@/lib/api/auth";
import type { AuthenticatedUser } from "@/lib/types/auth";

const AuthContext = createContext<AuthenticatedUser | null>(null);

export function useAuthenticatedUser(): AuthenticatedUser {
  const user = useContext(AuthContext);
  if (!user) throw new Error("useAuthenticatedUser must be used inside AuthGate");
  return user;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    getSession(controller.signal)
      .then((session) => {
        if (session.authenticated && session.user) {
          setUser(session.user);
          return;
        }
        const returnTo = `${window.location.pathname}${window.location.search}`;
        window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Unable to verify your session");
      });
    return () => controller.abort();
  }, [attempt]);

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-950">Afinco is unavailable</h1>
          <p className="mt-2 text-sm text-slate-600" role="alert">{error}</p>
          <button
            className="focus-ring mt-5 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white"
            onClick={() => setAttempt((value) => value + 1)}
            type="button"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main aria-busy="true" aria-label="Verifying your session" className="grid min-h-screen place-items-center bg-slate-50">
        <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
      </main>
    );
  }

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}
