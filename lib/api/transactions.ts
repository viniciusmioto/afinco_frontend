import { apiRequest } from "@/lib/api/client";
import { monthBounds, type TransactionScope } from "@/lib/transactions/scope";
import type {
  Account,
  AccountCreateInput,
  Category,
  PageResponse,
  Transaction,
  TransactionCreateInput,
  TransactionMonth,
  TransactionStatus,
} from "@/lib/types/transaction";

/** Matches the backend page-size cap: enough for a whole statement or a busy month in one request. */
export const SCOPE_PAGE_SIZE = 500;

/** Every transaction of one statement or month; `status` narrows it, e.g. to confirmed rows for analysis. */
export function getTransactions(scope: TransactionScope, signal?: AbortSignal, status?: TransactionStatus) {
  const params = new URLSearchParams({ size: String(SCOPE_PAGE_SIZE) });
  if (status) params.set("status", status);
  if (scope.view === "statement") {
    params.set("statementId", String(scope.statementId));
  } else {
    const { startDate, endDate } = monthBounds(scope.month);
    params.set("startDate", startDate);
    params.set("endDate", endDate);
    if (scope.bank) params.set("bankName", scope.bank);
  }
  return apiRequest<PageResponse<Transaction>>(`/transactions?${params}`, { signal });
}

/** Months with activity for one bank, or for every bank when `bank` is null. */
export function getTransactionMonths(bank: string | null, signal?: AbortSignal) {
  const query = bank ? `?${new URLSearchParams({ bankName: bank })}` : "";
  return apiRequest<TransactionMonth[]>(`/transactions/months${query}`, { signal });
}

export function createTransaction(input: TransactionCreateInput) {
  return apiRequest<Transaction>("/transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getAccounts(signal?: AbortSignal) {
  return apiRequest<Account[]>("/accounts", { signal });
}

export function createAccount(input: AccountCreateInput) {
  return apiRequest<Account>("/accounts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getCategories(signal?: AbortSignal) {
  return apiRequest<Category[]>("/categories", { signal });
}
