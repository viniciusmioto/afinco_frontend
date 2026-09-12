"use client";

import { FileText, LoaderCircle, UploadCloud, X } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";
import { formatFileSize, validateStatementFile } from "@/lib/statements/file-validation";
import type { StatementType } from "@/lib/types/statement";

interface StatementDropzoneProps {
  statementType: StatementType;
  file: File | null;
  uploading: boolean;
  error?: string | null;
  onStatementTypeChange: (statementType: StatementType) => void;
  onFileChange: (file: File | null) => void;
  onInvalidFile: (message: string) => void;
  onUpload: () => void;
}

const statementTypes: { value: StatementType; label: string; hint: string }[] = [
  { value: "CREDIT_CARD", label: "Credit card", hint: "Supported today" },
  { value: "CHECKING_ACCOUNT", label: "Checking account", hint: "Parser pending" },
];

export function StatementDropzone({
  statementType,
  file,
  uploading,
  error,
  onStatementTypeChange,
  onFileChange,
  onInvalidFile,
  onUpload,
}: StatementDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = (candidate: File | undefined) => {
    if (!candidate) return;
    const problem = validateStatementFile(candidate);
    if (problem) {
      onInvalidFile(problem);
      onFileChange(null);
      return;
    }
    onFileChange(candidate);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (uploading) return;
    accept(event.dataTransfer?.files?.[0]);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!uploading) setDragging(true);
  };

  const clearFile = () => {
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section aria-labelledby={`${inputId}-heading`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel sm:p-6">
      <h2 className="text-base font-bold tracking-tight text-slate-950" id={`${inputId}-heading`}>
        Import a statement
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Drop a searchable PDF e-statement, or tap to browse. Files stay in memory and are never stored.
      </p>

      <fieldset className="mt-5">
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
                disabled={uploading}
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

      <div
        className={`mt-4 rounded-2xl border-2 border-dashed p-6 text-center transition sm:p-8 ${
          dragging ? "border-blue-700 bg-blue-50" : "border-slate-300 bg-slate-50/60"
        }`}
        data-dragging={dragging ? "true" : "false"}
        data-testid="statement-dropzone"
        onDragLeave={() => setDragging(false)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <label className="focus-ring block cursor-pointer" htmlFor={inputId}>
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-ink text-white">
            <UploadCloud aria-hidden="true" className="size-5" />
          </span>
          <span className="mt-4 block text-sm font-semibold text-slate-900">
            {dragging ? "Release to attach the PDF" : "Drag a PDF here or tap to browse"}
          </span>
          <span className="mt-1 block text-xs text-slate-500">PDF only · up to 10 MiB</span>
          <input
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={uploading}
            id={inputId}
            onChange={(event) => accept(event.target.files?.[0])}
            ref={inputRef}
            type="file"
          />
        </label>
      </div>

      {file && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3" data-testid="selected-file">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-slate-600">
            <FileText aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
            <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
          </div>
          <button
            aria-label={`Remove ${file.name}`}
            className="focus-ring grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white"
            disabled={uploading}
            onClick={clearFile}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      <button
        className="focus-ring mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        disabled={!file || uploading}
        onClick={onUpload}
        type="button"
      >
        {uploading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        {uploading ? "Parsing statement…" : "Review transactions"}
      </button>
    </section>
  );
}
