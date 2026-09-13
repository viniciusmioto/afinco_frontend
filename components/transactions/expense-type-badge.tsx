import { EXPENSE_TYPES } from "@/lib/expense-types";
import type { ExpenseType } from "@/lib/types/transaction";

/** Fixed / Variable / Occasional / Payment, keyed with the same swatch color the Overview charts use. */
export function ExpenseTypeBadge({ type }: { type: ExpenseType }) {
  const meta = EXPENSE_TYPES[type];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-600" title={meta.description}>
      <span aria-hidden="true" className="size-2 rounded-[2px]" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}
