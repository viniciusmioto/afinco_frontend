"use client";

import { AlertCircle, CircleCheckBig, LoaderCircle, Save, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { AccountCreateForm } from "@/components/accounts/account-create-form";
import { formatCurrency, formatPeriod } from "@/lib/formatters";
import { canSave, type ImportItem, type ImportQueueAction } from "@/lib/statements/import-queue";
import { hasCompleteCategories, summarize } from "@/lib/statements/review";
import type { StatementUploadResult } from "@/lib/types/statement";
import type { Account, Category } from "@/lib/types/transaction";
import { ParsedTransactionReview } from "./parsed-transaction-review";

interface StatementReviewProps {
  item: ImportItem & { result: StatementUploadResult };
  accounts: Account[];
  categories: Category[];
  canCreateAccount: boolean;
  onUpdate: (action: ImportQueueAction) => void;
  onSave: (id: string) => void;
  onAccountCreated: (account: Account) => void;
}

/** Review and save surface for the statement selected in the import queue. */
export function StatementReview({
  item,
  accounts,
  categories,
  canCreateAccount,
  onUpdate,
  onSave,
  onAccountCreated,
}: StatementReviewProps) {
  const { result } = item;
  const summary = summarize(item.rows);
  const saving = item.status === "saving";
  const period = formatPeriod(result.periodStart, result.periodEnd);

  return (
    <section aria-label={`Review ${period}`} className="mt-6" data-testid="statement-review">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800">Reviewing statement</p>
        <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{period}</h2>
        <p className="text-sm text-slate-500">
          {item.file.name} · {result.bankName} · {result.statementType === "CREDIT_CARD" ? "Credit card" : "Checking account"}
        </p>
      </div>

      {item.status === "saved" && item.saved ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-panel" data-testid="save-outcome" role="status">
          <div className="flex items-start gap-3">
            <CircleCheckBig aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-700" />
            <div>
              <p className="font-semibold text-emerald-950">
                Saved {item.saved.savedCount} transaction{item.saved.savedCount === 1 ? "" : "s"}
                {item.saved.created ? " as a new statement" : " to the existing statement"}
              </p>
              <p className="mt-1 text-sm text-emerald-900">
                {item.saved.duplicateCount > 0
                  ? `${item.saved.duplicateCount} still await duplicate resolution.`
                  : `The statement now holds ${item.saved.statement.transactionCount} transactions.`}
              </p>
              <Link
                className="focus-ring mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm"
                href={`/transactions?view=statement&statement=${item.saved.statement.id}`}
              >
                View statement
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <SummaryCard label="Parsed rows" value={result.transactionCount.toString()} />
            <SummaryCard label="Flagged duplicates" tone="amber" value={summary.duplicateCount.toString()} />
            <SummaryCard label="Importing" value={summary.includedCount.toString()} />
            <SummaryCard label="Import total" value={formatCurrency(summary.includedTotal)} />
          </div>

          {item.samePeriodAs && (
            <p className="mt-5 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="status">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {item.samePeriodAs} covers the same period. Its matching rows are flagged here so the period is not imported twice.
            </p>
          )}

          {summary.duplicateCount > 0 && (
            <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5" data-testid="duplicate-banner" role="status">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700" />
                  <div>
                    <p className="font-semibold text-amber-950">
                      {summary.duplicateCount} possible duplicate{summary.duplicateCount === 1 ? "" : "s"} found
                    </p>
                    <p className="mt-1 text-sm text-amber-900">
                      Flagged rows are skipped by default. Import a row anyway when it is a genuine repeat charge.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    className="focus-ring rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
                    disabled={saving}
                    onClick={() => onUpdate({ type: "duplicatesIncluded", id: item.id, included: true })}
                    type="button"
                  >
                    Import all duplicates
                  </button>
                  <button
                    className="focus-ring rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-50"
                    disabled={saving}
                    onClick={() => onUpdate({ type: "duplicatesIncluded", id: item.id, included: false })}
                    type="button"
                  >
                    Skip all duplicates
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5">
            <ParsedTransactionReview
              categories={categories}
              disabled={saving}
              onCategoryChange={(rowId, categoryId) => onUpdate({ type: "rowCategoryChanged", id: item.id, rowId, categoryId })}
              onIncludedChange={(rowId, included) => onUpdate({ type: "rowIncluded", id: item.id, rowId, included })}
              rows={item.rows}
            />
          </div>

          <section
            aria-label="Save statement"
            className="sticky bottom-0 mt-5 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-panel backdrop-blur sm:p-5"
          >
            {canCreateAccount && (
              <AccountCreateForm defaultBankName={result.bankName} onCreated={onAccountCreated} />
            )}
            {item.error && (
              <p className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
                <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {item.error}
              </p>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <label className="w-full sm:max-w-xs">
                <span className="field-label">Destination account</span>
                <select
                  className="field"
                  disabled={saving || accounts.length === 0}
                  onChange={(event) => onUpdate({ type: "accountChanged", id: item.id, accountId: event.target.value })}
                  value={item.accountId}
                >
                  {accounts.length === 0 && <option value="">No account available</option>}
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName} •••• {account.accountNumberLast4}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <p className="text-xs font-medium text-slate-500 sm:text-right">
                  {summary.includedCount} importing · {summary.skippedCount} skipped
                  {summary.resolvedDuplicateCount > 0 && ` · ${summary.resolvedDuplicateCount} forced duplicate`}
                  {!hasCompleteCategories(item.rows) && " · choose a category for every kept row"}
                </p>
                <button
                  className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canSave(item)}
                  onClick={() => onSave(item.id)}
                  type="button"
                >
                  {saving ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}
                  {saving ? "Saving…" : `Save ${summary.includedCount} transaction${summary.includedCount === 1 ? "" : "s"}`}
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "amber" }) {
  const amber = tone === "amber";
  return (
    <div className={`rounded-2xl border p-4 shadow-panel sm:p-5 ${amber ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <p className={`truncate text-xs font-semibold uppercase tracking-[0.1em] ${amber ? "text-amber-800" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`mt-2 truncate text-xl font-bold tabular-nums tracking-tight sm:text-2xl ${amber ? "text-amber-950" : "text-slate-950"}`}>
        {value}
      </p>
    </div>
  );
}
