import type { ExpenseType } from "@/lib/types/transaction";

/** Expense types that count as spending. Payments move money between accounts instead. */
export type SpendingType = Exclude<ExpenseType, "PAYMENT">;

export const SPENDING_TYPES: readonly SpendingType[] = ["FIXED", "VARIABLE", "OCCASIONAL"];

interface ExpenseTypeMeta {
  label: string;
  description: string;
  /** Mark color. Text never wears it: labels stay in ink with this color on a swatch beside them. */
  color: string;
}

/**
 * Categorical slots 1–3 of the validated chart palette (colorblind-safe as a set on white). Payment is
 * not a series, so it takes a neutral slate.
 */
export const EXPENSE_TYPES: Record<ExpenseType, ExpenseTypeMeta> = {
  FIXED: { label: "Fixed", description: "Predictable monthly commitments", color: "#2a78d6" },
  VARIABLE: { label: "Variable", description: "Monthly necessities that fluctuate", color: "#eb6834" },
  OCCASIONAL: { label: "Occasional", description: "Sporadic lifestyle spending", color: "#1baf7a" },
  PAYMENT: { label: "Payment", description: "Card payments and credits", color: "#94a3b8" },
};
