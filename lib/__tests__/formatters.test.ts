import { formatMonth, formatPeriod } from "@/lib/formatters";

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
