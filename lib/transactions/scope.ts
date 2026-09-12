import type { Statement } from "@/lib/types/statement";
import type { TransactionMonth } from "@/lib/types/transaction";

export type TransactionView = "statement" | "month";

/** The ledger always shows exactly one statement or one calendar month. */
export type TransactionScope =
  | { view: "statement"; statementId: number }
  | { view: "month"; month: string };

export interface RequestedScope {
  view: TransactionView | null;
  statementId: number | null;
  month: string | null;
}

export interface ResolvedScope {
  view: TransactionView;
  /** Null when the chosen view has nothing to show yet (no statements, or no transactions at all). */
  scope: TransactionScope | null;
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonth(value: string | null | undefined): value is string {
  return Boolean(value && MONTH_PATTERN.test(value));
}

/** `2026-02-05` → `2026-02`. */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** Inclusive ISO date bounds of a `YYYY-MM` month. */
export function monthBounds(month: string): { startDate: string; endDate: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { startDate: `${month}-01`, endDate: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export function readRequestedScope(params: Pick<URLSearchParams, "get">): RequestedScope {
  const view = params.get("view");
  const statementId = Number(params.get("statement"));
  const month = params.get("month");
  return {
    view: view === "statement" || view === "month" ? view : null,
    statementId: Number.isInteger(statementId) && statementId > 0 ? statementId : null,
    month: isMonth(month) ? month : null,
  };
}

export function scopeToSearch(scope: TransactionScope): string {
  return scope.view === "statement"
    ? `view=statement&statement=${scope.statementId}`
    : `view=month&month=${scope.month}`;
}

export function scopeKey(scope: TransactionScope | null): string {
  return scope ? scopeToSearch(scope) : "none";
}

/** Inverse of `scopeKey`, so effects can depend on a stable string instead of an object. */
export function scopeFromKey(key: string): TransactionScope | null {
  const requested = readRequestedScope(new URLSearchParams(key));
  if (requested.view === "statement" && requested.statementId) {
    return { view: "statement", statementId: requested.statementId };
  }
  if (requested.view === "month" && requested.month) {
    return { view: "month", month: requested.month };
  }
  return null;
}

/**
 * Turns the URL request into a concrete scope. Statements are the default view whenever any exist;
 * unknown statement ids fall back to the newest statement, and a missing month to the newest month
 * with activity. Both lists arrive newest first.
 */
export function resolveScope(
  requested: RequestedScope,
  statements: Statement[],
  months: TransactionMonth[],
): ResolvedScope {
  const view = requested.view ?? (statements.length === 0 && months.length > 0 ? "month" : "statement");
  if (view === "statement") {
    const statement = statements.find((candidate) => candidate.id === requested.statementId) ?? statements[0];
    return { view, scope: statement ? { view, statementId: statement.id } : null };
  }
  const month = requested.month ?? months[0]?.month;
  return { view, scope: month ? { view, month } : null };
}

/**
 * Keeps the reader's place when switching views: a statement maps to the month its period ends in,
 * and a month maps to the statement whose period ends in that month.
 */
export function switchView(
  current: TransactionScope | null,
  target: TransactionView,
  statements: Statement[],
  months: TransactionMonth[],
): RequestedScope {
  if (target === "month") {
    const statement = current?.view === "statement"
      ? statements.find((candidate) => candidate.id === current.statementId)
      : undefined;
    const month = statement ? monthOf(statement.periodEnd) : null;
    return {
      view: "month",
      statementId: null,
      month: month && months.some((candidate) => candidate.month === month) ? month : null,
    };
  }
  const match = current?.view === "month"
    ? statements.find((statement) => monthOf(statement.periodEnd) === current.month)
    : undefined;
  return { view: "statement", statementId: match?.id ?? null, month: null };
}

/** Neighbours in a newest-first list: `older` is the next entry, `newer` the previous one. */
export function neighbours<T>(items: T[], index: number): { older: T | null; newer: T | null } {
  if (index < 0) return { older: null, newer: null };
  return { older: items[index + 1] ?? null, newer: items[index - 1] ?? null };
}
