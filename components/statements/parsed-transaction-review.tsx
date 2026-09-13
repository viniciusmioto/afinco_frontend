"use client";

import { TriangleAlert } from "lucide-react";
import type { ReviewRow } from "@/lib/statements/review";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { Category } from "@/lib/types/transaction";
import { TypeBadge } from "@/components/transactions/type-badge";
import { CategorySelect } from "./category-select";
import { DuplicateActions } from "./duplicate-actions";

interface ParsedTransactionReviewProps {
  rows: ReviewRow[];
  categories: Category[];
  disabled?: boolean;
  onIncludedChange: (id: string, included: boolean) => void;
  onCategoryChange: (id: string, categoryId: string) => void;
}

const duplicateRowStyles = "bg-amber-50/70 hover:bg-amber-50";
const skippedRowStyles = "opacity-60";

/**
 * Review surface for a parsed statement. Flagged duplicates carry amber accents and inline
 * "Import anyway"/"Skip" actions; every row exposes a category override before the bulk save.
 */
export function ParsedTransactionReview({
  rows,
  categories,
  disabled = false,
  onIncludedChange,
  onCategoryChange,
}: ParsedTransactionReviewProps) {
  return (
    <>
      <div className="space-y-3 lg:hidden" data-testid="review-cards">
        {rows.map((row) => (
          <article
            className={`rounded-2xl border bg-white p-4 shadow-card ${
              row.duplicate ? "border-amber-300 bg-amber-50/70" : "border-slate-200"
            } ${row.included ? "" : skippedRowStyles}`}
            data-duplicate={row.duplicate ? "true" : "false"}
            data-included={row.included ? "true" : "false"}
            data-testid={`review-card-${row.id}`}
            key={row.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{row.parsed.description}</p>
                <p className="mt-1 text-xs text-slate-500">{row.parsed.bankName}</p>
              </div>
              <p className="shrink-0 text-base font-bold tabular-nums text-slate-950">
                {formatCurrency(row.parsed.amount)}
              </p>
            </div>

            {row.duplicate && <DuplicateNotice duplicateOf={row.duplicateOf} />}

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <time className="mr-auto text-xs font-medium text-slate-500" dateTime={row.parsed.date}>
                {formatDate(row.parsed.date)}
              </time>
              <TypeBadge type={row.parsed.type} />
            </div>

            <div className="mt-3 space-y-3">
              <CategorySelect
                categories={categories}
                disabled={disabled || !row.included}
                label={`Category for ${row.parsed.description} on ${row.parsed.date}`}
                onChange={(categoryId) => onCategoryChange(row.id, categoryId)}
                value={row.categoryId}
              />
              {row.duplicate ? (
                <DuplicateActions onIncludedChange={onIncludedChange} row={row} />
              ) : (
                <IncludeToggle disabled={disabled} onIncludedChange={onIncludedChange} row={row} />
              )}
            </div>
          </article>
        ))}
      </div>

      <div
        className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card lg:block"
        data-testid="review-table"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr
                  className={`transition ${row.duplicate ? duplicateRowStyles : "hover:bg-slate-50/70"} ${
                    row.included ? "" : skippedRowStyles
                  }`}
                  data-duplicate={row.duplicate ? "true" : "false"}
                  data-included={row.included ? "true" : "false"}
                  data-testid={`review-row-${row.id}`}
                  key={row.id}
                >
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-600">
                    <time dateTime={row.parsed.date}>{formatDate(row.parsed.date)}</time>
                  </td>
                  <td className="max-w-sm px-5 py-4">
                    <p className="line-clamp-2 text-sm font-medium text-slate-900">{row.parsed.description}</p>
                    {row.duplicate && <DuplicateNotice duplicateOf={row.duplicateOf} />}
                  </td>
                  <td className="px-5 py-4">
                    <TypeBadge type={row.parsed.type} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold tabular-nums text-slate-950">
                    {formatCurrency(row.parsed.amount)}
                  </td>
                  <td className="px-5 py-4">
                    <CategorySelect
                      categories={categories}
                      disabled={disabled || !row.included}
                      label={`Category for ${row.parsed.description} on ${row.parsed.date}`}
                      onChange={(categoryId) => onCategoryChange(row.id, categoryId)}
                      value={row.categoryId}
                    />
                  </td>
                  <td className="px-5 py-4">
                    {row.duplicate ? (
                      <DuplicateActions onIncludedChange={onIncludedChange} row={row} />
                    ) : (
                      <IncludeToggle disabled={disabled} onIncludedChange={onIncludedChange} row={row} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function DuplicateNotice({ duplicateOf }: { duplicateOf: string | null }) {
  return (
    <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900">
      <TriangleAlert aria-hidden="true" className="size-3.5" />
      {duplicateOf ? `Also in ${duplicateOf}` : "Possible duplicate"}
    </p>
  );
}

function IncludeToggle({
  row,
  disabled,
  onIncludedChange,
}: {
  row: ReviewRow;
  disabled?: boolean;
  onIncludedChange: (id: string, included: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
      <input
        aria-label={`Import ${row.parsed.description} on ${row.parsed.date}`}
        checked={row.included}
        className="size-4 rounded border-slate-300 text-blue-700 focus-visible:ring-4 focus-visible:ring-blue-200"
        disabled={disabled}
        onChange={(event) => onIncludedChange(row.id, event.target.checked)}
        type="checkbox"
      />
      {row.included ? "Import" : "Skipped"}
    </label>
  );
}
