import type { ExpenseType, TransactionStatus, TransactionType } from "@/lib/types/transaction";

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
  transactionCount: number;
  duplicateCount: number;
  total: number;
  transactions: ParsedTransaction[];
}

export interface TransactionBatchItem {
  categoryId: number;
  date: string;
  amount: number;
  type: TransactionType;
  description: string;
  hashSignature: string;
  forceDuplicate: boolean;
}

export interface TransactionBatchInput {
  accountId: number;
  transactions: TransactionBatchItem[];
}

export interface TransactionBatchResult {
  savedCount: number;
  duplicateCount: number;
  transactions: unknown[];
}
