import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useId, type ReactNode } from "react";
import type { TypeBreakdown } from "@/lib/breakdown/breakdown";
import { EXPENSE_TYPES, SPENDING_TYPES, type SpendingType } from "@/lib/expense-types";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { PeriodAverage } from "@/lib/overview/spending";

interface PeriodSummaryProps {
  breakdowns: TypeBreakdown[];
  periodName: string;
  /** `month` or `statement`. */
  noun: string;
  days: number;
  /** The usual spending of other complete periods; null when there is none to compare with. */
  average: PeriodAverage | null;
  /** Partly imported periods are not compared with the average. */
  partial: boolean;
}

/** How the period's spending splits between fixed, variable, and occasional, with each figure against the usual level. */
export function PeriodSummary({ breakdowns, periodName, noun, days, average, partial }: PeriodSummaryProps) {
  const headingId = useId();
  const total = breakdowns.reduce((sum, breakdown) => Math.round((sum + breakdown.total) * 100) / 100, 0);
  const count = breakdowns.reduce((sum, breakdown) => sum + breakdown.transactionCount, 0);
  const byType = Object.fromEntries(breakdowns.map((breakdown) => [breakdown.type, breakdown])) as Record<SpendingType, TypeBreakdown>;
  const share = (type: SpendingType) => (total > 0 ? byType[type].total / total : 0);

  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-semibold tracking-tight text-slate-950" id={headingId}>Summary</h2>
        <p className="text-sm text-slate-500">
          {periodName} · {days} day{days === 1 ? "" : "s"} · {count} transaction{count === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-4">
        <div
          aria-label={total > 0
            ? `Distribution: ${SPENDING_TYPES.map((type) => `${EXPENSE_TYPES[type].label} ${formatPercent(share(type))}`).join(", ")}`
            : "Nothing was spent"}
          className="flex h-3 gap-0.5 overflow-hidden rounded-[4px] bg-slate-100"
          role="img"
        >
          {SPENDING_TYPES.map((type) => share(type) > 0 && (
            <span key={type} style={{ backgroundColor: EXPENSE_TYPES[type].color, flexGrow: share(type) }} />
          ))}
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 xl:grid-cols-4 xl:divide-x xl:divide-slate-100">
        <Stat label="Total expense" value={formatCurrency(total)}>
          <span className="block">{formatCurrency(days > 0 ? total / days : 0)} per day</span>
          <Change average={average?.total ?? null} current={total} noun={noun} partial={partial} />
        </Stat>
        {SPENDING_TYPES.map((type) => (
          <Stat color={EXPENSE_TYPES[type].color} key={type} label={EXPENSE_TYPES[type].label} value={formatCurrency(byType[type].total)}>
            <span className="block">{formatPercent(share(type))} of spending</span>
            <Change average={average?.byType[type] ?? null} current={byType[type].total} noun={noun} partial={partial} />
          </Stat>
        ))}
      </dl>

      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        {partial
          ? `This ${noun} is only partly imported, so it is not compared with the average.`
          : average
            ? `Changes compare with the average of ${average.periodCount} other complete ${noun}${average.periodCount === 1 ? "" : "s"}.`
            : `There is no other complete ${noun} to compare with yet.`}
        {" "}Card payments and credits are not counted.
      </p>
    </section>
  );
}

function Stat({ label, value, color, children }: { label: string; value: string; color?: string; children: ReactNode }) {
  return (
    <div className="min-w-0 xl:px-5 xl:first:pl-0">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
        {color && <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: color }} />}
        {label}
      </dt>
      <dd className="mt-1.5">
        <span className="block truncate text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{value}</span>
        <span className="mt-1 block text-xs text-slate-500">{children}</span>
      </dd>
    </div>
  );
}

function Change({ current, average, noun, partial }: { current: number; average: number | null; noun: string; partial: boolean }) {
  if (partial || average === null) return null;
  if (average === 0) {
    return current > 0 ? <span className="mt-0.5 block">Usually nothing</span> : null;
  }
  const change = (current - average) / average;
  if (Math.abs(change) < 0.005) {
    return <span className="mt-0.5 inline-flex items-center gap-1"><Minus aria-hidden="true" className="size-3.5" />Same as avg {noun}</span>;
  }
  const up = change > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  // Spending more than usual is the unfavourable direction.
  return (
    <span className={`mt-0.5 inline-flex items-center gap-1 font-medium ${up ? "text-red-700" : "text-emerald-700"}`}>
      <Icon aria-hidden="true" className="size-3.5" />
      {up ? "+" : "−"}{formatPercent(Math.abs(change))} vs avg {noun}
    </span>
  );
}
