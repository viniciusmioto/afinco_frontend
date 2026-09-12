import type { ParsedTransaction, StatementUploadResult } from "@/lib/types/statement";
import type { Account, Category, Transaction } from "@/lib/types/transaction";

export const transactions: Transaction[] = [
  {
    id: 1,
    account: { id: 4, bankName: "TD Bank", accountNumberLast4: "2048", currency: "CAD" },
    category: { id: 2, name: "Groceries", colorCode: "#2563EB" },
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
    category: { id: 7, name: "Income", colorCode: "#16A34A" },
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
  { id: 2, name: "Groceries", colorCode: "#2563EB" },
  { id: 5, name: "Transportation", colorCode: "#0D9488" },
  { id: 9, name: "Uncategorized", colorCode: "#6B7280" },
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
  },
];

export const uploadResult: StatementUploadResult = {
  bankName: "TD Bank",
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
