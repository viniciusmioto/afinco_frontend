import { SPENDING_TYPES, type SpendingType } from "@/lib/expense-types";
import { formatMonth, formatPeriod, formatShortMonth, formatDayMonth } from "@/lib/formatters";
import type { OverviewRange } from "@/lib/overview/params";
import type { SpendingGrouping, SpendingOverview, SpendingPeriod } from "@/lib/types/analytics";
import type { Category } from "@/lib/types/transaction";

/** Money is added in whole cents so repeated sums never drift. */
const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (cents: number) => Math.round(cents) / 100;

export interface PeriodTotals {
  period: SpendingPeriod;
  byType: Record<SpendingType, number>;
  total: number;
}

export function periodTotals(overview: SpendingOverview): PeriodTotals[] {
  const typeOf = new Map(overview.categories.map((category) => [category.id, category.expenseType]));
  return overview.periods.map((period) => {
    const cents: Record<SpendingType, number> = { FIXED: 0, VARIABLE: 0, OCCASIONAL: 0 };
    for (const row of period.categories) {
      const type = typeOf.get(row.categoryId);
      if (type && type !== "PAYMENT") cents[type] += toCents(row.amount);
    }
    return {
      period,
      byType: { FIXED: fromCents(cents.FIXED), VARIABLE: fromCents(cents.VARIABLE), OCCASIONAL: fromCents(cents.OCCASIONAL) },
      total: fromCents(cents.FIXED + cents.VARIABLE + cents.OCCASIONAL),
    };
  });
}

/** The most recent periods of an oldest-first list. */
export function lastPeriods<T>(items: T[], range: OverviewRange): T[] {
  return range === "all" ? items : items.slice(-range);
}

export function average(values: number[]): number | null {
  return values.length === 0 ? null : fromCents(values.reduce((sum, value) => sum + toCents(value), 0) / values.length);
}

export interface SpendingKpis {
  total: number;
  periodCount: number;
  completeCount: number;
  /** Mean spending of complete periods; partial periods would drag it down. */
  averagePerPeriod: number | null;
  /** The selected period, else the latest complete one, else the latest. */
  highlight: PeriodTotals | null;
  /** Relative change of the highlight against the other complete periods; null when not comparable. */
  changeVsAverage: number | null;
  /** Share of each type in the range total; null when nothing was spent. */
  mix: Record<SpendingType, number> | null;
}

export function spendingKpis(totals: PeriodTotals[], selectedKey: string | null): SpendingKpis {
  const complete = totals.filter((entry) => entry.period.complete);
  const highlight = totals.find((entry) => entry.period.key === selectedKey) ?? complete.at(-1) ?? totals.at(-1) ?? null;
  const baseline = average(complete.filter((entry) => entry !== highlight).map((entry) => entry.total));
  const total = fromCents(totals.reduce((sum, entry) => sum + toCents(entry.total), 0));
  const typeTotal = (type: SpendingType) => totals.reduce((sum, entry) => sum + toCents(entry.byType[type]), 0);

  return {
    total,
    periodCount: totals.length,
    completeCount: complete.length,
    averagePerPeriod: average(complete.map((entry) => entry.total)),
    highlight,
    changeVsAverage: highlight?.period.complete && baseline ? (highlight.total - baseline) / baseline : null,
    mix: total > 0
      ? Object.fromEntries(SPENDING_TYPES.map((type) => [type, typeTotal(type) / toCents(total)])) as Record<SpendingType, number>
      : null,
  };
}

export interface CategoryRow {
  category: Category;
  /** Spending across the whole range. */
  total: number;
  /** Mean per complete period in the range, counting periods without spending as zero. */
  averagePerPeriod: number | null;
  /** Spending in the selected period; null when no period is selected. */
  selected: number | null;
  /** Share of the value being compared: the selected period's total, or the range total. */
  share: number;
  transactionCount: number;
}

/** Categories with spending in the range, largest first for the value being compared. */
export function categoryRows(
  categories: Category[],
  periods: SpendingPeriod[],
  selected: SpendingPeriod | null,
): CategoryRow[] {
  const completeCount = periods.filter((period) => period.complete).length;
  const rows = categories
    .filter((category) => category.expenseType !== "PAYMENT")
    .map((category) => {
      let totalCents = 0;
      let completeCents = 0;
      let transactionCount = 0;
      for (const period of periods) {
        const row = period.categories.find((candidate) => candidate.categoryId === category.id);
        if (!row) continue;
        totalCents += toCents(row.amount);
        transactionCount += row.transactionCount;
        if (period.complete) completeCents += toCents(row.amount);
      }
      const selectedRow = selected?.categories.find((candidate) => candidate.categoryId === category.id);
      return {
        category,
        total: fromCents(totalCents),
        averagePerPeriod: completeCount > 0 ? fromCents(completeCents / completeCount) : null,
        selected: selected ? selectedRow?.amount ?? 0 : null,
        share: 0,
        transactionCount,
      };
    })
    .filter((row) => row.total > 0);

  const value = (row: CategoryRow) => row.selected ?? row.total;
  const sum = rows.reduce((cents, row) => cents + toCents(value(row)), 0);
  return rows
    .map((row) => ({ ...row, share: sum > 0 ? toCents(value(row)) / sum : 0 }))
    .sort((left, right) => value(right) - value(left) || right.total - left.total);
}

export function periodNoun(groupBy: SpendingGrouping, count = 1): string {
  const noun = groupBy === "STATEMENT" ? "statement" : "month";
  return count === 1 ? noun : `${noun}s`;
}

/** `July 2026` or `Jul 14 – Aug 13, 2026`. */
export function periodName(period: SpendingPeriod, groupBy: SpendingGrouping): string {
  return groupBy === "STATEMENT" ? formatPeriod(period.startDate, period.endDate) : formatMonth(period.key);
}

/**
 * Compact axis label: months as `Feb 2026`, `Mar`, … repeating the year each January; statements by
 * their closing date, `Aug 13`.
 */
export function periodTick(period: SpendingPeriod, groupBy: SpendingGrouping, isFirst: boolean): string {
  if (groupBy === "STATEMENT") return formatDayMonth(period.endDate);
  return formatShortMonth(period.key, isFirst || period.key.endsWith("-01"));
}

/** `Feb – Aug 2026`, `Nov 2025 – Feb 2026`, or a statement span `Feb 3 – Aug 13, 2026`. */
export function rangeName(periods: SpendingPeriod[], groupBy: SpendingGrouping): string {
  const first = periods[0];
  const last = periods.at(-1);
  if (!first || !last) return "";
  if (groupBy === "STATEMENT") return formatPeriod(first.startDate, last.endDate);
  if (first === last) return formatMonth(first.key);
  const sameYear = first.key.slice(0, 4) === last.key.slice(0, 4);
  return `${formatShortMonth(first.key, !sameYear)} – ${formatShortMonth(last.key, true)}`;
}

/** Rounded axis ticks from zero, e.g. 0 / 200 / 400 / 600 / 800 for a maximum of 700. */
export function niceTicks(max: number, targetCount = 4): number[] {
  if (!(max > 0)) return [0, 50, 100];
  const rough = max / targetCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const step = (residual > 5 ? 10 : residual > 2.5 ? 5 : residual > 2 ? 2.5 : residual > 1 ? 2 : 1) * magnitude;
  const count = Math.ceil(max / step - 1e-9);
  return Array.from({ length: count + 1 }, (_, index) => index * step);
}

export interface PeriodAverage {
  total: number;
  byType: Record<SpendingType, number>;
  /** How many complete periods the average covers. */
  periodCount: number;
}

/** Average spending of the complete periods other than `key`: the usual level to judge one period against. */
export function averageOfOtherPeriods(totals: PeriodTotals[], key: string): PeriodAverage | null {
  const others = totals.filter((entry) => entry.period.complete && entry.period.key !== key);
  if (others.length === 0) return null;
  const mean = (pick: (entry: PeriodTotals) => number) => average(others.map(pick)) ?? 0;
  return {
    total: mean((entry) => entry.total),
    byType: { FIXED: mean((entry) => entry.byType.FIXED), VARIABLE: mean((entry) => entry.byType.VARIABLE), OCCASIONAL: mean((entry) => entry.byType.OCCASIONAL) },
    periodCount: others.length,
  };
}
