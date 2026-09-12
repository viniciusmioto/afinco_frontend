import { Inbox } from "lucide-react";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/formatters";
import type { Transaction } from "@/lib/types/transaction";
import { CategoryTag } from "./category-tag";
import { TypeBadge } from "./type-badge";

function sourceLabel(transaction: Transaction) {
  return transaction.statement
    ? `Statement ${formatPeriod(transaction.statement.periodStart, transaction.statement.periodEnd)}`
    : "Manual entry";
}

interface TransactionListProps {
  transactions: Transaction[];
  /** Shows which statement each row came from; redundant when a single statement is already selected. */
  showSource?: boolean;
  emptyMessage?: string;
}

export function TransactionList({
  transactions,
  showSource = false,
  emptyMessage = "Try changing your filters or add a manual entry.",
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <div>
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
            <Inbox aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-4 font-semibold text-slate-900">No transactions found</h2>
          <p className="mt-1 text-sm text-slate-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 lg:hidden" data-testid="transaction-cards">
        {transactions.map((transaction) => (
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel" key={transaction.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{transaction.description}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {transaction.account.bankName} · •••• {transaction.account.accountNumberLast4}
                </p>
                {showSource && <p className="mt-0.5 text-xs text-slate-400">{sourceLabel(transaction)}</p>}
              </div>
              <p className="shrink-0 text-base font-bold tabular-nums text-slate-950">
                {formatCurrency(transaction.amount)}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <time className="mr-auto text-xs font-medium text-slate-500" dateTime={transaction.date}>
                {formatDate(transaction.date)}
              </time>
              <CategoryTag category={transaction.category} />
              <TypeBadge type={transaction.type} />
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel lg:block" data-testid="transaction-table">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Bank</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Category</th>
                {showSource && <th className="px-5 py-3.5">Statement</th>}
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((transaction) => (
                <tr className="transition hover:bg-slate-50/70" key={transaction.id}>
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-600">
                    <time dateTime={transaction.date}>{formatDate(transaction.date)}</time>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <p className="text-sm font-semibold text-slate-800">{transaction.account.bankName}</p>
                    <p className="mt-0.5 text-xs text-slate-400">•••• {transaction.account.accountNumberLast4}</p>
                  </td>
                  <td className="max-w-sm px-5 py-4 text-sm font-medium text-slate-900">
                    <span className="line-clamp-2">{transaction.description}</span>
                  </td>
                  <td className="px-5 py-4"><CategoryTag category={transaction.category} /></td>
                  {showSource && (
                    <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-slate-500">{sourceLabel(transaction)}</td>
                  )}
                  <td className="px-5 py-4"><TypeBadge type={transaction.type} /></td>
                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold tabular-nums text-slate-950">
                    {formatCurrency(transaction.amount)}
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
