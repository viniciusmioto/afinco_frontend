import { Inbox } from "lucide-react";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/formatters";
import { isPayment } from "@/lib/transactions/summary";
import type { Transaction } from "@/lib/types/transaction";
import { CategoryTag } from "./category-tag";
import { ExpenseTypeBadge } from "./expense-type-badge";

function sourceLabel(transaction: Transaction) {
  return transaction.statement
    ? `Statement ${formatPeriod(transaction.statement.periodStart, transaction.statement.periodEnd)}`
    : "Manual entry";
}

/** Payments reduce what is owed, so they read as negative amounts. */
function Amount({ transaction }: { transaction: Transaction }) {
  return isPayment(transaction)
    ? <span className="text-emerald-700">{formatCurrency(-transaction.amount)}</span>
    : <>{formatCurrency(transaction.amount)}</>;
}

interface TransactionListProps {
  transactions: Transaction[];
  /** Accessible name of the table, e.g. "Credit transactions". */
  label: string;
  /** Shows which statement each row came from; redundant when a single statement is already selected. */
  showSource?: boolean;
  /** Shows each row's bank; only useful when several banks are listed together. */
  showBank?: boolean;
  emptyMessage?: string;
}

export function TransactionList({
  transactions,
  label,
  showSource = false,
  showBank = false,
  emptyMessage = "Try changing your filters or add a manual entry.",
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <div>
          <span className="mx-auto grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
            <Inbox aria-hidden="true" className="size-5" />
          </span>
          <h3 className="mt-3 text-sm font-semibold text-slate-900">No transactions found</h3>
          <p className="mt-1 text-sm text-slate-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2.5 lg:hidden" data-testid="transaction-cards">
        {transactions.map((transaction) => (
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card" key={transaction.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{transaction.description}</p>
                {showBank && <p className="mt-1 text-xs text-slate-500">{transaction.account.bankName}</p>}
                {showSource && <p className="mt-0.5 text-xs text-slate-400">{sourceLabel(transaction)}</p>}
              </div>
              <p className="shrink-0 text-base font-bold tabular-nums text-slate-950">
                <Amount transaction={transaction} />
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-3">
              <time className="mr-auto text-xs font-medium text-slate-500" dateTime={transaction.date}>
                {formatDate(transaction.date)}
              </time>
              <CategoryTag category={transaction.category} />
              <ExpenseTypeBadge type={transaction.category.expenseType} />
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card lg:block" data-testid="transaction-table">
        <div className="overflow-x-auto">
          <table aria-label={label} className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <th className="px-5 py-3.5">Date</th>
                {showBank && <th className="px-5 py-3.5">Bank</th>}
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Type</th>
                {showSource && <th className="px-5 py-3.5">Statement</th>}
                <th className="px-5 py-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((transaction) => (
                <tr className="transition hover:bg-slate-50/70" key={transaction.id}>
                  <td className="whitespace-nowrap px-5 py-3.5 text-sm font-medium text-slate-600">
                    <time dateTime={transaction.date}>{formatDate(transaction.date)}</time>
                  </td>
                  {showBank && (
                    <td className="whitespace-nowrap px-5 py-3.5 text-sm font-medium text-slate-700">{transaction.account.bankName}</td>
                  )}
                  <td className="max-w-sm px-5 py-3.5 text-sm font-medium text-slate-900">
                    <span className="line-clamp-2">{transaction.description}</span>
                  </td>
                  <td className="px-5 py-3.5"><CategoryTag category={transaction.category} /></td>
                  <td className="px-5 py-3.5"><ExpenseTypeBadge type={transaction.category.expenseType} /></td>
                  {showSource && (
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs font-medium text-slate-500">{sourceLabel(transaction)}</td>
                  )}
                  <td className="whitespace-nowrap px-5 py-3.5 text-right text-sm font-bold tabular-nums text-slate-950">
                    <Amount transaction={transaction} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
