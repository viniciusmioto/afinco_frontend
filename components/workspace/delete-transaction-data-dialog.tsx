"use client";

import { CircleCheckBig, LoaderCircle, Trash2, TriangleAlert, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { deleteAllTransactionData, getTransactionDataSummary } from "@/lib/api/transaction-data";
import type { TransactionDataDeletion, TransactionDataSummary } from "@/lib/types/transaction";

interface DeleteTransactionDataDialogProps {
  open: boolean;
  onClose: () => void;
  /** Full-page navigation, so every screen reloads its data after a reset. */
  navigate?: (href: string) => void;
}

function plural(count: number, noun: string) {
  return `${count.toLocaleString("en-CA")} ${noun}${count === 1 ? "" : "s"}`;
}

function navigateTo(href: string) {
  window.location.assign(href);
}

/**
 * Destructive confirmation for wiping all transactions and statements. Cancel is the prominent,
 * initially focused action so the safe choice is the easy one; deleting needs a deliberate click.
 */
export function DeleteTransactionDataDialog({ open, onClose, navigate = navigateTo }: DeleteTransactionDataDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const [summary, setSummary] = useState<TransactionDataSummary | null>(null);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<TransactionDataDeletion | null>(null);

  useEffect(() => {
    if (!open) return;
    setSummary(null);
    setSummaryFailed(false);
    setError(null);
    setDeleted(null);
    const controller = new AbortController();
    getTransactionDataSummary(controller.signal)
      .then(setSummary)
      .catch(() => {
        if (!controller.signal.aborted) setSummaryFailed(true);
      });
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (open) primaryActionRef.current?.focus();
  }, [open, deleted]);

  if (!open) return null;

  const empty = summary !== null && summary.transactionCount === 0 && summary.statementCount === 0;

  /** Reloads without the query string: statement ids and months in the URL no longer exist after a reset. */
  const reloadCurrentPage = () => navigate(window.location.pathname);

  const close = () => {
    if (!deleting) onClose();
  };

  const confirmDeletion = async () => {
    setDeleting(true);
    setError(null);
    try {
      setDeleted(await deleteAllTransactionData());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The transaction data could not be deleted");
    } finally {
      setDeleting(false);
    }
  };

  // Keep keyboard focus inside the dialog and let Escape act as Cancel.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (deleted) reloadCurrentPage();
      else close();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled)"));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const description = deleted
    ? `Deleted ${plural(deleted.deletedTransactions, "transaction")} and ${plural(deleted.deletedStatements, "statement")}. Accounts and categories were kept, so you can import your statements again right away.`
    : empty
      ? "There is no transaction data to delete."
      : summary
        ? `This permanently deletes ${plural(summary.transactionCount, "transaction")} and ${plural(summary.statementCount, "imported statement")}. Accounts, categories, and your login are kept. This cannot be undone.`
        : summaryFailed
          ? "This permanently deletes every transaction and imported statement. Accounts, categories, and your login are kept. This cannot be undone."
          : "Counting your transaction data…";

  return createPortal(
    <div
      className="fixed inset-0 z-[60] grid place-items-end bg-slate-950/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleted) close();
      }}
    >
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="alertdialog"
      >
        <div className="flex items-start gap-4 px-5 pb-2 pt-6 sm:px-6">
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
              deleted ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
          >
            {deleted ? <CircleCheckBig aria-hidden="true" className="size-5" /> : <TriangleAlert aria-hidden="true" className="size-5" />}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-950" id={titleId}>
              {deleted ? "Transaction data deleted" : "Are you sure you want to delete all transaction data?"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600" id={descriptionId}>
              {description}
            </p>
            {error && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 px-5 pb-6 pt-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          {deleted ? (
            <>
              <button
                className="focus-ring h-10 rounded-xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                onClick={reloadCurrentPage}
                type="button"
              >
                Close
              </button>
              <button
                className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-ink px-6 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800"
                onClick={() => navigate("/upload")}
                ref={primaryActionRef}
                type="button"
              >
                <Upload aria-hidden="true" className="size-4" />
                Import statements
              </button>
            </>
          ) : (
            <>
              <button
                className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                data-emphasis="secondary"
                disabled={deleting || empty || summary === null && !summaryFailed}
                onClick={() => void confirmDeletion()}
                type="button"
              >
                {deleting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Trash2 aria-hidden="true" className="size-4" />}
                {deleting ? "Deleting…" : "Delete data"}
              </button>
              <button
                className="focus-ring h-12 rounded-xl bg-ink px-8 text-base font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:opacity-60"
                data-emphasis="primary"
                disabled={deleting}
                onClick={close}
                ref={primaryActionRef}
                type="button"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
