import type {
  ParsedTransaction,
  TransactionBatchInput,
  TransactionBatchItem,
} from "@/lib/types/statement";
import type { Category } from "@/lib/types/transaction";

const FALLBACK_CATEGORY_NAME = "Uncategorized";

/** One reviewable statement row: the parsed data plus the reviewer's category and keep/skip decision. */
export interface ReviewRow {
  /** Repeated statement rows share a signature, so the position disambiguates the key. */
  id: string;
  parsed: ParsedTransaction;
  categoryId: string;
  included: boolean;
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

/** Picks the safest pre-selected category: `Uncategorized` when seeded, otherwise the first option. */
export function defaultCategoryId(categories: Category[]): string {
  const fallback = categories.find((category) => category.name === FALLBACK_CATEGORY_NAME) ?? categories[0];
  return fallback ? String(fallback.id) : "";
}

/**
 * Seeds the review table. Flagged duplicates start skipped so an accidental bulk save can never
 * double-count spending; the reviewer opts in per row with "Import anyway".
 */
export function buildReviewRows(parsed: ParsedTransaction[], categories: Category[]): ReviewRow[] {
  const categoryId = defaultCategoryId(categories);
  return parsed.map((transaction, index) => ({
    id: `${index}-${transaction.hashSignature}`,
    parsed: transaction,
    categoryId,
    included: !transaction.duplicate,
  }));
}

export function setRowIncluded(rows: ReviewRow[], id: string, included: boolean): ReviewRow[] {
  return rows.map((row) => (row.id === id ? { ...row, included } : row));
}

export function setRowCategory(rows: ReviewRow[], id: string, categoryId: string): ReviewRow[] {
  return rows.map((row) => (row.id === id ? { ...row, categoryId } : row));
}

export function setAllDuplicatesIncluded(rows: ReviewRow[], included: boolean): ReviewRow[] {
  return rows.map((row) => (row.parsed.duplicate ? { ...row, included } : row));
}

export function summarize(rows: ReviewRow[]): ReviewSummary {
  const included = rows.filter((row) => row.included);
  const duplicates = rows.filter((row) => row.parsed.duplicate);
  const resolvedDuplicateCount = duplicates.filter((row) => row.included).length;
  return {
    totalCount: rows.length,
    includedCount: included.length,
    skippedCount: rows.length - included.length,
    duplicateCount: duplicates.length,
    resolvedDuplicateCount,
    unresolvedDuplicateCount: duplicates.length - resolvedDuplicateCount,
    includedTotal: included.reduce((sum, row) => sum + row.parsed.amount, 0),
  };
}

/**
 * Builds the `POST /api/v1/transactions/batch` payload. Skipped rows are dropped entirely, and a
 * kept duplicate carries `forceDuplicate` so the API confirms it instead of re-flagging it.
 */
export function toBatchInput(accountId: number, rows: ReviewRow[]): TransactionBatchInput {
  return {
    accountId,
    transactions: rows.filter((row) => row.included).map(toBatchItem),
  };
}

function toBatchItem(row: ReviewRow): TransactionBatchItem {
  return {
    categoryId: Number(row.categoryId),
    date: row.parsed.date,
    amount: row.parsed.amount,
    type: row.parsed.type,
    description: row.parsed.description,
    hashSignature: row.parsed.hashSignature,
    forceDuplicate: row.parsed.duplicate,
  };
}

/** Every kept row needs a category before the batch can be submitted. */
export function hasCompleteCategories(rows: ReviewRow[]): boolean {
  return rows.filter((row) => row.included).every((row) => Boolean(row.categoryId));
}
