import type { StatementSummary } from "@/lib/types/statement";

export type TransactionType = "CREDIT" | "DEBIT";
export type TransactionStatus = "CONFIRMED" | "DUPLICATE_PENDING";
export type ExpenseType = "PAYMENT" | "FIXED" | "VARIABLE" | "OCCASIONAL";

export interface Account {
  id: number;
  bankName: string;
  accountNumberLast4: string;
  currency: string;
}

export interface AccountCreateInput {
  bankName: string;
  accountNumberLast4: string;
  currency: string;
}

export interface Category {
  id: number;
  name: string;
  expenseType: ExpenseType;
  colorCode: string;
}

export interface Transaction {
  id: number;
  account: Account;
  category: Category;
  /** Source statement; null for manual entries. */
  statement: StatementSummary | null;
  date: string;
  amount: number;
  type: TransactionType;
  description: string;
  hashSignature: string;
  status: TransactionStatus;
  rawText: string | null;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** Local refinements applied inside the selected statement or month. */
export interface TransactionFilters {
  search: string;
  categoryId: string;
}

export interface TransactionMonth {
  /** Calendar month as `YYYY-MM`. */
  month: string;
  transactionCount: number;
}

export interface TransactionCreateInput {
  accountId: number;
  categoryId: number;
  date: string;
  amount: number;
  type: TransactionType;
  description: string;
}
