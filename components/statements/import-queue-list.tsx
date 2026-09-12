"use client";

import {
  AlertCircle,
  CircleCheckBig,
  Clock3,
  FileText,
  LoaderCircle,
  RotateCcw,
  Save,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatPeriod } from "@/lib/formatters";
import { countItems, type ImportItem, type ImportStatus } from "@/lib/statements/import-queue";
import { summarize } from "@/lib/statements/review";

interface ImportQueueListProps {
  items: ImportItem[];
  selectedId: string | null;
  saving: boolean;
  onSelect: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onSaveAll: () => void;
  onClearFinished: () => void;
}

const statusStyles: Record<ImportStatus, { label: string; className: string }> = {
  queued: { label: "Queued", className: "bg-slate-100 text-slate-600" },
  parsing: { label: "Parsing", className: "bg-blue-50 text-blue-800" },
  ready: { label: "Ready to review", className: "bg-amber-50 text-amber-900" },
  failed: { label: "Failed", className: "bg-red-50 text-red-800" },
  saving: { label: "Saving", className: "bg-blue-50 text-blue-800" },
  saved: { label: "Saved", className: "bg-emerald-50 text-emerald-800" },
};

export function ImportQueueList({
  items,
  selectedId,
  saving,
  onSelect,
  onRetry,
  onRemove,
  onSaveAll,
  onClearFinished,
}: ImportQueueListProps) {
  const counts = countItems(items);

  return (
    <section aria-label="Import queue" className="rounded-2xl border border-slate-200 bg-white shadow-panel">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-950">
            {counts.total} statement{counts.total === 1 ? "" : "s"}
          </h2>
          <p className="mt-0.5 text-xs font-medium text-slate-500" data-testid="queue-counts">
            {[
              counts.pending > 0 && `${counts.pending} parsing`,
              counts.ready > 0 && `${counts.ready} to review`,
              counts.saved > 0 && `${counts.saved} saved`,
              counts.failed > 0 && `${counts.failed} failed`,
            ].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(counts.saved > 0 || items.some((item) => item.status === "failed" && !item.retryable)) && (
            <button
              className="focus-ring inline-flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              onClick={onClearFinished}
              type="button"
            >
              Clear finished
            </button>
          )}
          <button
            className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saving || counts.saveable === 0}
            onClick={onSaveAll}
            type="button"
          >
            {saving ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}
            Save all ready ({counts.saveable})
          </button>
        </div>
      </div>

      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <QueueRow
            item={item}
            key={item.id}
            onRemove={onRemove}
            onRetry={onRetry}
            onSelect={onSelect}
            selected={item.id === selectedId}
          />
        ))}
      </ul>
    </section>
  );
}

function QueueRow({
  item,
  selected,
  onSelect,
  onRetry,
  onRemove,
}: {
  item: ImportItem;
  selected: boolean;
  onSelect: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const status = statusStyles[item.status];
  const reviewable = item.result !== null && item.status !== "failed";
  const summary = summarize(item.rows);

  return (
    <li
      className={`flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5 ${selected ? "bg-blue-50/60" : ""}`}
      data-status={item.status}
      data-testid={`queue-item-${item.file.name}`}
    >
      <button
        aria-current={selected ? "true" : undefined}
        aria-label={`Review ${item.file.name}`}
        className="focus-ring flex min-w-0 flex-1 items-start gap-3 rounded-xl text-left disabled:cursor-default"
        disabled={!reviewable}
        onClick={() => onSelect(item.id)}
        type="button"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
          <StatusIcon status={item.status} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900">
            {item.result ? formatPeriod(item.result.periodStart, item.result.periodEnd) : item.file.name}
          </span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">
            {item.result
              ? `${item.file.name} · ${item.result.transactionCount} rows · ${summary.duplicateCount} duplicate${summary.duplicateCount === 1 ? "" : "s"} · ${formatCurrency(summary.includedTotal)}`
              : item.status === "queued" ? "Waiting for a free parsing slot" : status.label}
          </span>
          {item.samePeriodAs && item.status !== "saved" && (
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-800">
              <TriangleAlert aria-hidden="true" className="size-3.5" />
              Same period as {item.samePeriodAs}
            </span>
          )}
          {item.error && (
            <span className="mt-1 flex items-start gap-1 text-xs font-medium text-red-700" role="alert">
              <AlertCircle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              {item.error}
            </span>
          )}
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${status.className}`}>
          {status.label}
        </span>
        {item.status === "saved" && item.saved && (
          <Link
            className="focus-ring rounded-lg px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
            href={`/transactions?view=statement&statement=${item.saved.statement.id}`}
          >
            View
          </Link>
        )}
        {item.status === "failed" && item.retryable && (
          <button
            aria-label={`Retry ${item.file.name}`}
            className="focus-ring grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
            onClick={() => onRetry(item.id)}
            type="button"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
          </button>
        )}
        {item.status !== "saving" && (
          <button
            aria-label={`Remove ${item.file.name}`}
            className="focus-ring grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
            onClick={() => onRemove(item.id)}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
    </li>
  );
}

function StatusIcon({ status }: { status: ImportStatus }) {
  switch (status) {
    case "queued":
      return <Clock3 aria-hidden="true" className="size-4" />;
    case "parsing":
    case "saving":
      return <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />;
    case "failed":
      return <AlertCircle aria-hidden="true" className="size-4 text-red-700" />;
    case "saved":
      return <CircleCheckBig aria-hidden="true" className="size-4 text-emerald-700" />;
    default:
      return <FileText aria-hidden="true" className="size-4" />;
  }
}
