import type { Transaction, TransactionType } from "@/lib/types/transaction";

const toCents = (amount: number) => Math.round(amount * 100);

export function isPayment(transaction: Pick<Transaction, "category">) {
  return transaction.category.expenseType === "PAYMENT";
}

/** What was spent: every row except card payments and credits, which move money instead of spending it. */
export function spentTotal(transactions: Transaction[]): number {
  return transactions.reduce((cents, transaction) => cents + (isPayment(transaction) ? 0 : toCents(transaction.amount)), 0) / 100;
}

export function paymentTotal(transactions: Transaction[]): number {
  return transactions.reduce((cents, transaction) => cents + (isPayment(transaction) ? toCents(transaction.amount) : 0), 0) / 100;
}

export function ofType(transactions: Transaction[], type: TransactionType): Transaction[] {
  return transactions.filter((transaction) => transaction.type === type);
}
