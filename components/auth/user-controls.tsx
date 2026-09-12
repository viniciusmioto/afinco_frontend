"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { logout } from "@/lib/api/auth";
import { useAuthenticatedUser } from "@/components/auth/auth-gate";

export function UserControls({ compact = false }: { compact?: boolean }) {
  const user = useAuthenticatedUser();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  async function signOut() {
    setSubmitting(true);
    setError(false);
    try {
      await logout();
      window.location.assign("/login");
    } catch {
      setError(true);
      setSubmitting(false);
    }
  }

  if (compact) {
    return (
      <button
        aria-label="Sign out"
        className="focus-ring grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-600"
        disabled={submitting}
        onClick={signOut}
        title={user.email}
        type="button"
      >
        <LogOut aria-hidden="true" className="size-[18px]" />
      </button>
    );
  }

  return (
    <div className="border-t border-slate-800 pt-5">
      <p className="truncate px-3 text-xs text-slate-400" title={user.email}>{user.email}</p>
      <button
        className="focus-ring mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-60"
        disabled={submitting}
        onClick={signOut}
        type="button"
      >
        <LogOut aria-hidden="true" className="size-[18px]" />
        {submitting ? "Signing out…" : "Sign out"}
      </button>
      {error ? <p className="mt-2 px-3 text-xs text-red-300" role="alert">Sign out failed. Try again.</p> : null}
      <p className="mt-5 px-3 text-[11px] uppercase tracking-[0.16em] text-slate-600">CAD workspace</p>
    </div>
  );
}
