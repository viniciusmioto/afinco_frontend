"use client";

import { CalendarRange, FileStack, Info, type LucideIcon } from "lucide-react";
import { useId } from "react";
import { RANGE_OPTIONS, type OverviewGroup, type OverviewRange } from "@/lib/overview/params";

interface OverviewFiltersProps {
  group: OverviewGroup;
  bank: string | null;
  range: OverviewRange;
  /** Every bank with an account. */
  banks: string[];
  /** Banks with imported statements. */
  statementBanks: string[];
  onGroupChange: (group: OverviewGroup) => void;
  onBankChange: (bank: string | null) => void;
  onRangeChange: (range: OverviewRange) => void;
}

const ALL_BANKS = "";

/** One row of filters that scopes every figure and chart below it. */
export function OverviewFilters({
  group,
  bank,
  range,
  banks,
  statementBanks,
  onGroupChange,
  onBankChange,
  onRangeChange,
}: OverviewFiltersProps) {
  const id = useId();
  const byStatement = group === "statement";
  const bankOptions = byStatement ? statementBanks : banks;
  const noun = byStatement ? "statements" : "months";

  return (
    <section aria-label="Overview filters" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card sm:p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,17rem)_minmax(0,15rem)_minmax(0,16rem)] md:items-end">
        <div>
          <span className="field-label" id={`${id}-group`}>Group by</span>
          <div aria-labelledby={`${id}-group`} className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="group">
            <Segment active={!byStatement} icon={CalendarRange} label="Months" onClick={() => onGroupChange("month")} />
            <Segment active={byStatement} icon={FileStack} label="Statements" onClick={() => onGroupChange("statement")} />
          </div>
        </div>

        <label className="min-w-0">
          <span className="field-label">Bank</span>
          <select
            className="field truncate font-semibold"
            disabled={bankOptions.length === 0}
            onChange={(event) => onBankChange(event.target.value === ALL_BANKS ? null : event.target.value)}
            value={bank ?? ALL_BANKS}
          >
            {!byStatement && <option value={ALL_BANKS}>All banks</option>}
            {byStatement && bankOptions.length === 0 && <option value={ALL_BANKS}>No statements yet</option>}
            {bankOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>

        <div>
          <span className="field-label" id={`${id}-range`}>Show last</span>
          <div aria-labelledby={`${id}-range`} className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1" role="group">
            {RANGE_OPTIONS.map((option) => (
              <button
                aria-label={option === "all" ? `All ${noun}` : `Last ${option} ${noun}`}
                aria-pressed={range === option}
                className={`focus-ring h-9 rounded-lg text-sm font-semibold transition ${
                  range === option ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
                key={option}
                onClick={() => onRangeChange(option)}
                type="button"
              >
                {option === "all" ? "All" : option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs text-slate-500" data-testid="overview-scope-note">
        <Info aria-hidden="true" className="mt-px size-3.5 shrink-0 text-slate-400" />
        {byStatement
          ? "Statements belong to one bank, so this view shows one bank at a time."
          : bank
            ? `Showing ${bank} only. Choose “All banks” to combine every bank.`
            : "Months combine spending from all banks."}
      </p>
    </section>
  );
}

function Segment({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      aria-pressed={active}
      className={`focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
        active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </button>
  );
}
