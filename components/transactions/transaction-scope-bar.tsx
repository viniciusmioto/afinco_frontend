"use client";

import { CalendarRange, ChevronLeft, ChevronRight, FileStack } from "lucide-react";
import { formatMonth, formatPeriod } from "@/lib/formatters";
import { neighbours, type TransactionScope, type TransactionView } from "@/lib/transactions/scope";
import type { Statement } from "@/lib/types/statement";
import type { TransactionMonth } from "@/lib/types/transaction";

interface TransactionScopeBarProps {
  view: TransactionView;
  scope: TransactionScope | null;
  statements: Statement[];
  months: TransactionMonth[];
  onViewChange: (view: TransactionView) => void;
  onScopeChange: (scope: TransactionScope) => void;
}

interface ScopeOption {
  value: string;
  label: string;
  scope: TransactionScope;
}

function statementOptions(statements: Statement[]): ScopeOption[] {
  return statements.map((statement) => ({
    value: String(statement.id),
    label: `${formatPeriod(statement.periodStart, statement.periodEnd)} · ${statement.account.bankName} •••• ${
      statement.account.accountNumberLast4
    } · ${statement.transactionCount} transaction${statement.transactionCount === 1 ? "" : "s"}`,
    scope: { view: "statement", statementId: statement.id },
  }));
}

function monthOptions(months: TransactionMonth[], current: TransactionScope | null): ScopeOption[] {
  const options: ScopeOption[] = months.map((month) => ({
    value: month.month,
    label: `${formatMonth(month.month)} · ${month.transactionCount} transaction${month.transactionCount === 1 ? "" : "s"}`,
    scope: { view: "month", month: month.month },
  }));
  // A month requested through the URL stays selectable even when it has no activity.
  if (current?.view === "month" && !options.some((option) => option.value === current.month)) {
    options.push({ value: current.month, label: `${formatMonth(current.month)} · 0 transactions`, scope: current });
    options.sort((left, right) => right.value.localeCompare(left.value));
  }
  return options;
}

/** Chooses the single statement or month the ledger shows, with older/newer stepping. */
export function TransactionScopeBar({
  view,
  scope,
  statements,
  months,
  onViewChange,
  onScopeChange,
}: TransactionScopeBarProps) {
  const byStatement = view === "statement";
  const options = byStatement ? statementOptions(statements) : monthOptions(months, scope);
  const selectedValue = scope
    ? scope.view === "statement" ? String(scope.statementId) : scope.month
    : "";
  const { older, newer } = neighbours(options, options.findIndex((option) => option.value === selectedValue));
  const noun = byStatement ? "statement" : "month";

  return (
    <section aria-label="Transaction scope" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-panel sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div aria-label="View transactions by" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 lg:w-80" role="group">
          <ViewButton active={byStatement} icon={FileStack} label="By statement" onClick={() => onViewChange("statement")} />
          <ViewButton active={!byStatement} icon={CalendarRange} label="By month" onClick={() => onViewChange("month")} />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <StepButton
            direction="older"
            disabled={!older}
            label={`Older ${noun}`}
            onClick={() => older && onScopeChange(older.scope)}
          />
          <label className="min-w-0 flex-1">
            <span className="sr-only">{byStatement ? "Statement" : "Month"}</span>
            <select
              className="field truncate font-semibold"
              disabled={options.length === 0}
              onChange={(event) => {
                const option = options.find((candidate) => candidate.value === event.target.value);
                if (option) onScopeChange(option.scope);
              }}
              value={selectedValue}
            >
              {options.length === 0 && (
                <option value="">{byStatement ? "No statements imported yet" : "No transactions yet"}</option>
              )}
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <StepButton
            direction="newer"
            disabled={!newer}
            label={`Newer ${noun}`}
            onClick={() => newer && onScopeChange(newer.scope)}
          />
        </div>
      </div>
    </section>
  );
}

function ViewButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof FileStack;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`focus-ring inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </button>
  );
}

function StepButton({
  direction,
  disabled,
  label,
  onClick,
}: {
  direction: "older" | "newer";
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  const Icon = direction === "older" ? ChevronLeft : ChevronRight;
  return (
    <button
      aria-label={label}
      className="focus-ring grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}
