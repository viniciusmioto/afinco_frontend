"use client";

import { LoaderCircle, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type {
  Account,
  Category,
  TransactionCreateInput,
  TransactionType,
} from "@/lib/types/transaction";

interface ManualEntryModalProps {
  open: boolean;
  accounts: Account[];
  categories: Category[];
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: TransactionCreateInput) => Promise<void> | void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function ManualEntryModal({
  open,
  accounts,
  categories,
  submitting = false,
  error,
  onClose,
  onSubmit,
}: ManualEntryModalProps) {
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("DEBIT");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setAccountId(accounts[0]?.id.toString() ?? "");
    setCategoryId(categories.find((category) => category.name === "Occasional")?.id.toString()
      ?? categories[0]?.id.toString()
      ?? "");
    setDate(today());
    setAmount("");
    setType("DEBIT");
    setDescription("");
  }, [open, accounts, categories]);

  if (!open) return null;

  const canSubmit = Boolean(accountId && categoryId && date && Number(amount) > 0 && description.trim());
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    await onSubmit({
      accountId: Number(accountId),
      categoryId: Number(categoryId),
      date,
      amount: Number(amount),
      type,
      description: description.trim(),
    });
  };

  return (
    <div
      aria-label="Manual transaction dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-end bg-slate-950/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-6"
      role="dialog"
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-950">Add transaction</h2>
            <p className="mt-1 text-sm text-slate-500">Record a manual credit or debit.</p>
          </div>
          <button
            aria-label="Close manual entry"
            className="focus-ring grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <form className="space-y-5 p-5 sm:p-6" onSubmit={handleSubmit}>
          {(accounts.length === 0 || categories.length === 0) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
              At least one account and category are required. Import a statement to create your first account.
            </div>
          )}
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">Account</span>
              <select className="field" onChange={(event) => setAccountId(event.target.value)} required value={accountId}>
                {accounts.length === 0 && <option value="">No account available</option>}
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bankName} •••• {account.accountNumberLast4}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">Category</span>
              <select className="field" onChange={(event) => setCategoryId(event.target.value)} required value={categoryId}>
                {categories.length === 0 && <option value="">No category available</option>}
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
          </div>

          <label>
            <span className="field-label">Description</span>
            <input
              autoFocus
              className="field"
              maxLength={500}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. Weekly groceries"
              required
              value={description}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">Date</span>
              <input className="field" onChange={(event) => setDate(event.target.value)} required type="date" value={date} />
            </label>
            <label>
              <span className="field-label">Amount (CAD)</span>
              <input
                className="field"
                min="0.01"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={amount}
              />
            </label>
          </div>

          <fieldset>
            <legend className="field-label">Type</legend>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              {(["DEBIT", "CREDIT"] as TransactionType[]).map((option) => (
                <label className={`cursor-pointer rounded-lg px-3 py-2 text-center text-sm font-semibold transition ${type === option ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`} key={option}>
                  <input
                    checked={type === option}
                    className="sr-only"
                    name="type"
                    onChange={() => setType(option)}
                    type="radio"
                    value={option}
                  />
                  {option === "DEBIT" ? "Debit" : "Credit"}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button className="focus-ring h-11 rounded-xl px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100" onClick={onClose} type="button">
              Cancel
            </button>
            <button
              className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit || submitting}
              type="submit"
            >
              {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              {submitting ? "Saving…" : "Save transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
