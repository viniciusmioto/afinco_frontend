"use client";

import { UploadCloud } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";
import type { StatementType } from "@/lib/types/statement";

interface StatementDropzoneProps {
  statementType: StatementType;
  /** Shrinks the drop area once statements are queued, leaving room for the review. */
  compact?: boolean;
  onStatementTypeChange: (statementType: StatementType) => void;
  onFilesSelected: (files: File[]) => void;
}

const statementTypes: { value: StatementType; label: string; hint: string }[] = [
  { value: "CREDIT_CARD", label: "Credit card", hint: "Supported today" },
  { value: "CHECKING_ACCOUNT", label: "Checking account", hint: "Parser pending" },
];

export function StatementDropzone({
  statementType,
  compact = false,
  onStatementTypeChange,
  onFilesSelected,
}: StatementDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = (files: FileList | null | undefined) => {
    const selected = Array.from(files ?? []);
    if (selected.length > 0) onFilesSelected(selected);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer?.files);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(true);
  };

  return (
    <section aria-labelledby={`${inputId}-heading`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <div className={compact ? "flex flex-col gap-4 lg:flex-row lg:items-end" : ""}>
        <div className={compact ? "lg:w-80" : ""}>
          <h2 className="text-base font-bold tracking-tight text-slate-950" id={`${inputId}-heading`}>
            {compact ? "Add more statements" : "Import statements"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Drop one or more searchable PDF e-statements. Files are parsed in memory and never stored.
          </p>

          <fieldset className="mt-4">
            <legend className="field-label">Statement type</legend>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              {statementTypes.map((option) => (
                <label
                  className={`cursor-pointer rounded-lg px-3 py-2 text-center text-sm font-semibold transition ${
                    statementType === option.value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
                  }`}
                  key={option.value}
                >
                  <input
                    checked={statementType === option.value}
                    className="sr-only"
                    name="statementType"
                    onChange={() => onStatementTypeChange(option.value)}
                    type="radio"
                    value={option.value}
                  />
                  {option.label}
                  <span className="mt-0.5 block text-[11px] font-medium text-slate-400">{option.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div
          className={`rounded-2xl border-2 border-dashed text-center transition ${compact ? "flex-1 p-4" : "mt-4 p-6 sm:p-8"} ${
            dragging ? "border-blue-700 bg-blue-50" : "border-slate-300 bg-slate-50/60"
          }`}
          data-dragging={dragging ? "true" : "false"}
          data-testid="statement-dropzone"
          onDragLeave={() => setDragging(false)}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <label className="focus-ring block cursor-pointer" htmlFor={inputId}>
            <span className={`mx-auto grid place-items-center rounded-2xl bg-ink text-white ${compact ? "size-9" : "size-12"}`}>
              <UploadCloud aria-hidden="true" className="size-5" />
            </span>
            <span className="mt-3 block text-sm font-semibold text-slate-900">
              {dragging ? "Release to add the PDFs" : "Drag PDFs here or tap to browse"}
            </span>
            <span className="mt-1 block text-xs text-slate-500">PDF only · up to 10 MiB each · parsing starts right away</span>
            <input
              accept="application/pdf,.pdf"
              className="sr-only"
              id={inputId}
              multiple
              onChange={(event) => {
                accept(event.target.files);
                // Allows choosing the same file again after it was removed from the queue.
                if (inputRef.current) inputRef.current.value = "";
              }}
              ref={inputRef}
              type="file"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
