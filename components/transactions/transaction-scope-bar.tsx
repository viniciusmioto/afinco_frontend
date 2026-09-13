"use client";

import { CalendarRange, ChevronLeft, ChevronRight, FileStack, Info } from "lucide-react";
import { useId } from "react";
import { formatMonth, formatPeriod } from "@/lib/formatters";
import {
  neighbours,
  statementsOfBank,
  type ResolvedScope,
  type TransactionScope,
  type TransactionView,
} from "@/lib/transactions/scope";
import type { Statement } from "@/lib/types/statement";
import type { TransactionMonth } from "@/lib/types/transaction";

interface TransactionScopeBarProps {
  resolved: ResolvedScope;
  /** Every bank with an account. */
  banks: string[];
  /** Every statement, newest first. */
  statements: Statement[];
  /** Months with activity for the resolved bank, newest first. */
  months: TransactionMonth[];
  onViewChange: (view: TransactionView) => void;
  onScopeChange: (scope: TransactionScope) => void;
  /** Null selects every bank, which only the month view allows. */
  onBankChange: (bank: string | null) => void;
}

interface ScopeOption {
  value: string;
  label: string;
  scope: TransactionScope;
}

const ALL_BANKS = "";

const statementTypeLabel = { CREDIT_CARD: "Credit card", CHECKING_ACCOUNT: "Checking account" } as const;

/** Labels each statement by its period alone, naming the account type only when two periods coincide. */
function statementOptions(statements: Statement[]): ScopeOption[] {
  const periods = statements.map((statement) => formatPeriod(statement.periodStart, statement.periodEnd));
  return statements.map((statement, index) => ({
    value: String(statement.id),
    label: periods.indexOf(periods[index]) === periods.lastIndexOf(periods[index])
      ? periods[index]
      : `${periods[index]} · ${statementTypeLabel[statement.statementType]}`,
    scope: { view: "statement", statementId: statement.id },
  }));
}

function monthOptions(months: TransactionMonth[], current: TransactionScope | null, bank: string | null): ScopeOption[] {
  const values = months.map((month) => month.month);
  // A month requested through the URL stays selectable even when it has no activity.
  if (current?.view === "month" && !values.includes(current.month)) {
    values.push(current.month);
    values.sort((left, right) => right.localeCompare(left));
  }
  return values.map((month) => ({ value: month, label: formatMonth(month), scope: { view: "month", month, bank } }));
}

function scopeNote({ view, bank }: ResolvedScope) {
  if (view === "statement") return "Statements belong to one bank, so this view shows one bank at a time.";
  return bank
    ? `Showing ${bank} only. Choose “All banks” to combine every bank.`
    : "This month combines transactions from all banks.";
}

/** Chooses the single statement or month the ledger shows, its bank, and older/newer stepping. */
export function TransactionScopeBar({
  resolved,
  banks,
  statements,
  months,
  onViewChange,
  onScopeChange,
  onBankChange,
}: TransactionScopeBarProps) {
  const { view, bank, scope } = resolved;
  const id = useId();
  const byStatement = view === "statement";
  const options = byStatement ? statementOptions(statementsOfBank(statements, bank)) : monthOptions(months, scope, bank);
  const selectedValue = scope
    ? scope.view === "statement" ? String(scope.statementId) : scope.month
    : "";
  const { older, newer } = neighbours(options, options.findIndex((option) => option.value === selectedValue));
  const noun = byStatement ? "statement" : "month";
  const bankOptions = byStatement
    ? [...new Set(statements.map((statement) => statement.account.bankName))].sort((left, right) => left.localeCompare(right))
    : banks;

  return (
    <section aria-label="Transaction scope" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card sm:p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[18rem_minmax(11rem,15rem)_minmax(0,1fr)] xl:items-end">
        <div className="md:col-span-2 xl:col-span-1">
          <span className="field-label" id={`${id}-view`}>View</span>
          <div aria-labelledby={`${id}-view`} className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="group">
            <ViewButton active={byStatement} icon={FileStack} label="By statement" onClick={() => onViewChange("statement")} />
            <ViewButton active={!byStatement} icon={CalendarRange} label="By month" onClick={() => onViewChange("month")} />
          </div>
        </div>

        <label className="min-w-0">
          <span className="field-label">Bank</span>
          <select
            className="field truncate font-semibold"
            disabled={bankOptions.length === 0}
            onChange={(event) => onBankChange(event.target.value === ALL_BANKS ? null : event.target.value)}
            value={bank ?? ALL_BANKS}
          >
            {!byStatement && <option value={ALL_BANKS}>All banks</option>}
            {byStatement && bankOptions.length === 0 && <option value={ALL_BANKS}>No bank yet</option>}
            {bankOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>

        <div className="min-w-0">
          <label className="field-label" htmlFor={`${id}-period`}>{byStatement ? "Statement" : "Month"}</label>
          <div className="flex min-w-0 items-center gap-2">
            <StepButton
              direction="older"
              disabled={!older}
              label={`Older ${noun}`}
              onClick={() => older && onScopeChange(older.scope)}
            />
            <select
              className="field min-w-0 flex-1 truncate font-semibold"
              disabled={options.length === 0}
              id={`${id}-period`}
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
            <StepButton
              direction="newer"
              disabled={!newer}
              label={`Newer ${noun}`}
              onClick={() => newer && onScopeChange(newer.scope)}
            />
          </div>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs text-slate-500" data-testid="scope-note">
        <Info aria-hidden="true" className="mt-px size-3.5 shrink-0 text-slate-400" />
        {scopeNote(resolved)}
      </p>
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
      className={`focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
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
