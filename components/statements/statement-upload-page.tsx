"use client";

import {
  AlertCircle,
  CircleCheckBig,
  LoaderCircle,
  RotateCcw,
  Save,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountCreateForm } from "@/components/accounts/account-create-form";
import { uploadStatement } from "@/lib/api/statements";
import { createTransactionBatch, getAccounts, getCategories } from "@/lib/api/transactions";
import { formatCurrency } from "@/lib/formatters";
import {
  buildReviewRows,
  hasCompleteCategories,
  setAllDuplicatesIncluded,
  setRowCategory,
  setRowIncluded,
  summarize,
  suggestedCategoryId,
  toBatchInput,
  type ReviewRow,
} from "@/lib/statements/review";
import type { StatementType, StatementUploadResult } from "@/lib/types/statement";
import type { Account, Category } from "@/lib/types/transaction";
import { ParsedTransactionReview } from "./parsed-transaction-review";
import { StatementDropzone } from "./statement-dropzone";

interface SaveOutcome {
  savedCount: number;
  duplicateCount: number;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function StatementUploadPage() {
  const [statementType, setStatementType] = useState<StatementType>("CREDIT_CARD");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [result, setResult] = useState<StatementUploadResult | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountId, setAccountId] = useState("");
  const [referenceError, setReferenceError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOutcome, setSaveOutcome] = useState<SaveOutcome | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadReferenceData = async () => {
      try {
        const [loadedAccounts, loadedCategories] = await Promise.all([
          getAccounts(controller.signal),
          getCategories(controller.signal),
        ]);
        setAccounts(loadedAccounts);
        setCategories(loadedCategories);
        setAccountId(loadedAccounts[0] ? String(loadedAccounts[0].id) : "");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setReferenceError(errorMessage(error, "Accounts and categories could not be loaded"));
      }
    };
    void loadReferenceData();
    return () => controller.abort();
  }, []);

  // A fast upload can finish before the category list resolves; backfill any row left without one.
  useEffect(() => {
    if (categories.length === 0) return;
    setRows((current) =>
      current.some((row) => !row.categoryId)
        ? current.map((row) =>
            row.categoryId ? row : { ...row, categoryId: suggestedCategoryId(row.parsed, categories) },
          )
        : current,
    );
  }, [categories]);

  const summary = useMemo(() => summarize(rows), [rows]);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setSaveError(null);
    setSaveOutcome(null);
    try {
      const uploaded = await uploadStatement(file, statementType);
      setResult(uploaded);
      setRows(buildReviewRows(uploaded.transactions, categories));
    } catch (error) {
      setResult(null);
      setRows([]);
      setUploadError(errorMessage(error, "The statement could not be parsed"));
    } finally {
      setUploading(false);
    }
  }, [file, statementType, categories]);

  const handleSave = async () => {
    const included = rows.filter((row) => row.included);
    if (!accountId || included.length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await createTransactionBatch(toBatchInput(Number(accountId), rows));
      setSaveOutcome({ savedCount: response.savedCount, duplicateCount: response.duplicateCount });
      setResult(null);
      setRows([]);
      setFile(null);
    } catch (error) {
      setSaveError(errorMessage(error, "The reviewed transactions could not be saved"));
    } finally {
      setSaving(false);
    }
  };

  const resetImport = () => {
    setResult(null);
    setRows([]);
    setFile(null);
    setUploadError(null);
    setSaveError(null);
    setSaveOutcome(null);
  };

  const missingCategories = !hasCompleteCategories(rows);
  const canSave = Boolean(accountId) && summary.includedCount > 0 && !missingCategories && !saving;

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800">Statement import</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Upload a PDF statement</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Parse a bank statement, resolve any duplicate matches, then save the reviewed rows in one batch.
          </p>
        </div>
        {result && (
          <button
            className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={resetImport}
            type="button"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Start over
          </button>
        )}
      </div>

      {referenceError && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {referenceError}
        </p>
      )}

      {saveOutcome && (
        <div
          className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-panel"
          data-testid="save-outcome"
          role="status"
        >
          <div className="flex items-start gap-3">
            <CircleCheckBig aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-700" />
            <div>
              <p className="font-semibold text-emerald-950">
                Saved {saveOutcome.savedCount} transaction{saveOutcome.savedCount === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-sm text-emerald-900">
                {saveOutcome.duplicateCount > 0
                  ? `${saveOutcome.duplicateCount} still await duplicate resolution.`
                  : "Every saved row was confirmed."}
              </p>
              <Link
                className="focus-ring mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm"
                href="/transactions"
              >
                View transactions
              </Link>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div className="mt-6">
          <StatementDropzone
            error={uploadError}
            file={file}
            onFileChange={(next) => {
              setFile(next);
              setUploadError(null);
            }}
            onInvalidFile={setUploadError}
            onStatementTypeChange={setStatementType}
            onUpload={() => void handleUpload()}
            statementType={statementType}
            uploading={uploading}
          />
        </div>
      )}

      {result && (
        <>
          <section aria-label="Parsed statement summary" className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <SummaryCard label="Parsed rows" value={result.transactionCount.toString()} />
            <SummaryCard label="Flagged duplicates" tone="amber" value={summary.duplicateCount.toString()} />
            <SummaryCard label="Importing" value={summary.includedCount.toString()} />
            <SummaryCard label="Import total" value={formatCurrency(summary.includedTotal)} />
          </section>

          {summary.duplicateCount > 0 && (
            <div
              className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5"
              data-testid="duplicate-banner"
              role="status"
            >
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
                    onClick={() => setRows((current) => setAllDuplicatesIncluded(current, true))}
                    type="button"
                  >
                    Import all duplicates
                  </button>
                  <button
                    className="focus-ring rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-50"
                    onClick={() => setRows((current) => setAllDuplicatesIncluded(current, false))}
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
              onCategoryChange={(id, categoryId) => setRows((current) => setRowCategory(current, id, categoryId))}
              onIncludedChange={(id, included) => setRows((current) => setRowIncluded(current, id, included))}
              rows={rows}
            />
          </div>

          <section
            aria-label="Batch save"
            className="sticky bottom-0 mt-5 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-panel backdrop-blur sm:p-5"
          >
            {accounts.length === 0 && !referenceError && (
              <AccountCreateForm
                defaultBankName={result.bankName}
                onCreated={(account) => {
                  setAccounts([account]);
                  setAccountId(String(account.id));
                }}
              />
            )}
            {saveError && (
              <p className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
                <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {saveError}
              </p>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <label className="w-full sm:max-w-xs">
                <span className="field-label">Destination account</span>
                <select
                  className="field"
                  disabled={saving || accounts.length === 0}
                  onChange={(event) => setAccountId(event.target.value)}
                  value={accountId}
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
                </p>
                <button
                  className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canSave}
                  onClick={() => void handleSave()}
                  type="button"
                >
                  {saving ? (
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Save aria-hidden="true" className="size-4" />
                  )}
                  {saving ? "Saving…" : `Save ${summary.includedCount} transaction${summary.includedCount === 1 ? "" : "s"}`}
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "amber" }) {
  const amber = tone === "amber";
  return (
    <div
      className={`rounded-2xl border p-4 shadow-panel sm:p-5 ${
        amber ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`truncate text-xs font-semibold uppercase tracking-[0.1em] ${
          amber ? "text-amber-800" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-2 truncate text-xl font-bold tabular-nums tracking-tight sm:text-2xl ${
          amber ? "text-amber-950" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
