import type {
  ImportedTransactionInput,
  ParsedTransaction,
  StatementImportInput,
  StatementUploadResult,
} from "@/lib/types/statement";
import type { Category } from "@/lib/types/transaction";

const FALLBACK_CATEGORY_NAME = "Occasional";

/** One reviewable statement row: the parsed data plus the reviewer's category and keep/skip decision. */
export interface ReviewRow {
  /** Repeated statement rows share a signature, so the position disambiguates the key. */
  id: string;
  parsed: ParsedTransaction;
  categoryId: string;
  included: boolean;
  /** Flagged by the backend (already saved or repeated in this statement) or found in another queued file. */
  duplicate: boolean;
  /** File name of another statement in this import that contains the same transaction. */
  duplicateOf: string | null;
}

export interface ReviewSummary {
  totalCount: number;
  includedCount: number;
  skippedCount: number;
  duplicateCount: number;
  resolvedDuplicateCount: number;
  unresolvedDuplicateCount: number;
  includedTotal: number;
}

/** Picks the seeded catch-all category when available, otherwise the first option. */
export function defaultCategoryId(categories: Category[]): string {
  const fallback = categories.find((category) => category.name === FALLBACK_CATEGORY_NAME) ?? categories[0];
  return fallback ? String(fallback.id) : "";
}

/** Resolves the backend suggestion by name and falls back safely if reference data is stale. */
export function suggestedCategoryId(transaction: ParsedTransaction, categories: Category[]): string {
  const suggested = categories.find((category) => category.name === transaction.categoryName);
  return suggested ? String(suggested.id) : defaultCategoryId(categories);
}

/**
 * Seeds the review table. Flagged duplicates start skipped so an accidental bulk save can never
 * double-count spending; the reviewer opts in per row with "Import anyway". `otherFiles` maps the
 * signatures of statements already parsed in this import to their file names.
 */
export function buildReviewRows(
  parsed: ParsedTransaction[],
  categories: Category[],
  otherFiles: ReadonlyMap<string, string> = new Map(),
): ReviewRow[] {
  return parsed.map((transaction, index) => {
    const duplicateOf = transaction.duplicate ? null : otherFiles.get(transaction.hashSignature) ?? null;
    const duplicate = transaction.duplicate || duplicateOf !== null;
    return {
      id: `${index}-${transaction.hashSignature}`,
      parsed: transaction,
      categoryId: suggestedCategoryId(transaction, categories),
      included: !duplicate,
      duplicate,
      duplicateOf,
    };
  });
}

export function setRowIncluded(rows: ReviewRow[], id: string, included: boolean): ReviewRow[] {
  return rows.map((row) => (row.id === id ? { ...row, included } : row));
}

export function setRowCategory(rows: ReviewRow[], id: string, categoryId: string): ReviewRow[] {
  return rows.map((row) => (row.id === id ? { ...row, categoryId } : row));
}

export function setAllDuplicatesIncluded(rows: ReviewRow[], included: boolean): ReviewRow[] {
  return rows.map((row) => (row.duplicate ? { ...row, included } : row));
}

/** Gives rows that were built before categories loaded their suggested category. */
export function backfillCategories(rows: ReviewRow[], categories: Category[]): ReviewRow[] {
  if (categories.length === 0 || rows.every((row) => row.categoryId)) return rows;
  return rows.map((row) =>
    row.categoryId ? row : { ...row, categoryId: suggestedCategoryId(row.parsed, categories) },
  );
}

export function summarize(rows: ReviewRow[]): ReviewSummary {
  const included = rows.filter((row) => row.included);
  const duplicates = rows.filter((row) => row.duplicate);
  const resolvedDuplicateCount = duplicates.filter((row) => row.included).length;
  return {
    totalCount: rows.length,
    includedCount: included.length,
    skippedCount: rows.length - included.length,
    duplicateCount: duplicates.length,
    resolvedDuplicateCount,
    unresolvedDuplicateCount: duplicates.length - resolvedDuplicateCount,
    includedTotal: included.reduce(
      (sum, row) => sum + (row.parsed.expenseType === "PAYMENT" ? -row.parsed.amount : row.parsed.amount),
      0,
    ),
  };
}

/**
 * Builds the `POST /api/v1/statements` payload. Skipped rows are dropped entirely, and a kept
 * duplicate carries `forceDuplicate` so the API confirms it instead of re-flagging it.
 */
export function toImportInput(
  accountId: number,
  statement: Pick<StatementUploadResult, "statementType" | "periodStart" | "periodEnd">,
  rows: ReviewRow[],
): StatementImportInput {
  return {
    accountId,
    statementType: statement.statementType,
    periodStart: statement.periodStart,
    periodEnd: statement.periodEnd,
    transactions: rows.filter((row) => row.included).map(toImportedTransaction),
  };
}

function toImportedTransaction(row: ReviewRow): ImportedTransactionInput {
  return {
    categoryId: Number(row.categoryId),
    date: row.parsed.date,
    amount: row.parsed.amount,
    description: row.parsed.description,
    forceDuplicate: row.duplicate,
  };
}

/** Every kept row needs a category before the statement can be submitted. */
export function hasCompleteCategories(rows: ReviewRow[]): boolean {
  return rows.filter((row) => row.included).every((row) => Boolean(row.categoryId));
}
