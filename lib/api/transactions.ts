import { apiRequest } from "@/lib/api/client";
import type {
  TransactionBatchInput,
  TransactionBatchResult,
} from "@/lib/types/statement";
import type {
  Account,
  AccountCreateInput,
  Category,
  PageResponse,
  Transaction,
  TransactionCreateInput,
} from "@/lib/types/transaction";

export function getTransactions(signal?: AbortSignal) {
  return apiRequest<PageResponse<Transaction>>("/transactions?size=100", { signal });
}

export function createTransaction(input: TransactionCreateInput) {
  return apiRequest<Transaction>("/transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createTransactionBatch(input: TransactionBatchInput) {
  return apiRequest<TransactionBatchResult>("/transactions/batch", {
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
