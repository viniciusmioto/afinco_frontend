import type { Account, ExpenseType, TransactionStatus, TransactionType } from "@/lib/types/transaction";

/** Mirrors the backend `StatementType` request parameter. */
export type StatementType = "CREDIT_CARD" | "CHECKING_ACCOUNT";

/** A row returned by the upload preview. Previews carry no database id yet. */
export interface ParsedTransaction {
  date: string;
  amount: number;
  type: TransactionType;
  description: string;
  bankName: string;
  hashSignature: string;
  status: TransactionStatus;
  duplicate: boolean;
  expenseType: ExpenseType;
  categoryName: string;
}

export interface StatementUploadResult {
  bankName: string;
  statementType: StatementType;
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
  duplicateCount: number;
  total: number;
  transactions: ParsedTransaction[];
}

/** An imported statement as listed by `GET /api/v1/statements`. */
export interface Statement {
  id: number;
  account: Account;
  statementType: StatementType;
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
  importedAt: string;
}

/** Compact statement reference embedded in each saved transaction. */
export interface StatementSummary {
  id: number;
  statementType: StatementType;
  periodStart: string;
  periodEnd: string;
}

export interface ImportedTransactionInput {
  categoryId: number;
  date: string;
  amount: number;
  description: string;
  forceDuplicate: boolean;
}

export interface StatementImportInput {
  accountId: number;
  statementType: StatementType;
  periodStart: string;
  periodEnd: string;
  transactions: ImportedTransactionInput[];
}

export interface StatementImportResult {
  statement: Statement;
  /** False when the rows were appended to a statement already stored for the same period. */
  created: boolean;
  savedCount: number;
  duplicateCount: number;
}
