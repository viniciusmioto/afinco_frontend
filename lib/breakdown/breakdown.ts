import { SPENDING_TYPES, type SpendingType } from "@/lib/expense-types";
import { formatDayMonth } from "@/lib/formatters";
import type { Category, Transaction } from "@/lib/types/transaction";

export type BucketSize = "day" | "week";

/** An inclusive run of days on the time axis. */
export interface TimeBucket {
  start: string;
  end: string;
}

const DAY_MS = 86_400_000;
const toTime = (date: string) => Date.parse(`${date}T00:00:00Z`);
const toDate = (time: number) => new Date(time).toISOString().slice(0, 10);
const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (cents: number) => cents / 100;

/**
 * Categorical slots 4–8 of the validated chart palette (adjacent pairs colorblind-safe on white). They avoid
 * the blue, orange, and aqua that identify the expense types themselves.
 */
export const CATEGORY_COLORS = ["#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"] as const;
export const OTHER_CATEGORY_COLOR = "#94a3b8";

/** Every day, or 7-day runs counted from the first day (the last run may be shorter), from `start` to `end`. */
export function timeBuckets(start: string, end: string, size: BucketSize): TimeBucket[] {
  const step = (size === "week" ? 7 : 1) * DAY_MS;
  const last = toTime(end);
  const buckets: TimeBucket[] = [];
  for (let time = toTime(start); time <= last; time += step) {
    buckets.push({ start: toDate(time), end: toDate(Math.min(time + step - DAY_MS, last)) });
  }
  return buckets;
}

/** `Jul 12`, or `Jul 8 – 14` / `Jul 29 – Aug 4` for a run of days. */
export function bucketLabel(bucket: TimeBucket): string {
  if (bucket.start === bucket.end) return formatDayMonth(bucket.start);
  const start = formatDayMonth(bucket.start);
  const end = formatDayMonth(bucket.end);
  return start.slice(0, 3) === end.slice(0, 3) ? `${start} – ${end.slice(4)}` : `${start} – ${end}`;
}

/** Inclusive number of days in a date range. */
export function dayCount(start: string, end: string): number {
  return Math.round((toTime(end) - toTime(start)) / DAY_MS) + 1;
}

/** The period's bounds, widened to rows dated outside it (a statement can carry late postings). */
export function coveredRange(start: string, end: string, transactions: Pick<Transaction, "date">[]) {
  return transactions.reduce(
    (range, { date }) => ({ start: date < range.start ? date : range.start, end: date > range.end ? date : range.end }),
    { start, end },
  );
}

/** Spending only: card payments and credits move money between accounts rather than spend it. */
export function spendingRows(transactions: Transaction[]): Transaction[] {
  return transactions.filter((transaction) => transaction.category.expenseType !== "PAYMENT");
}

export interface CategorySeries {
  key: string;
  label: string;
  color: string;
  categoryIds: number[];
  total: number;
}

export interface TypeBreakdown {
  type: SpendingType;
  total: number;
  transactionCount: number;
  /** Categories with spending in the period, in their fixed palette order. */
  series: CategorySeries[];
  /** `amounts[bucket][series]`. */
  amounts: number[][];
  bucketTotals: number[];
  /** The three largest expenses, biggest first. */
  top: Transaction[];
}

/**
 * A type's categories take palette slots in id order, so a category keeps its color in every period and a
 * filter never repaints it. Categories beyond the palette fold into "Other".
 */
export function categorySlots(categories: Category[], type: SpendingType): Omit<CategorySeries, "total">[] {
  const ofType = categories.filter((category) => category.expenseType === type).sort((left, right) => left.id - right.id);
  const fits = ofType.length <= CATEGORY_COLORS.length;
  const named = fits ? ofType : ofType.slice(0, CATEGORY_COLORS.length - 1);
  const slots = named.map((category, index) => ({
    key: String(category.id),
    label: category.name,
    color: CATEGORY_COLORS[index] as string,
    categoryIds: [category.id],
  }));
  if (!fits) {
    slots.push({
      key: "other",
      label: "Other",
      color: OTHER_CATEGORY_COLOR,
      categoryIds: ofType.slice(named.length).map((category) => category.id),
    });
  }
  return slots;
}

/** Largest amounts first; ties go to the earlier date. */
export function largestExpenses(transactions: Transaction[], count: number): Transaction[] {
  return [...transactions]
    .sort((left, right) => right.amount - left.amount || left.date.localeCompare(right.date) || left.id - right.id)
    .slice(0, count);
}

/** Per expense type: totals, category amounts per time bucket, and the largest expenses. */
export function typeBreakdowns(transactions: Transaction[], categories: Category[], buckets: TimeBucket[]): TypeBreakdown[] {
  const rows = spendingRows(transactions);
  const known = new Map(categories.map((category) => [category.id, category]));
  for (const row of rows) {
    if (!known.has(row.category.id)) known.set(row.category.id, row.category);
  }
  const starts = buckets.map((bucket) => toTime(bucket.start));
  const bucketOf = (date: string) => {
    const time = toTime(date);
    let index = starts.length - 1;
    while (index > 0 && starts[index] > time) index -= 1;
    return index;
  };

  return SPENDING_TYPES.map((type) => {
    const slots = categorySlots([...known.values()], type);
    const typeRows = rows.filter((row) => row.category.expenseType === type);
    const cents = buckets.map(() => slots.map(() => 0));
    const seriesCents = slots.map(() => 0);
    for (const row of typeRows) {
      const slot = slots.findIndex((candidate) => candidate.categoryIds.includes(row.category.id));
      cents[bucketOf(row.date)][slot] += toCents(row.amount);
      seriesCents[slot] += toCents(row.amount);
    }
    const present = slots.map((_, index) => index).filter((index) => seriesCents[index] > 0);

    return {
      type,
      total: fromCents(seriesCents.reduce((sum, value) => sum + value, 0)),
      transactionCount: typeRows.length,
      series: present.map((index) => ({ ...slots[index], total: fromCents(seriesCents[index]) })),
      amounts: cents.map((bucket) => present.map((index) => fromCents(bucket[index]))),
      bucketTotals: cents.map((bucket) => fromCents(present.reduce((sum, index) => sum + bucket[index], 0))),
      top: largestExpenses(typeRows, 3),
    };
  });
}
