import type { TypeBreakdown } from "@/lib/breakdown/breakdown";
import { EXPENSE_TYPES } from "@/lib/expense-types";
import { formatCurrency, formatDayMonth, formatPercent } from "@/lib/formatters";

/** The three largest expenses of each type, with their share of that type's spending. */
export function TopExpenses({ breakdowns, noun }: { breakdowns: TypeBreakdown[]; noun: string }) {
  return (
    <section aria-labelledby="top-expenses-heading">
      <div className="mb-3 px-1">
        <h2 className="font-semibold tracking-tight text-slate-950" id="top-expenses-heading">Largest expenses</h2>
        <p className="text-sm text-slate-500">The three biggest expenses of each type in this {noun}.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {breakdowns.map((breakdown) => {
          const meta = EXPENSE_TYPES[breakdown.type];
          return (
            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card" key={breakdown.type}>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ backgroundColor: meta.color }} />
                  {meta.label}
                </h3>
                <span className="text-xs text-slate-500">{formatCurrency(breakdown.total)} total</span>
              </div>
              {breakdown.top.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">No {meta.label.toLowerCase()} spending in this {noun}.</p>
              ) : (
                <table aria-label={`Largest ${meta.label.toLowerCase()} expenses`} className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                      <th className="py-2 pl-4 pr-2" scope="col"><span className="sr-only">Rank</span>#</th>
                      <th className="px-2 py-2" scope="col">Date</th>
                      <th className="px-2 py-2" scope="col">Description</th>
                      <th className="py-2 pl-2 pr-4 text-right" scope="col">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {breakdown.top.map((expense, index) => (
                      <tr className="align-top" key={expense.id}>
                        <td className="py-3 pl-4 pr-2 text-xs font-semibold tabular-nums text-slate-400">{index + 1}</td>
                        <td className="whitespace-nowrap px-2 py-3 text-slate-600">
                          <time dateTime={expense.date}>{formatDayMonth(expense.date)}</time>
                        </td>
                        <td className="min-w-0 px-2 py-3">
                          <span className="line-clamp-2 break-words font-medium text-slate-900" title={expense.description}>{expense.description}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{expense.category.name}</span>
                        </td>
                        <td className="whitespace-nowrap py-3 pl-2 pr-4 text-right">
                          <span className="block font-semibold tabular-nums text-slate-950">{formatCurrency(expense.amount)}</span>
                          <span className="block text-xs text-slate-500">{formatPercent(expense.amount / breakdown.total)} of {meta.label.toLowerCase()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
