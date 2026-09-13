import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { EXPENSE_TYPES, SPENDING_TYPES } from "@/lib/expense-types";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { periodName, periodNoun, type SpendingKpis } from "@/lib/overview/spending";
import type { SpendingGrouping } from "@/lib/types/analytics";

interface OverviewKpisProps {
  kpis: SpendingKpis;
  groupBy: SpendingGrouping;
  rangeName: string;
  selected: boolean;
}

export function OverviewKpis({ kpis, groupBy, rangeName, selected }: OverviewKpisProps) {
  const noun = periodNoun(groupBy);
  const partialCount = kpis.periodCount - kpis.completeCount;
  const highlight = kpis.highlight;

  return (
    <section aria-label="Key figures" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Tile label="Total spent" value={formatCurrency(kpis.total)}>
        {kpis.periodCount} {periodNoun(groupBy, kpis.periodCount)} · {rangeName}
      </Tile>

      <Tile label={`Average per ${noun}`} value={kpis.averagePerPeriod === null ? "—" : formatCurrency(kpis.averagePerPeriod)}>
        {kpis.completeCount === 0
          ? `No complete ${noun} yet`
          : `${kpis.completeCount} complete ${periodNoun(groupBy, kpis.completeCount)}`}
        {partialCount > 0 && ` · ${partialCount} partial left out`}
      </Tile>

      <Tile
        label={selected ? `Selected ${noun}` : `Last complete ${noun}`}
        value={highlight ? formatCurrency(highlight.total) : "—"}
      >
        {highlight && <span className="block truncate font-medium text-slate-600">{periodName(highlight.period, groupBy)}</span>}
        <Change change={kpis.changeVsAverage} partial={Boolean(highlight && !highlight.period.complete)} />
      </Tile>

      <Tile label="Spending mix" value={kpis.mix ? `${formatPercent(kpis.mix.FIXED)} fixed` : "—"}>
        {kpis.mix ? (
          <>
            <span aria-hidden="true" className="mb-2 mt-1 flex h-2 gap-0.5 overflow-hidden rounded-[3px]">
              {SPENDING_TYPES.map((type) => kpis.mix![type] > 0 && (
                <span key={type} style={{ backgroundColor: EXPENSE_TYPES[type].color, flexGrow: kpis.mix![type] }} />
              ))}
            </span>
            <span className="flex flex-wrap gap-x-3 gap-y-0.5">
              {SPENDING_TYPES.map((type) => (
                <span className="inline-flex items-center gap-1" key={type}>
                  <span aria-hidden="true" className="size-2 rounded-[2px]" style={{ backgroundColor: EXPENSE_TYPES[type].color }} />
                  {EXPENSE_TYPES[type].label} {formatPercent(kpis.mix![type])}
                </span>
              ))}
            </span>
          </>
        ) : "Nothing spent in this range"}
      </Tile>
    </section>
  );
}

function Change({ change, partial }: { change: number | null; partial: boolean }) {
  if (partial) return <>Partial period, not compared</>;
  if (change === null) return <>Not enough complete history to compare</>;
  if (Math.abs(change) < 0.005) {
    return <span className="inline-flex items-center gap-1"><Minus aria-hidden="true" className="size-3.5" />In line with the average</span>;
  }
  const up = change > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  // Spending more than usual is the unfavourable direction.
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${up ? "text-red-700" : "text-emerald-700"}`}>
      <Icon aria-hidden="true" className="size-3.5" />
      {formatPercent(Math.abs(change))} {up ? "above" : "below"} the average
    </span>
  );
}

function Tile({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-card sm:p-5">
      {/* Phones reserve two lines so values stay aligned across a row when a label wraps. */}
      <p className="min-h-[2.8em] text-[11px] font-semibold uppercase leading-snug tracking-[0.1em] text-slate-500 sm:min-h-0 sm:truncate sm:text-xs">{label}</p>
      <p className="mt-1 truncate text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{value}</p>
      <div className="mt-1 text-xs text-slate-500">{children}</div>
    </div>
  );
}
