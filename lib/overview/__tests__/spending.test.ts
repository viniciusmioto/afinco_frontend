import {
  average,
  categoryRows,
  lastPeriods,
  periodName,
  periodTick,
  periodTotals,
  rangeName,
  spendingKpis,
} from "@/lib/overview/spending";
import { monthlySpending, statementSpending } from "@/test/fixtures";

const totals = periodTotals(monthlySpending);

describe("periodTotals", () => {
  it("adds each period's categories into fixed, variable, and occasional spending", () => {
    expect(totals.map((entry) => entry.total)).toEqual([500, 600, 700, 150]);
    expect(totals[2].byType).toEqual({ FIXED: 200, VARIABLE: 450, OCCASIONAL: 50 });
  });

  it("adds in cents and ignores unknown or payment categories", () => {
    const [period] = periodTotals({
      ...monthlySpending,
      categories: [...monthlySpending.categories, { id: 10, name: "Payment", expenseType: "PAYMENT", colorCode: "#10B981" }],
      periods: [{
        ...monthlySpending.periods[0],
        categories: [
          { categoryId: 2, amount: 0.1, transactionCount: 1 },
          { categoryId: 7, amount: 0.2, transactionCount: 1 },
          { categoryId: 10, amount: 900, transactionCount: 1 },
          { categoryId: 404, amount: 5, transactionCount: 1 },
        ],
      }],
    });
    expect(period.total).toBe(0.3);
  });
});

describe("spendingKpis", () => {
  it("averages complete periods only and compares the last complete period with the others", () => {
    const kpis = spendingKpis(totals, null);

    expect(kpis.total).toBe(1950);
    expect(kpis.periodCount).toBe(4);
    expect(kpis.completeCount).toBe(3);
    expect(kpis.averagePerPeriod).toBe(600);
    expect(kpis.highlight?.period.key).toBe("2026-07");
    expect(kpis.changeVsAverage).toBeCloseTo(150 / 550);
    expect(kpis.mix?.FIXED).toBeCloseTo(550 / 1950);
    expect(kpis.mix?.VARIABLE).toBeCloseTo(1200 / 1950);
  });

  it("highlights the selected period", () => {
    expect(spendingKpis(totals, "2026-06")).toEqual(expect.objectContaining({ changeVsAverage: 0 }));
    expect(spendingKpis(totals, "2026-06").highlight?.total).toBe(600);
  });

  it("does not compare a partial period or a period without history", () => {
    expect(spendingKpis(totals, "2026-08").changeVsAverage).toBeNull();
    expect(spendingKpis(totals.slice(0, 1), null).changeVsAverage).toBeNull();
  });

  it("has no mix or average when nothing was spent", () => {
    expect(spendingKpis([], null)).toEqual(expect.objectContaining({ total: 0, averagePerPeriod: null, highlight: null, mix: null }));
  });
});

describe("categoryRows", () => {
  it("ranks categories by spending in the range with their average per complete period", () => {
    const rows = categoryRows(monthlySpending.categories, monthlySpending.periods, null);

    expect(rows.map((row) => row.category.name))
      .toEqual(["Groceries", "Transport", "Occasional", "Subscriptions", "Food & Leisure"]);
    expect(rows[0]).toEqual(expect.objectContaining({ total: 1050, averagePerPeriod: 316.67, selected: null, transactionCount: 8 }));
    expect(rows[0].share).toBeCloseTo(1050 / 1950);
    expect(rows[4].averagePerPeriod).toBe(50);
  });

  it("compares a selected period, counting missing categories as zero", () => {
    const rows = categoryRows(monthlySpending.categories, monthlySpending.periods, monthlySpending.periods[3]);

    expect(rows.map((row) => [row.category.name, row.selected])).toEqual([
      ["Groceries", 100], ["Transport", 50], ["Occasional", 0], ["Subscriptions", 0], ["Food & Leisure", 0],
    ]);
    expect(rows[0].share).toBeCloseTo(100 / 150);
  });
});

describe("labels and ranges", () => {
  it("keeps the most recent periods", () => {
    expect(lastPeriods([1, 2, 3, 4], 3)).toEqual([2, 3, 4]);
    expect(lastPeriods([1, 2], 12)).toEqual([1, 2]);
    expect(lastPeriods([1, 2], "all")).toEqual([1, 2]);
    expect(average([])).toBeNull();
  });

  it("names months and statements", () => {
    const [may] = monthlySpending.periods;
    const [statement] = statementSpending.periods;
    expect(periodName(may, "MONTH")).toBe("May 2026");
    expect(periodTick(may, "MONTH", true)).toBe("May 2026");
    expect(periodTick(monthlySpending.periods[1], "MONTH", false)).toBe("Jun");
    expect(periodName(statement, "STATEMENT")).toBe("Jul 14 – Aug 13, 2026");
    expect(periodTick(statement, "STATEMENT", true)).toBe("Aug 13");
  });

  it("names the covered range", () => {
    expect(rangeName(monthlySpending.periods, "MONTH")).toBe("May – Aug 2026");
    expect(rangeName(monthlySpending.periods.slice(0, 1), "MONTH")).toBe("May 2026");
    expect(rangeName(statementSpending.periods, "STATEMENT")).toBe("Jul 14 – Sep 13, 2026");
    expect(rangeName([], "MONTH")).toBe("");
  });
});

describe("niceTicks", () => {
  it("rounds the axis up to a clean step", () => {
    const { niceTicks } = jest.requireActual("@/lib/overview/spending");
    expect(niceTicks(700)).toEqual([0, 200, 400, 600, 800]);
    expect(niceTicks(1000)).toEqual([0, 250, 500, 750, 1000]);
    expect(niceTicks(38)).toEqual([0, 10, 20, 30, 40]);
    expect(niceTicks(0)).toEqual([0, 50, 100]);
  });
});
