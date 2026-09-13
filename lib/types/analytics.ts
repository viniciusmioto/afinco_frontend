import type { StatementSummary } from "@/lib/types/statement";
import type { Category } from "@/lib/types/transaction";

/** Mirrors the backend `SpendingGrouping` request parameter. */
export type SpendingGrouping = "MONTH" | "STATEMENT";

export interface CategorySpending {
  categoryId: number;
  amount: number;
  transactionCount: number;
}

/** One calendar month or one billing statement of confirmed spending. */
export interface SpendingPeriod {
  /** `YYYY-MM` for a month, the statement id for a statement. */
  key: string;
  startDate: string;
  endDate: string;
  statement: StatementSummary | null;
  /** False when imported data covers only part of the period; such periods stay out of averages. */
  complete: boolean;
  categories: CategorySpending[];
}

/** `GET /api/v1/analytics/spending`: oldest period first, payments excluded. */
export interface SpendingOverview {
  groupBy: SpendingGrouping;
  bankName: string | null;
  categories: Category[];
  periods: SpendingPeriod[];
}
