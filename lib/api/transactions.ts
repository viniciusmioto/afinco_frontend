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
} from "@/lib/types/transaction";

/** Matches the backend page-size cap: enough for a whole statement or a busy month in one request. */
export const SCOPE_PAGE_SIZE = 500;

export function getTransactions(scope: TransactionScope, signal?: AbortSignal) {
  const params = new URLSearchParams({ size: String(SCOPE_PAGE_SIZE) });
  if (scope.view === "statement") {
    params.set("statementId", String(scope.statementId));
  } else {
    const { startDate, endDate } = monthBounds(scope.month);
    params.set("startDate", startDate);
    params.set("endDate", endDate);
  }
  return apiRequest<PageResponse<Transaction>>(`/transactions?${params}`, { signal });
}

export function getTransactionMonths(signal?: AbortSignal) {
  return apiRequest<TransactionMonth[]>("/transactions/months", { signal });
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
