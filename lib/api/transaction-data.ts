import { apiRequest } from "@/lib/api/client";
import type { TransactionDataDeletion, TransactionDataSummary } from "@/lib/types/transaction";

export function getTransactionDataSummary(signal?: AbortSignal) {
  return apiRequest<TransactionDataSummary>("/transaction-data", { signal });
}

/** Permanently deletes every transaction and imported statement; accounts and categories are kept. */
export function deleteAllTransactionData() {
  return apiRequest<TransactionDataDeletion>("/transaction-data", { method: "DELETE" });
}
