"use client";

import { Eye, EyeOff, LockKeyhole, WalletCards } from "lucide-react";
import { useState, type FormEvent } from "react";
import { login } from "@/lib/api/auth";

export function LoginForm({ returnTo = "/overview" }: { returnTo?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({ email, password });
      window.location.assign(returnTo);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in");
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 sm:px-6">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
        <div className="bg-ink px-6 py-8 text-white sm:px-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-blue-700 shadow-lg shadow-blue-950/30">
            <WalletCards aria-hidden="true" className="size-6" />
          </span>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">Welcome to Afinco</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">Sign in to access your private finance workspace.</p>
        </div>

        <form className="space-y-5 px-6 py-7 sm:px-8" onSubmit={submit}>
          <div>
            <label className="field-label" htmlFor="email">Email</label>
            <input
              autoComplete="email"
              autoFocus
              className="field"
              disabled={submitting}
              id="email"
              inputMode="email"
              maxLength={254}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="password">Password</label>
            <div className="relative">
              <input
                autoComplete="current-password"
                className="field pr-12"
                disabled={submitting}
                id="password"
                maxLength={128}
                onChange={(event) => setPassword(event.target.value)}
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="focus-ring absolute inset-y-0 right-1 my-1 grid w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? <EyeOff aria-hidden="true" className="size-[18px]" /> : <Eye aria-hidden="true" className="size-[18px]" />}
              </button>
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">{error}</p>
          ) : null}

          <button
            className="focus-ring flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-70"
            disabled={submitting}
            type="submit"
          >
            <LockKeyhole aria-hidden="true" className="size-[18px]" />
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
