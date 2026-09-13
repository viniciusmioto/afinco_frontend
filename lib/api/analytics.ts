import { apiRequest } from "@/lib/api/client";
import type { SpendingGrouping, SpendingOverview } from "@/lib/types/analytics";

/** Spending per category per month (every bank when `bank` is null) or per statement of one bank. */
export function getSpending(groupBy: SpendingGrouping, bank: string | null, signal?: AbortSignal) {
  const params = new URLSearchParams({ groupBy });
  if (bank) params.set("bankName", bank);
  return apiRequest<SpendingOverview>(`/analytics/spending?${params}`, { signal });
}
