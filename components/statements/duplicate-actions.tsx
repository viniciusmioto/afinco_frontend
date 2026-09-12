"use client";

import { Check, Undo2 } from "lucide-react";
import type { ReviewRow } from "@/lib/statements/review";

interface DuplicateActionsProps {
  row: ReviewRow;
  onIncludedChange: (id: string, included: boolean) => void;
}

/**
 * Inline resolution for a flagged duplicate. A flagged row starts skipped, so the primary action
 * is "Import anyway"; once kept, the reviewer can send it back to skipped.
 */
export function DuplicateActions({ row, onIncludedChange }: DuplicateActionsProps) {
  const label = `${row.parsed.description} on ${row.parsed.date}`;

  if (row.included) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900">
          <Check aria-hidden="true" className="size-3" />
          Importing
        </span>
        <button
          aria-label={`Skip ${label}`}
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => onIncludedChange(row.id, false)}
          type="button"
        >
          <Undo2 aria-hidden="true" className="size-3.5" />
          Skip
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        aria-label={`Import anyway ${label}`}
        className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
        onClick={() => onIncludedChange(row.id, true)}
        type="button"
      >
        <Check aria-hidden="true" className="size-3.5" />
        Import anyway
      </button>
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        Skipped
      </span>
    </div>
  );
}
