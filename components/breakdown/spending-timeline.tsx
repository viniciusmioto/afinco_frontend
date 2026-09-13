"use client";

import { ChartColumnStacked, Table2 } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { ChartCard, ViewToggle } from "@/components/charts/chart-card";
import { bucketLabel, type BucketSize, type TimeBucket, type TypeBreakdown } from "@/lib/breakdown/breakdown";
import { EXPENSE_TYPES, type SpendingType } from "@/lib/expense-types";
import { formatCompactCurrency, formatCurrency, formatDayMonth } from "@/lib/formatters";
import { useElementWidth } from "@/lib/hooks/use-element-width";
import { niceTicks } from "@/lib/overview/spending";

/** Every chart uses the same left margin and width, which keeps their time axes aligned. */
const LEFT = 48;
const RIGHT = 8;
const TOP = 10;
const PLOT_HEIGHT = 112;
const AXIS_HEIGHT = 24;
const HEIGHT = TOP + PLOT_HEIGHT + AXIS_HEIGHT;
const MAX_BAR = 24;
const SEGMENT_GAP = 2;
const MIN_LABEL_SPACING = 40;

const INK_MUTED = "#64748b";
const GRID = "#e2e8f0";
const BASELINE = "#cbd5e1";
const HIGHLIGHT = "#f1f5f9";

interface ActiveBucket {
  index: number;
  /** The chart showing the tooltip: the one under the pointer or holding keyboard focus. */
  owner: SpendingType;
}

interface SpendingTimelineProps {
  breakdowns: TypeBreakdown[];
  buckets: TimeBucket[];
  bucketSize: BucketSize;
  onBucketSizeChange: (size: BucketSize) => void;
  /** `month` or `statement`. */
  noun: string;
}

/** One stacked bar chart per expense type, on a shared time axis, each bar split by category. */
export function SpendingTimeline({ breakdowns, buckets, bucketSize, onBucketSizeChange, noun }: SpendingTimelineProps) {
  const [showTable, setShowTable] = useState(false);
  const [active, setActive] = useState<ActiveBucket | null>(null);
  const [plotRef, width] = useElementWidth<HTMLDivElement>(640);
  const titleId = useId();
  const unit = bucketSize === "day" ? "day" : "week";

  return (
    <ChartCard
      actions={
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <div aria-label="Group bars by" className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5" role="group">
            {(["day", "week"] as const).map((size) => (
              <button
                aria-pressed={bucketSize === size}
                className={`focus-ring h-8 rounded-md px-3 text-sm font-semibold transition ${
                  bucketSize === size ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
                key={size}
                onClick={() => onBucketSizeChange(size)}
                type="button"
              >
                {size === "day" ? "Days" : "Weeks"}
              </button>
            ))}
          </div>
          <ViewToggle chartIcon={ChartColumnStacked} onChange={setShowTable} showTable={showTable} tableIcon={Table2} />
        </div>
      }
      description={`Spending per ${unit}, split by category. The charts share the time axis; each has its own amount scale.`}
      title="Spending over time"
      titleId={titleId}
    >
      <div className="space-y-6" ref={plotRef}>
        {breakdowns.map((breakdown) => (
          <div data-testid={`timeline-${breakdown.type.toLowerCase()}`} key={breakdown.type}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ backgroundColor: EXPENSE_TYPES[breakdown.type].color }} />
                {EXPENSE_TYPES[breakdown.type].label}
              </h3>
              <p className="text-xs text-slate-500">
                <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(breakdown.total)}</span>
                {" · "}{breakdown.transactionCount} transaction{breakdown.transactionCount === 1 ? "" : "s"}
              </p>
            </div>

            {breakdown.series.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-slate-200 px-4 py-4 text-center text-sm text-slate-500">
                No {EXPENSE_TYPES[breakdown.type].label.toLowerCase()} spending in this {noun}.
              </p>
            ) : (
              <>
                <ul aria-label={`${EXPENSE_TYPES[breakdown.type].label} categories`} className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  {breakdown.series.map((series) => (
                    <li className="inline-flex items-center gap-1.5" key={series.key}>
                      <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ backgroundColor: series.color }} />
                      {series.label}
                      <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(series.total)}</span>
                    </li>
                  ))}
                </ul>
                {showTable ? (
                  <BucketTable breakdown={breakdown} buckets={buckets} unit={unit} />
                ) : (
                  <TypeChart
                    active={active}
                    breakdown={breakdown}
                    buckets={buckets}
                    bucketSize={bucketSize}
                    onActiveChange={setActive}
                    onRelease={(owner) => setActive((current) => (current?.owner === owner ? null : current))}
                    width={width}
                  />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

/** A rectangle with 4px rounded corners on its data end only; the baseline end stays square. */
function roundedTopRect(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

function TypeChart({
  breakdown,
  buckets,
  bucketSize,
  width,
  active,
  onActiveChange,
  onRelease,
}: {
  breakdown: TypeBreakdown;
  buckets: TimeBucket[];
  bucketSize: BucketSize;
  width: number;
  active: ActiveBucket | null;
  onActiveChange: (active: ActiveBucket | null) => void;
  /** Clears the highlight only if this chart still owns it, so moving to another chart keeps the new one. */
  onRelease: (owner: SpendingType) => void;
}) {
  const hintId = useId();
  const label = EXPENSE_TYPES[breakdown.type].label;
  const count = buckets.length;
  const plotWidth = Math.max(1, width - LEFT - RIGHT);
  const band = plotWidth / Math.max(1, count);
  const barWidth = Math.max(2, Math.min(MAX_BAR, band * 0.7));
  const ticks = niceTicks(Math.max(0, ...breakdown.bucketTotals), 2);
  const top = ticks.at(-1) ?? 1;
  const yAt = (value: number) => TOP + PLOT_HEIGHT - (value / top) * PLOT_HEIGHT;
  const labelEvery = Math.max(1, Math.ceil(MIN_LABEL_SPACING / band));
  const activeIndex = active?.index ?? null;
  const showTooltip = active !== null && active.owner === breakdown.type;

  const indexAt = (clientX: number, element: Element) => {
    const offset = clientX - element.getBoundingClientRect().left - LEFT;
    return Math.min(count - 1, Math.max(0, Math.floor(offset / band)));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = activeIndex ?? -1;
    const moves: Record<string, number> = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: count - 1 };
    if (event.key in moves) {
      event.preventDefault();
      onActiveChange({ index: Math.min(count - 1, Math.max(0, current < 0 && event.key === "ArrowLeft" ? count - 1 : moves[event.key])), owner: breakdown.type });
    } else if (event.key === "Escape") {
      onActiveChange(null);
    }
  };

  // Day ticks name the month on the first tick and whenever the month changes between labelled ticks.
  const tickLabel = (bucket: TimeBucket, index: number) => {
    const previous = index >= labelEvery ? buckets[index - labelEvery].start : null;
    const newMonth = previous === null || previous.slice(0, 7) !== bucket.start.slice(0, 7);
    return bucketSize === "week" || newMonth ? formatDayMonth(bucket.start) : String(Number(bucket.start.slice(8)));
  };

  const bucket = activeIndex !== null ? buckets[activeIndex] : null;
  const tooltipLeft = activeIndex !== null ? LEFT + (activeIndex + 0.5) * band : 0;

  return (
    <div
      aria-describedby={hintId}
      aria-label={`${label} spending per ${bucketSize}`}
      className="focus-ring relative mt-2 rounded-lg"
      onBlur={() => onRelease(breakdown.type)}
      onKeyDown={handleKeyDown}
      role="group"
      tabIndex={0}
    >
      <p className="sr-only" id={hintId}>Use the left and right arrow keys to read each {bucketSize}.</p>
      <svg
        aria-hidden="true"
        className="block touch-pan-y select-none"
        height={HEIGHT}
        onPointerDown={(event) => onActiveChange({ index: indexAt(event.clientX, event.currentTarget), owner: breakdown.type })}
        onPointerLeave={(event) => event.pointerType === "mouse" && onRelease(breakdown.type)}
        onPointerMove={(event) => onActiveChange({ index: indexAt(event.clientX, event.currentTarget), owner: breakdown.type })}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        width={width}
      >
        {activeIndex !== null && (
          <rect fill={HIGHLIGHT} height={PLOT_HEIGHT} rx={3} width={band} x={LEFT + activeIndex * band} y={TOP} />
        )}

        {ticks.map((tick) => (
          <g key={tick}>
            <line stroke={tick === 0 ? BASELINE : GRID} strokeWidth={1} x1={LEFT} x2={width - RIGHT} y1={yAt(tick)} y2={yAt(tick)} />
            <text dominantBaseline="middle" fill={INK_MUTED} fontSize={11} style={{ fontVariantNumeric: "tabular-nums" }} textAnchor="end" x={LEFT - 8} y={yAt(tick)}>
              {formatCompactCurrency(tick)}
            </text>
          </g>
        ))}

        {breakdown.amounts.map((amounts, index) => {
          const x = LEFT + index * band + (band - barWidth) / 2;
          const topSeries = amounts.findLastIndex((amount) => amount > 0);
          let running = 0;
          let drawn = 0;
          return amounts.map((amount, seriesIndex) => {
            if (amount <= 0) return null;
            const bottom = yAt(running) - (drawn > 0 ? SEGMENT_GAP : 0);
            running += amount;
            drawn += 1;
            const y = yAt(running);
            const height = Math.max(0.75, bottom - y);
            const color = breakdown.series[seriesIndex].color;
            return seriesIndex === topSeries
              ? <path d={roundedTopRect(x, y, barWidth, height, 4)} fill={color} key={`${index}-${seriesIndex}`} />
              : <rect fill={color} height={height} key={`${index}-${seriesIndex}`} width={barWidth} x={x} y={y} />;
          });
        })}

        {buckets.map((entry, index) => (index % labelEvery === 0 ? (
          <text
            fill={index === activeIndex ? "#0f172a" : INK_MUTED}
            fontSize={11}
            key={entry.start}
            textAnchor={index === 0 && band < 40 ? "start" : "middle"}
            x={index === 0 && band < 40 ? LEFT : LEFT + (index + 0.5) * band}
            y={TOP + PLOT_HEIGHT + 17}
          >
            {tickLabel(entry, index)}
          </text>
        ) : null))}
      </svg>

      {showTooltip && bucket && activeIndex !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-52 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur"
          data-testid={`timeline-tooltip-${breakdown.type.toLowerCase()}`}
          style={tooltipLeft > width / 2 ? { right: width - tooltipLeft + 14 } : { left: tooltipLeft + 14 }}
        >
          <p className="font-semibold text-slate-900">{bucketLabel(bucket)}</p>
          {breakdown.bucketTotals[activeIndex] === 0 ? (
            <p className="mt-1 text-slate-500">No {label.toLowerCase()} spending</p>
          ) : (
            <dl className="mt-2 space-y-1">
              {breakdown.series.map((series, seriesIndex) => breakdown.amounts[activeIndex][seriesIndex] > 0 && (
                <div className="flex items-center justify-between gap-3" key={series.key}>
                  <dt className="flex min-w-0 items-center gap-2 text-slate-500">
                    <span aria-hidden="true" className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: series.color }} />
                    <span className="truncate">{series.label}</span>
                  </dt>
                  <dd className="font-semibold tabular-nums text-slate-900">{formatCurrency(breakdown.amounts[activeIndex][seriesIndex])}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-1">
                <dt className="text-slate-500">Total</dt>
                <dd className="font-semibold tabular-nums text-slate-900">{formatCurrency(breakdown.bucketTotals[activeIndex])}</dd>
              </div>
            </dl>
          )}
        </div>
      )}
    </div>
  );
}

function BucketTable({ breakdown, buckets, unit }: { breakdown: TypeBreakdown; buckets: TimeBucket[]; unit: string }) {
  const label = EXPENSE_TYPES[breakdown.type].label;
  return (
    <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{label} spending per {unit}</caption>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            <th className="px-3 py-2" scope="col">{unit === "day" ? "Day" : "Week"}</th>
            {breakdown.series.map((series) => <th className="px-3 py-2 text-right" key={series.key} scope="col">{series.label}</th>)}
            <th className="px-3 py-2 text-right" scope="col">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {buckets.map((bucket, index) => breakdown.bucketTotals[index] > 0 && (
            <tr key={bucket.start}>
              <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-700" scope="row">{bucketLabel(bucket)}</th>
              {breakdown.amounts[index].map((amount, seriesIndex) => (
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-700" key={breakdown.series[seriesIndex].key}>
                  {amount > 0 ? formatCurrency(amount) : "—"}
                </td>
              ))}
              <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{formatCurrency(breakdown.bucketTotals[index])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
