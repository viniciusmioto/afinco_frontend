"use client";

import { ChartLine, Table2, X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { EXPENSE_TYPES, SPENDING_TYPES, type SpendingType } from "@/lib/expense-types";
import { formatCompactCurrency, formatCurrency } from "@/lib/formatters";
import { useElementWidth } from "@/lib/hooks/use-element-width";
import { niceTicks, periodName, periodNoun, periodTick, type PeriodTotals } from "@/lib/overview/spending";
import type { SpendingGrouping } from "@/lib/types/analytics";
import { ChartCard, ViewToggle } from "@/components/charts/chart-card";

const HEIGHT = 272;
const MARGIN = { top: 12, right: 12, bottom: 34, left: 48 };
/** Keeps the first and last markers clear of the plot edges. */
const EDGE = 14;
const MIN_LABEL_SPACING = 64;

const INK_MUTED = "#64748b";
const GRID = "#e2e8f0";
const BASELINE = "#cbd5e1";
const SURFACE = "#ffffff";

interface SpendingTrendChartProps {
  totals: PeriodTotals[];
  groupBy: SpendingGrouping;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
}

/** Fixed, variable, and occasional spending per period on one axis, with a crosshair readout. */
export function SpendingTrendChart({ totals, groupBy, selectedKey, onSelect }: SpendingTrendChartProps) {
  const [hidden, setHidden] = useState<ReadonlySet<SpendingType>>(new Set());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [plotRef, width] = useElementWidth<HTMLDivElement>(640);
  const titleId = useId();
  const hintId = useId();

  const count = totals.length;
  const visibleTypes = SPENDING_TYPES.filter((type) => !hidden.has(type));
  const selectedIndex = totals.findIndex((entry) => entry.period.key === selectedKey);
  const readoutIndex = activeIndex ?? (selectedIndex >= 0 ? selectedIndex : count - 1);
  const readout = totals[readoutIndex];
  const hasPartial = totals.some((entry) => !entry.period.complete);

  const plotLeft = MARGIN.left;
  const plotRight = Math.max(plotLeft + 1, width - MARGIN.right);
  const plotTop = MARGIN.top;
  const plotBottom = HEIGHT - MARGIN.bottom;
  const step = count <= 1 ? 0 : (plotRight - plotLeft - 2 * EDGE) / (count - 1);
  const xAt = (index: number) => (count <= 1 ? (plotLeft + plotRight) / 2 : plotLeft + EDGE + index * step);
  const ticks = niceTicks(Math.max(0, ...totals.flatMap((entry) => visibleTypes.map((type) => entry.byType[type]))));
  const top = ticks.at(-1) ?? 1;
  const yAt = (value: number) => plotBottom - (value / top) * (plotBottom - plotTop);
  // Label every nth period, counted back from the latest so the newest period is always named.
  const labelEvery = count <= 1 ? 1 : Math.max(1, Math.ceil(MIN_LABEL_SPACING / step));

  const indexFromPointer = (event: { clientX: number; currentTarget: Element }) => {
    if (count <= 1) return 0;
    const offset = event.clientX - event.currentTarget.getBoundingClientRect().left;
    return Math.min(count - 1, Math.max(0, Math.round((offset - plotLeft - EDGE) / step)));
  };

  const toggleSelection = (index: number) => {
    const key = totals[index]?.period.key ?? null;
    onSelect(key === selectedKey ? null : key);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = activeIndex ?? readoutIndex;
    const moves: Record<string, number> = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: count - 1 };
    if (event.key in moves) {
      event.preventDefault();
      setActiveIndex(Math.min(count - 1, Math.max(0, moves[event.key])));
      setTooltip(true);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleSelection(current);
    } else if (event.key === "Escape") {
      setActiveIndex(null);
      setTooltip(false);
    }
  };

  const toggleType = (type: SpendingType) => {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const selected = selectedIndex >= 0 ? totals[selectedIndex] : null;
  const tooltipEntry = tooltip && activeIndex !== null ? totals[activeIndex] : null;
  const tooltipOnLeft = tooltipEntry ? xAt(activeIndex ?? 0) > width / 2 : false;

  return (
    <ChartCard
      actions={<ViewToggle chartIcon={ChartLine} onChange={setShowTable} showTable={showTable} tableIcon={Table2} />}
      description={`Fixed, variable, and occasional spending per ${periodNoun(groupBy)}.`}
      title="Spending by type"
      titleId={titleId}
    >
      {selected && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1 font-medium text-slate-700">
            Selected: {periodName(selected.period, groupBy)}
            <button
              aria-label="Clear the selected period"
              className="focus-ring grid size-5 place-items-center rounded-full text-slate-500 transition hover:bg-slate-200"
              onClick={() => onSelect(null)}
              type="button"
            >
              <X aria-hidden="true" className="size-3" />
            </button>
          </span>
        </div>
      )}

      {readout && (
        <div aria-label="Series" className="grid grid-cols-3 gap-2" role="group">
          {SPENDING_TYPES.map((type) => {
            const visible = !hidden.has(type);
            return (
              <button
                aria-pressed={visible}
                className={`focus-ring min-w-0 rounded-xl border px-2 py-2 text-left transition sm:px-3 ${
                  visible ? "border-slate-200 bg-white hover:bg-slate-50" : "border-dashed border-slate-200 bg-slate-50 opacity-60"
                }`}
                disabled={visible && visibleTypes.length === 1}
                key={type}
                onClick={() => toggleType(type)}
                title={visible ? `Hide ${EXPENSE_TYPES[type].label.toLowerCase()} spending` : `Show ${EXPENSE_TYPES[type].label.toLowerCase()} spending`}
                type="button"
              >
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 sm:gap-2 sm:text-xs">
                  <LineKey color={EXPENSE_TYPES[type].color} muted={!visible} />
                  <span className="truncate">{EXPENSE_TYPES[type].label}</span>
                </span>
                <span className="mt-0.5 block truncate text-sm font-semibold tabular-nums text-slate-900 sm:text-base">
                  {formatCurrency(readout.byType[type])}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {readout && (
        <p className="mt-2 text-xs text-slate-500" data-testid="trend-readout">
          <span className="font-medium text-slate-700">{periodName(readout.period, groupBy)}</span>
          {" · "}{formatCurrency(readout.total)} total
          {!readout.period.complete && " · partial period"}
        </p>
      )}

      {showTable ? (
        <TrendTable groupBy={groupBy} totals={totals} />
      ) : (
        <div
          aria-describedby={hintId}
          aria-labelledby={titleId}
          className="focus-ring relative mt-3 rounded-xl"
          onKeyDown={handleKeyDown}
          onBlur={() => { setActiveIndex(null); setTooltip(false); }}
          ref={plotRef}
          role="group"
          tabIndex={0}
        >
          <p className="sr-only" id={hintId}>
            Use the left and right arrow keys to read each {periodNoun(groupBy)}, and Enter to select it.
          </p>
          <svg
            aria-hidden="true"
            className="block touch-pan-y select-none"
            height={HEIGHT}
            onClick={(event) => toggleSelection(indexFromPointer(event))}
            onPointerLeave={() => { setActiveIndex(null); setTooltip(false); }}
            onPointerMove={(event) => {
              setActiveIndex(indexFromPointer(event));
              setTooltip(event.pointerType === "mouse");
            }}
            style={{ cursor: count > 0 ? "pointer" : undefined }}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            width={width}
          >
            {selectedIndex >= 0 && (
              <rect
                fill="#f1f5f9"
                height={plotBottom - plotTop}
                rx={6}
                width={Math.max(20, Math.min(step || plotRight - plotLeft, 64))}
                x={xAt(selectedIndex) - Math.max(20, Math.min(step || plotRight - plotLeft, 64)) / 2}
                y={plotTop}
              />
            )}

            {ticks.map((tick) => (
              <g key={tick}>
                <line stroke={tick === 0 ? BASELINE : GRID} strokeWidth={1} x1={plotLeft} x2={plotRight} y1={yAt(tick)} y2={yAt(tick)} />
                <text dominantBaseline="middle" fill={INK_MUTED} fontSize={11} style={{ fontVariantNumeric: "tabular-nums" }} textAnchor="end" x={plotLeft - 8} y={yAt(tick)}>
                  {formatCompactCurrency(tick)}
                </text>
              </g>
            ))}

            {totals.map((entry, index) => ((count - 1 - index) % labelEvery === 0 ? (
              <text
                fill={index === selectedIndex ? "#0f172a" : INK_MUTED}
                fontSize={11}
                fontWeight={index === selectedIndex ? 600 : 400}
                key={entry.period.key}
                textAnchor={count > 1 && index === 0 && xAt(0) - plotLeft < 30 ? "start" : count > 1 && index === count - 1 && plotRight - xAt(index) < 30 ? "end" : "middle"}
                x={xAt(index)}
                y={plotBottom + 20}
              >
                {periodTick(entry.period, groupBy, index === 0)}
              </text>
            ) : null))}

            {activeIndex !== null && (
              <line stroke="#94a3b8" strokeWidth={1} x1={xAt(activeIndex)} x2={xAt(activeIndex)} y1={plotTop} y2={plotBottom} />
            )}

            {visibleTypes.map((type) => (
              <polyline
                fill="none"
                key={type}
                points={totals.map((entry, index) => `${xAt(index)},${yAt(entry.byType[type])}`).join(" ")}
                stroke={EXPENSE_TYPES[type].color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            ))}

            {visibleTypes.map((type) => totals.map((entry, index) => {
              const color = EXPENSE_TYPES[type].color;
              const emphasised = index === readoutIndex;
              if (!entry.period.complete) {
                return (
                  <circle cx={xAt(index)} cy={yAt(entry.byType[type])} fill={SURFACE} key={`${type}-${entry.period.key}`}
                    r={emphasised ? 5 : 4} stroke={color} strokeWidth={2} />
                );
              }
              if (!emphasised && count > 1) return null;
              return (
                <circle cx={xAt(index)} cy={yAt(entry.byType[type])} fill={color} key={`${type}-${entry.period.key}`}
                  r={5} stroke={SURFACE} strokeWidth={2} />
              );
            }))}
          </svg>

          {tooltipEntry && (
            <div
              className="pointer-events-none absolute top-2 z-10 w-48 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur"
              data-testid="trend-tooltip"
              style={tooltipOnLeft
                ? { right: width - xAt(activeIndex ?? 0) + 12 }
                : { left: xAt(activeIndex ?? 0) + 12 }}
            >
              <p className="font-semibold text-slate-900">{periodName(tooltipEntry.period, groupBy)}</p>
              {!tooltipEntry.period.complete && <p className="mt-0.5 text-slate-500">Partial period</p>}
              <dl className="mt-2 space-y-1">
                {visibleTypes.map((type) => (
                  <div className="flex items-center justify-between gap-3" key={type}>
                    <dt className="flex items-center gap-2 text-slate-500"><LineKey color={EXPENSE_TYPES[type].color} />{EXPENSE_TYPES[type].label}</dt>
                    <dd className="font-semibold tabular-nums text-slate-900">{formatCurrency(tooltipEntry.byType[type])}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-1">
                  <dt className="text-slate-500">Total</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">{formatCurrency(tooltipEntry.total)}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      )}

      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        {hasPartial && (
          <span className="inline-flex items-center gap-1.5">
            <svg aria-hidden="true" className="size-3" viewBox="0 0 12 12"><circle cx="6" cy="6" fill={SURFACE} r="4" stroke={INK_MUTED} strokeWidth="2" /></svg>
            Partial {periodNoun(groupBy)}: not fully imported yet, left out of averages
          </span>
        )}
        {!showTable && count > 1 && <span>Select a {periodNoun(groupBy)} to compare its categories.</span>}
      </p>
    </ChartCard>
  );
}

function LineKey({ color, muted = false }: { color: string; muted?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-0.5 w-3.5 shrink-0 rounded-full"
      style={{ backgroundColor: muted ? "#cbd5e1" : color }}
    />
  );
}

function TrendTable({ totals, groupBy }: { totals: PeriodTotals[]; groupBy: SpendingGrouping }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">Spending by type per {periodNoun(groupBy)}</caption>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            <th className="px-3 py-2.5" scope="col">{groupBy === "STATEMENT" ? "Statement" : "Month"}</th>
            {SPENDING_TYPES.map((type) => <th className="px-3 py-2.5 text-right" key={type} scope="col">{EXPENSE_TYPES[type].label}</th>)}
            <th className="px-3 py-2.5 text-right" scope="col">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {[...totals].reverse().map((entry) => (
            <tr key={entry.period.key}>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-700" scope="row">
                {periodName(entry.period, groupBy)}
                {!entry.period.complete && <span className="ml-1.5 text-xs font-normal text-slate-400">partial</span>}
              </th>
              {SPENDING_TYPES.map((type) => (
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-700" key={type}>{formatCurrency(entry.byType[type])}</td>
              ))}
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{formatCurrency(entry.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
