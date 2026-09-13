import {
  bucketLabel,
  CATEGORY_COLORS,
  categorySlots,
  coveredRange,
  dayCount,
  largestExpenses,
  OTHER_CATEGORY_COLOR,
  timeBuckets,
  typeBreakdowns,
} from "@/lib/breakdown/breakdown";
import { averageOfOtherPeriods, periodTotals } from "@/lib/overview/spending";
import type { Category, Transaction } from "@/lib/types/transaction";
import { monthlySpending, transactions } from "@/test/fixtures";

const category = (id: number, name: string, expenseType: Category["expenseType"]): Category =>
  ({ id, name, expenseType, colorCode: "#000000" });

const rent = category(3, "Rent", "FIXED");
const phone = category(11, "Phone & Internet", "FIXED");
const groceries = category(1, "Groceries", "VARIABLE");
const payment = category(9, "Payment", "PAYMENT");
const catalog = [groceries, rent, phone, payment, category(8, "Occasional", "OCCASIONAL")];

let nextId = 100;
const row = (date: string, amount: number, rowCategory: Category, description = "Row"): Transaction => ({
  ...transactions[0],
  id: nextId++,
  date,
  amount,
  category: rowCategory,
  description,
});

describe("time buckets", () => {
  it("splits a period into days or 7-day runs from its first day", () => {
    expect(timeBuckets("2026-07-30", "2026-08-02", "day").map((bucket) => bucket.start))
      .toEqual(["2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02"]);
    expect(timeBuckets("2026-07-01", "2026-07-31", "week")).toEqual([
      { start: "2026-07-01", end: "2026-07-07" },
      { start: "2026-07-08", end: "2026-07-14" },
      { start: "2026-07-15", end: "2026-07-21" },
      { start: "2026-07-22", end: "2026-07-28" },
      { start: "2026-07-29", end: "2026-07-31" },
    ]);
  });

  it("labels days and runs of days", () => {
    expect(bucketLabel({ start: "2026-07-12", end: "2026-07-12" })).toBe("Jul 12");
    expect(bucketLabel({ start: "2026-07-08", end: "2026-07-14" })).toBe("Jul 8 – 14");
    expect(bucketLabel({ start: "2026-07-29", end: "2026-08-04" })).toBe("Jul 29 – Aug 4");
  });

  it("counts days and widens a period to late postings", () => {
    expect(dayCount("2026-07-14", "2026-08-13")).toBe(31);
    expect(coveredRange("2026-02-03", "2026-02-13", [{ date: "2026-01-30" }, { date: "2026-02-05" }]))
      .toEqual({ start: "2026-01-30", end: "2026-02-13" });
  });
});

describe("categorySlots", () => {
  it("gives a type's categories palette slots in id order, whatever the period contains", () => {
    expect(categorySlots(catalog, "FIXED").map((slot) => [slot.label, slot.color]))
      .toEqual([["Rent", CATEGORY_COLORS[0]], ["Phone & Internet", CATEGORY_COLORS[1]]]);
  });

  it("folds categories beyond the palette into Other", () => {
    const many = Array.from({ length: 7 }, (_, index) => category(index + 1, `Fixed ${index + 1}`, "FIXED"));
    const slots = categorySlots(many, "FIXED");

    expect(slots).toHaveLength(CATEGORY_COLORS.length);
    expect(slots.at(-1)).toEqual({ key: "other", label: "Other", color: OTHER_CATEGORY_COLOR, categoryIds: [5, 6, 7] });
  });
});

describe("typeBreakdowns", () => {
  const rows = [
    row("2026-07-01", 1450, rent, "Monthly rent"),
    row("2026-07-02", 40.24, phone, "VESTA *CHATR"),
    row("2026-07-02", 0.1, groceries),
    row("2026-07-09", 0.2, groceries),
    row("2026-07-09", 500, payment, "PAYMENT - THANK YOU"),
  ];

  it("stacks each type's categories per bucket and leaves payments out", () => {
    const [fixed, variable, occasional] = typeBreakdowns(rows, catalog, timeBuckets("2026-07-01", "2026-07-14", "week"));

    expect(fixed).toEqual(expect.objectContaining({ type: "FIXED", total: 1490.24, transactionCount: 2 }));
    expect(fixed.series.map((series) => [series.label, series.total])).toEqual([["Rent", 1450], ["Phone & Internet", 40.24]]);
    expect(fixed.amounts).toEqual([[1450, 40.24], [0, 0]]);
    expect(variable.bucketTotals).toEqual([0.1, 0.2]);
    expect(variable.total).toBe(0.3);
    expect(occasional).toEqual(expect.objectContaining({ total: 0, series: [], transactionCount: 0 }));
    expect(occasional.amounts).toEqual([[], []]);
  });

  it("keeps the three largest expenses of each type", () => {
    const [, variable] = typeBreakdowns(
      [row("2026-07-03", 20, groceries, "b"), row("2026-07-01", 20, groceries, "a"), row("2026-07-02", 90, groceries, "c"), row("2026-07-04", 5, groceries, "d")],
      catalog,
      timeBuckets("2026-07-01", "2026-07-31", "day"),
    );

    expect(variable.top.map((expense) => expense.description)).toEqual(["c", "a", "b"]);
    expect(largestExpenses([], 3)).toEqual([]);
  });

  it("files rows outside the buckets into the nearest edge bucket", () => {
    const [fixed] = typeBreakdowns([row("2026-06-30", 10, rent)], catalog, timeBuckets("2026-07-01", "2026-07-02", "day"));
    expect(fixed.bucketTotals).toEqual([10, 0]);
  });
});

describe("averageOfOtherPeriods", () => {
  it("averages the other complete periods per type", () => {
    const totals = periodTotals(monthlySpending);

    expect(averageOfOtherPeriods(totals, "2026-07")).toEqual({
      total: 550,
      byType: { FIXED: 150, VARIABLE: 325, OCCASIONAL: 75 },
      periodCount: 2,
    });
    expect(averageOfOtherPeriods(totals.slice(0, 1), "2026-05")).toBeNull();
  });
});
