"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api/client";
import { createAccount } from "@/lib/api/transactions";
import type { Account } from "@/lib/types/transaction";

interface AccountCreateFormProps {
  defaultBankName?: string;
  onCreated: (account: Account) => void;
}

const LAST4_PATTERN = /^\d{4}$/;

/** Inline first-run form: a fresh database has no account, and imported rows need a destination. */
export function AccountCreateForm({ defaultBankName = "", onCreated }: AccountCreateFormProps) {
  const [bankName, setBankName] = useState(defaultBankName);
  const [accountNumberLast4, setAccountNumberLast4] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = Boolean(bankName.trim()) && LAST4_PATTERN.test(accountNumberLast4) && /^[A-Za-z]{3}$/.test(currency);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const account = await createAccount({
        bankName: bankName.trim(),
        accountNumberLast4,
        currency: currency.toUpperCase(),
      });
      onCreated(account);
    } catch (reason) {
      const fieldErrors = reason instanceof ApiError ? Object.values(reason.validationErrors) : [];
      setError(
        fieldErrors.length > 0
          ? fieldErrors.join(". ")
          : reason instanceof Error ? reason.message : "The account could not be created",
      );
      setSubmitting(false);
    }
  };

  return (
    <form
      aria-label="Create account"
      className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4"
      onSubmit={handleSubmit}
    >
      <p className="text-sm font-semibold text-amber-950">Create the account these transactions belong to</p>
      <p className="mt-1 text-xs text-amber-900">No account exists yet. Only the last four digits are stored.</p>
      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_100px_auto] sm:items-end">
        <label>
          <span className="field-label">Bank name</span>
          <input
            className="field"
            disabled={submitting}
            maxLength={100}
            onChange={(event) => setBankName(event.target.value)}
            required
            value={bankName}
          />
        </label>
        <label>
          <span className="field-label">Last 4 digits</span>
          <input
            className="field"
            disabled={submitting}
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => setAccountNumberLast4(event.target.value.replace(/\D/g, ""))}
            pattern="\d{4}"
            placeholder="1234"
            required
            value={accountNumberLast4}
          />
        </label>
        <label>
          <span className="field-label">Currency</span>
          <input
            className="field uppercase"
            disabled={submitting}
            maxLength={3}
            onChange={(event) => setCurrency(event.target.value)}
            required
            value={currency}
          />
        </label>
        <button
          className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSubmit || submitting}
          type="submit"
        >
          {submitting ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Plus aria-hidden="true" className="size-4" />
          )}
          {submitting ? "Creating…" : "Create account"}
        </button>
      </div>
    </form>
  );
}
