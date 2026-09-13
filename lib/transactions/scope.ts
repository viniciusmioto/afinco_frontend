import { readBankParam } from "@/lib/banks";
import type { Statement } from "@/lib/types/statement";
import type { TransactionMonth } from "@/lib/types/transaction";

export type TransactionView = "statement" | "month";

/**
 * The ledger always shows exactly one statement or one calendar month. A statement belongs to one bank;
 * a month shows one bank or, with a null bank, every bank together.
 */
export type TransactionScope =
  | { view: "statement"; statementId: number }
  | { view: "month"; month: string; bank: string | null };

export interface RequestedScope {
  view: TransactionView | null;
  statementId: number | null;
  month: string | null;
  bank: string | null;
}

export interface ResolvedScope {
  view: TransactionView;
  /** The bank on screen: the statement's own bank, or the month filter (null for every bank). */
  bank: string | null;
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
    bank: readBankParam(params.get("bank")),
  };
}

export function scopeToSearch(scope: TransactionScope): string {
  const params = new URLSearchParams({ view: scope.view });
  if (scope.view === "statement") {
    params.set("statement", String(scope.statementId));
  } else {
    params.set("month", scope.month);
    if (scope.bank) params.set("bank", scope.bank);
  }
  return params.toString();
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
    return { view: "month", month: requested.month, bank: requested.bank };
  }
  return null;
}

/** Statements are the default view whenever any exist. */
function resolveView(requested: RequestedScope, statements: Statement[]): TransactionView {
  return requested.view ?? (statements.length === 0 ? "month" : "statement");
}

/** The requested statement, else the newest statement of the requested bank, else the newest overall. */
function resolveStatement(requested: RequestedScope, statements: Statement[]): Statement | null {
  return statements.find((statement) => statement.id === requested.statementId)
    ?? statements.find((statement) => statement.account.bankName === requested.bank)
    ?? statements[0]
    ?? null;
}

/**
 * The bank to show, which is known before the months list: a statement's own bank, or the month view's
 * filter when it names one of `banks`.
 */
export function resolveBank(requested: RequestedScope, statements: Statement[], banks: string[]): string | null {
  if (resolveView(requested, statements) === "statement") {
    return resolveStatement(requested, statements)?.account.bankName ?? null;
  }
  return requested.bank && banks.includes(requested.bank) ? requested.bank : null;
}

/**
 * Turns the URL request into a concrete scope. Unknown statement ids fall back to the newest statement
 * (of the requested bank when there is one), and a missing month to the newest month with activity for
 * the bank. `statements` arrive newest first; `months` are those of the resolved bank, newest first.
 */
export function resolveScope(
  requested: RequestedScope,
  statements: Statement[],
  months: TransactionMonth[],
  banks: string[],
): ResolvedScope {
  const view = resolveView(requested, statements);
  const bank = resolveBank(requested, statements, banks);
  if (view === "statement") {
    const statement = resolveStatement(requested, statements);
    return { view, bank, scope: statement ? { view, statementId: statement.id } : null };
  }
  const month = requested.month ?? months[0]?.month;
  return { view, bank, scope: month ? { view, month, bank } : null };
}

/**
 * Keeps the reader's place and bank when switching views: a statement maps to the month its period ends
 * in, and a month maps to the bank's statement whose period ends in that month.
 */
export function switchView(
  current: ResolvedScope,
  target: TransactionView,
  statements: Statement[],
  months: TransactionMonth[],
): RequestedScope {
  const scope = current.scope;
  if (target === "month") {
    const statement = scope?.view === "statement"
      ? statements.find((candidate) => candidate.id === scope.statementId)
      : undefined;
    const month = statement ? monthOf(statement.periodEnd) : null;
    return {
      view: "month",
      statementId: null,
      month: month && months.some((candidate) => candidate.month === month) ? month : null,
      bank: current.bank,
    };
  }
  const match = scope?.view === "month"
    ? statementsOfBank(statements, current.bank).find((statement) => monthOf(statement.periodEnd) === scope.month)
    : undefined;
  return { view: "statement", statementId: match?.id ?? null, month: null, bank: current.bank };
}

/** Moves to another bank (null for every bank, month view only) without leaving the current view. */
export function switchBank(current: ResolvedScope, bank: string | null): RequestedScope {
  const scope = current.scope;
  return current.view === "statement"
    ? { view: "statement", statementId: null, month: null, bank }
    : { view: "month", statementId: null, month: scope?.view === "month" ? scope.month : null, bank };
}

/** Statements of one bank; every statement when `bank` is null. */
export function statementsOfBank(statements: Statement[], bank: string | null): Statement[] {
  return bank ? statements.filter((statement) => statement.account.bankName === bank) : statements;
}

/** Neighbours in a newest-first list: `older` is the next entry, `newer` the previous one. */
export function neighbours<T>(items: T[], index: number): { older: T | null; newer: T | null } {
  if (index < 0) return { older: null, newer: null };
  return { older: items[index + 1] ?? null, newer: items[index - 1] ?? null };
}
