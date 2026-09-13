"use client";

import { BarChart3, Table2 } from "lucide-react";
import { useId, useState } from "react";
import { EXPENSE_TYPES, SPENDING_TYPES } from "@/lib/expense-types";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { periodNoun, type CategoryRow } from "@/lib/overview/spending";
import type { SpendingGrouping } from "@/lib/types/analytics";
import { ChartCard, ViewToggle } from "@/components/charts/chart-card";

interface CategoryComparisonProps {
  rows: CategoryRow[];
  groupBy: SpendingGrouping;
  /** `Feb – Aug 2026`: what the totals cover. */
  rangeName: string;
  /** Name of the selected period, when one is selected. */
  selectedName: string | null;
}

/** Relative difference from the average, or null when there is no average to compare with. */
function versusAverage(row: CategoryRow): number | null {
  return row.selected !== null && row.averagePerPeriod ? (row.selected - row.averagePerPeriod) / row.averagePerPeriod : null;
}

/** `+24% vs avg`, compact enough to sit under the bar value. */
function describeChange(change: number | null): string {
  if (change === null) return "No average yet";
  if (Math.abs(change) < 0.005) return "Same as avg";
  return `${change > 0 ? "+" : "−"}${formatPercent(Math.abs(change))} vs avg`;
}

/**
 * Horizontal bars, largest first, colored by expense type. Without a selection they show the range total;
 * with one they show that period, with a tick at the category's average per complete period.
 */
export function CategoryComparison({ rows, groupBy, rangeName, selectedName }: CategoryComparisonProps) {
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();
  const noun = periodNoun(groupBy);
  const comparing = selectedName !== null;
  const value = (row: CategoryRow) => row.selected ?? row.total;
  const scaleMax = Math.max(1, ...rows.map((row) => Math.max(value(row), comparing ? row.averagePerPeriod ?? 0 : 0)));
  const presentTypes = SPENDING_TYPES.filter((type) => rows.some((row) => row.category.expenseType === type));

  return (
    <ChartCard
      actions={<ViewToggle chartIcon={BarChart3} onChange={setShowTable} showTable={showTable} tableIcon={Table2} />}
      description={comparing
        ? <><span className="font-medium text-slate-700">{selectedName}</span> compared with the average {noun}</>
        : <>Total for <span className="font-medium text-slate-700">{rangeName}</span></>}
      title="Spending by category"
      titleId={titleId}
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
        {presentTypes.map((type) => (
          <span className="inline-flex items-center gap-1.5" key={type}>
            <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ backgroundColor: EXPENSE_TYPES[type].color }} />
            {EXPENSE_TYPES[type].label}
          </span>
        ))}
        {comparing && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-slate-700" />
            Average per complete {noun}
          </span>
        )}
      </div>

      {showTable ? (
        <CategoryTable comparing={comparing} noun={noun} rows={rows} selectedName={selectedName} />
      ) : (
        <ul aria-labelledby={titleId} className="space-y-3.5">
          {rows.map((row) => {
            const change = versusAverage(row);
            const width = (value(row) / scaleMax) * 100;
            const average = comparing && row.averagePerPeriod !== null ? (row.averagePerPeriod / scaleMax) * 100 : null;
            return (
              <li
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1.5 sm:grid-cols-[8.5rem_minmax(0,1fr)_7rem] sm:items-center"
                key={row.category.id}
              >
                <p className="min-w-0 truncate text-sm font-medium text-slate-800">
                  {row.category.name}
                  <span className="sr-only">, {EXPENSE_TYPES[row.category.expenseType].label}</span>
                </p>
                <div className="relative order-last col-span-2 h-4 sm:order-none sm:col-span-1">
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0.5 left-0 rounded-r-[4px]"
                    style={{
                      width: `${Math.max(width, value(row) > 0 ? 0.75 : 0)}%`,
                      backgroundColor: EXPENSE_TYPES[row.category.expenseType].color,
                    }}
                  />
                  {average !== null && (
                    <span aria-hidden="true" className="absolute -inset-y-0.5 w-0.5 rounded-full bg-slate-700" style={{ left: `calc(${average}% - 1px)` }} />
                  )}
                </div>
                <p className="text-right text-sm">
                  <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(value(row))}</span>
                  <span className="block text-xs text-slate-500">
                    {comparing ? describeChange(change) : `${formatPercent(row.share)} of total`}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
}

function CategoryTable({
  rows,
  comparing,
  noun,
  selectedName,
}: {
  rows: CategoryRow[];
  comparing: boolean;
  noun: string;
  selectedName: string | null;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">Spending by category</caption>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            <th className="px-3 py-2.5" scope="col">Category</th>
            <th className="px-3 py-2.5" scope="col">Type</th>
            {comparing && <th className="px-3 py-2.5 text-right" scope="col">{selectedName}</th>}
            <th className="px-3 py-2.5 text-right" scope="col">Avg / {noun}</th>
            {comparing && <th className="px-3 py-2.5 text-right" scope="col">vs average</th>}
            <th className="px-3 py-2.5 text-right" scope="col">Total</th>
            <th className="px-3 py-2.5 text-right" scope="col">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.category.id}>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800" scope="row">{row.category.name}</th>
              <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{EXPENSE_TYPES[row.category.expenseType].label}</td>
              {comparing && <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{formatCurrency(row.selected ?? 0)}</td>}
              <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-700">
                {row.averagePerPeriod === null ? "—" : formatCurrency(row.averagePerPeriod)}
              </td>
              {comparing && <td className="whitespace-nowrap px-3 py-2.5 text-right text-slate-600">{describeChange(versusAverage(row))}</td>}
              <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-700">{formatCurrency(row.total)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-700">{formatPercent(row.share)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
