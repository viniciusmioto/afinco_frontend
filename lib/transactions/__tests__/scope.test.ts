import {
  monthBounds,
  neighbours,
  readRequestedScope,
  resolveScope,
  scopeFromKey,
  scopeKey,
  switchView,
} from "@/lib/transactions/scope";
import { months, statements } from "@/test/fixtures";

const none = { view: null, statementId: null, month: null };

describe("readRequestedScope", () => {
  it("reads a valid view, statement id, and month", () => {
    expect(readRequestedScope(new URLSearchParams("view=month&month=2026-02&statement=3")))
      .toEqual({ view: "month", statementId: 3, month: "2026-02" });
  });

  it("drops malformed values", () => {
    expect(readRequestedScope(new URLSearchParams("view=year&statement=abc&month=2026-13"))).toEqual(none);
  });
});

describe("resolveScope", () => {
  it("defaults to the newest statement", () => {
    expect(resolveScope(none, statements, months)).toEqual({ view: "statement", scope: { view: "statement", statementId: 12 } });
  });

  it("falls back to the newest statement when the requested one no longer exists", () => {
    expect(resolveScope({ ...none, view: "statement", statementId: 99 }, statements, months).scope)
      .toEqual({ view: "statement", statementId: 12 });
  });

  it("defaults the month view to the newest month with activity", () => {
    expect(resolveScope({ ...none, view: "month" }, statements, months).scope).toEqual({ view: "month", month: "2026-09" });
  });

  it("keeps an explicitly requested month even without activity", () => {
    expect(resolveScope({ ...none, view: "month", month: "2025-01" }, statements, months).scope)
      .toEqual({ view: "month", month: "2025-01" });
  });

  it("opens by month when there are manual transactions but no statements", () => {
    expect(resolveScope(none, [], months)).toEqual({ view: "month", scope: { view: "month", month: "2026-09" } });
  });

  it("has nothing to show on an empty ledger", () => {
    expect(resolveScope(none, [], [])).toEqual({ view: "statement", scope: null });
  });
});

describe("switchView", () => {
  it("maps a statement to the month its period ends in", () => {
    expect(switchView({ view: "statement", statementId: 11 }, "month", statements, months))
      .toEqual({ view: "month", statementId: null, month: "2026-08" });
  });

  it("maps a month to the statement ending in it", () => {
    expect(switchView({ view: "month", month: "2026-08" }, "statement", statements, months))
      .toEqual({ view: "statement", statementId: 11, month: null });
  });

  it("falls back to the default when there is no counterpart", () => {
    expect(switchView({ view: "month", month: "2026-01" }, "statement", statements, months).statementId).toBeNull();
  });
});

describe("helpers", () => {
  it("computes inclusive month bounds, including leap years", () => {
    expect(monthBounds("2024-02")).toEqual({ startDate: "2024-02-01", endDate: "2024-02-29" });
    expect(monthBounds("2026-12")).toEqual({ startDate: "2026-12-01", endDate: "2026-12-31" });
  });

  it("round-trips a scope through its key", () => {
    const scope = { view: "month", month: "2026-08" } as const;
    expect(scopeFromKey(scopeKey(scope))).toEqual(scope);
    expect(scopeFromKey(scopeKey(null))).toBeNull();
  });

  it("finds older and newer neighbours in a newest-first list", () => {
    expect(neighbours(["sep", "aug", "jul"], 1)).toEqual({ older: "jul", newer: "sep" });
    expect(neighbours(["sep"], 0)).toEqual({ older: null, newer: null });
    expect(neighbours(["sep"], -1)).toEqual({ older: null, newer: null });
  });
});
