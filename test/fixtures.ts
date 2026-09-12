import type { ParsedTransaction, Statement, StatementUploadResult } from "@/lib/types/statement";
import type { Account, Category, Transaction, TransactionMonth } from "@/lib/types/transaction";

export const transactions: Transaction[] = [
  {
    id: 1,
    account: { id: 4, bankName: "TD Bank", accountNumberLast4: "2048", currency: "CAD" },
    category: { id: 2, name: "Groceries", expenseType: "VARIABLE", colorCode: "#2563EB" },
    statement: { id: 12, statementType: "CREDIT_CARD", periodStart: "2026-08-14", periodEnd: "2026-09-13" },
    date: "2026-09-11",
    amount: 42.35,
    type: "CREDIT",
    description: "Harbour Market",
    hashSignature: "a".repeat(64),
    status: "CONFIRMED",
    rawText: null,
    createdAt: "2026-09-11T12:00:00",
  },
  {
    id: 2,
    account: { id: 4, bankName: "TD Bank", accountNumberLast4: "2048", currency: "CAD" },
    category: { id: 9, name: "Occasional", expenseType: "OCCASIONAL", colorCode: "#EC4899" },
    statement: null,
    date: "2026-09-03",
    amount: 2500,
    type: "DEBIT",
    description: "Monthly payroll",
    hashSignature: "b".repeat(64),
    status: "CONFIRMED",
    rawText: null,
    createdAt: "2026-09-03T09:00:00",
  },
];

export const categories: Category[] = [
  { id: 2, name: "Groceries", expenseType: "VARIABLE", colorCode: "#2563EB" },
  { id: 5, name: "Transport", expenseType: "FIXED", colorCode: "#0EA5E9" },
  { id: 9, name: "Occasional", expenseType: "OCCASIONAL", colorCode: "#EC4899" },
  { id: 10, name: "Payment", expenseType: "PAYMENT", colorCode: "#10B981" },
];

export const accounts: Account[] = [
  { id: 4, bankName: "TD Bank", accountNumberLast4: "2048", currency: "CAD" },
];

/** Third row repeats the first, so it arrives flagged with an identical signature. */
export const parsedTransactions: ParsedTransaction[] = [
  {
    date: "2026-09-11",
    amount: 42.35,
    type: "CREDIT",
    description: "Harbour Market",
    bankName: "TD Bank",
    hashSignature: "a".repeat(64),
    status: "CONFIRMED",
    duplicate: false,
    expenseType: "OCCASIONAL",
    categoryName: "Occasional",
  },
  {
    date: "2026-09-09",
    amount: 18.5,
    type: "CREDIT",
    description: "Transit Pass",
    bankName: "TD Bank",
    hashSignature: "c".repeat(64),
    status: "DUPLICATE_PENDING",
    duplicate: true,
    expenseType: "FIXED",
    categoryName: "Transport",
  },
  {
    date: "2026-09-11",
    amount: 42.35,
    type: "CREDIT",
    description: "Harbour Market",
    bankName: "TD Bank",
    hashSignature: "a".repeat(64),
    status: "DUPLICATE_PENDING",
    duplicate: true,
    expenseType: "OCCASIONAL",
    categoryName: "Occasional",
  },
];

export const uploadResult: StatementUploadResult = {
  bankName: "TD Bank",
  statementType: "CREDIT_CARD",
  periodStart: "2026-08-14",
  periodEnd: "2026-09-13",
  transactionCount: 3,
  duplicateCount: 2,
  total: 103.2,
  transactions: parsedTransactions,
};

export function pdfFile(name = "statement.pdf", size = 2048) {
  const file = new File(["%PDF-1.7 fixture"], name, { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

/** Newest billing period first, as `GET /api/v1/statements` returns them. */
export const statements: Statement[] = [
  {
    id: 12,
    account: accounts[0],
    statementType: "CREDIT_CARD",
    periodStart: "2026-08-14",
    periodEnd: "2026-09-13",
    transactionCount: 2,
    importedAt: "2026-09-14T12:00:00",
  },
  {
    id: 11,
    account: accounts[0],
    statementType: "CREDIT_CARD",
    periodStart: "2026-07-14",
    periodEnd: "2026-08-13",
    transactionCount: 44,
    importedAt: "2026-09-14T12:00:00",
  },
];

export const months: TransactionMonth[] = [
  { month: "2026-09", transactionCount: 2 },
  { month: "2026-08", transactionCount: 30 },
  { month: "2026-07", transactionCount: 14 },
];

/** A clean one-row statement for the previous billing period. */
export const julyUploadResult: StatementUploadResult = {
  bankName: "TD Bank",
  statementType: "CREDIT_CARD",
  periodStart: "2026-07-14",
  periodEnd: "2026-08-13",
  transactionCount: 1,
  duplicateCount: 0,
  total: 64.56,
  transactions: [
    {
      date: "2026-07-20",
      amount: 64.56,
      type: "CREDIT",
      description: "WALMART.CA MISSISSAUGA",
      bankName: "TD Bank",
      hashSignature: "d".repeat(64),
      status: "CONFIRMED",
      duplicate: false,
      expenseType: "VARIABLE",
      categoryName: "Groceries",
    },
  ],
};
