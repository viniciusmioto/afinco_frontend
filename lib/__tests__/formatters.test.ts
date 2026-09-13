import {
  formatCompactCurrency,
  formatDayMonth,
  formatMonth,
  formatPercent,
  formatPeriod,
  formatShortMonth,
} from "@/lib/formatters";

describe("formatMonth", () => {
  it("names the calendar month and year", () => {
    expect(formatMonth("2026-02")).toBe("February 2026");
  });
});

describe("formatPeriod", () => {
  it("shows the year once for a period inside one year", () => {
    expect(formatPeriod("2026-02-03", "2026-02-13")).toBe("Feb 3 – Feb 13, 2026");
  });

  it("shows both years when a period crosses New Year", () => {
    expect(formatPeriod("2025-12-16", "2026-01-15")).toBe("Dec 16, 2025 – Jan 15, 2026");
  });
});

describe("chart formatters", () => {
  it("keeps small amounts whole and compacts thousands", () => {
    expect(formatCompactCurrency(950)).toBe("$950");
    expect(formatCompactCurrency(1250)).toBe("$1.3K");
    expect(formatCompactCurrency(0)).toBe("$0");
  });

  it("formats ratios, short months, and days", () => {
    expect(formatPercent(0.4231)).toBe("42%");
    expect(formatShortMonth("2026-07")).toBe("Jul");
    expect(formatShortMonth("2026-07", true)).toBe("Jul 2026");
    expect(formatDayMonth("2026-08-13")).toBe("Aug 13");
  });
});
