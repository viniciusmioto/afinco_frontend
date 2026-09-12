import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { TransactionType } from "@/lib/types/transaction";

export function TypeBadge({ type }: { type: TransactionType }) {
  const isCredit = type === "CREDIT";
  const Icon = isCredit ? ArrowUpRight : ArrowDownLeft;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
        isCredit ? "bg-blue-50 text-blue-800" : "bg-emerald-50 text-emerald-800"
      }`}
    >
      <Icon aria-hidden="true" className="size-3" />
      {type}
    </span>
  );
}
