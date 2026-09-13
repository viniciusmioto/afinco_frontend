import {
  monthBounds,
  neighbours,
  readRequestedScope,
  resolveBank,
  resolveScope,
  scopeFromKey,
  scopeKey,
  scopeToSearch,
  statementsOfBank,
  switchBank,
  switchView,
} from "@/lib/transactions/scope";
import type { Statement } from "@/lib/types/statement";
import { months, statements } from "@/test/fixtures";

const none = { view: null, statementId: null, month: null, bank: null };
const banks = ["RBC", "TD Bank"];
const rbcStatement: Statement = {
  ...statements[1],
  id: 20,
  account: { id: 9, bankName: "RBC", accountNumberLast4: "7310", currency: "CAD" },
  periodStart: "2026-07-01",
  periodEnd: "2026-07-31",
};
const twoBanks = [statements[0], statements[1], rbcStatement];

describe("readRequestedScope", () => {
  it("reads a valid view, statement id, month, and bank", () => {
    expect(readRequestedScope(new URLSearchParams("view=month&month=2026-02&statement=3&bank=TD+Bank")))
      .toEqual({ view: "month", statementId: 3, month: "2026-02", bank: "TD Bank" });
  });

  it("drops malformed values", () => {
    expect(readRequestedScope(new URLSearchParams("view=year&statement=abc&month=2026-13&bank=%20"))).toEqual(none);
  });
});

describe("resolveScope", () => {
  it("defaults to the newest statement and its bank", () => {
    expect(resolveScope(none, statements, months, banks)).toEqual({
      view: "statement",
      bank: "TD Bank",
      scope: { view: "statement", statementId: 12 },
    });
  });

  it("falls back to the newest statement when the requested one no longer exists", () => {
    expect(resolveScope({ ...none, view: "statement", statementId: 99 }, statements, months, banks).scope)
      .toEqual({ view: "statement", statementId: 12 });
  });

  it("opens the newest statement of the requested bank", () => {
    expect(resolveScope({ ...none, view: "statement", bank: "RBC" }, twoBanks, months, banks))
      .toEqual({ view: "statement", bank: "RBC", scope: { view: "statement", statementId: 20 } });
  });

  it("takes the bank from the statement, not from the URL", () => {
    expect(resolveBank({ ...none, view: "statement", statementId: 20, bank: "TD Bank" }, twoBanks, banks)).toBe("RBC");
  });

  it("defaults the month view to every bank and the newest month with activity", () => {
    expect(resolveScope({ ...none, view: "month" }, statements, months, banks))
      .toEqual({ view: "month", bank: null, scope: { view: "month", month: "2026-09", bank: null } });
  });

  it("limits a month to a known bank and ignores unknown ones", () => {
    expect(resolveScope({ ...none, view: "month", bank: "RBC" }, statements, months, banks).scope)
      .toEqual({ view: "month", month: "2026-09", bank: "RBC" });
    expect(resolveBank({ ...none, view: "month", bank: "Nowhere" }, statements, banks)).toBeNull();
  });

  it("keeps an explicitly requested month even without activity", () => {
    expect(resolveScope({ ...none, view: "month", month: "2025-01" }, statements, months, banks).scope)
      .toEqual({ view: "month", month: "2025-01", bank: null });
  });

  it("opens by month when there are manual transactions but no statements", () => {
    expect(resolveScope(none, [], months, banks))
      .toEqual({ view: "month", bank: null, scope: { view: "month", month: "2026-09", bank: null } });
  });

  it("has nothing to show on an empty ledger", () => {
    expect(resolveScope(none, [], [], [])).toEqual({ view: "month", bank: null, scope: null });
  });
});

describe("switchView", () => {
  it("maps a statement to the month its period ends in, keeping its bank", () => {
    const current = resolveScope({ ...none, view: "statement", statementId: 11 }, statements, months, banks);
    expect(switchView(current, "month", statements, months))
      .toEqual({ view: "month", statementId: null, month: "2026-08", bank: "TD Bank" });
  });

  it("maps a month to the bank's statement ending in it", () => {
    const current = resolveScope({ ...none, view: "month", month: "2026-08", bank: "TD Bank" }, statements, months, banks);
    expect(switchView(current, "statement", statements, months))
      .toEqual({ view: "statement", statementId: 11, month: null, bank: "TD Bank" });
  });

  it("falls back to the default when there is no counterpart", () => {
    const current = resolveScope({ ...none, view: "month", month: "2026-01" }, statements, months, banks);
    expect(switchView(current, "statement", statements, months).statementId).toBeNull();
  });
});

describe("switchBank", () => {
  it("opens the newest statement of another bank", () => {
    const current = resolveScope(none, twoBanks, months, banks);
    const next = switchBank(current, "RBC");
    expect(resolveScope(next, twoBanks, months, banks).scope).toEqual({ view: "statement", statementId: 20 });
  });

  it("keeps the month when changing a month's bank", () => {
    const current = resolveScope({ ...none, view: "month", month: "2026-07" }, statements, months, banks);
    expect(switchBank(current, "TD Bank")).toEqual({ view: "month", statementId: null, month: "2026-07", bank: "TD Bank" });
  });
});

describe("helpers", () => {
  it("computes inclusive month bounds, including leap years", () => {
    expect(monthBounds("2024-02")).toEqual({ startDate: "2024-02-01", endDate: "2024-02-29" });
    expect(monthBounds("2026-12")).toEqual({ startDate: "2026-12-01", endDate: "2026-12-31" });
  });

  it("round-trips a scope through its key", () => {
    const scope = { view: "month", month: "2026-08", bank: "TD Bank" } as const;
    expect(scopeToSearch(scope)).toBe("view=month&month=2026-08&bank=TD+Bank");
    expect(scopeFromKey(scopeKey(scope))).toEqual(scope);
    expect(scopeFromKey(scopeKey(null))).toBeNull();
  });

  it("filters statements by bank", () => {
    expect(statementsOfBank(twoBanks, "RBC")).toEqual([rbcStatement]);
    expect(statementsOfBank(twoBanks, null)).toBe(twoBanks);
  });

  it("finds older and newer neighbours in a newest-first list", () => {
    expect(neighbours(["sep", "aug", "jul"], 1)).toEqual({ older: "jul", newer: "sep" });
    expect(neighbours(["sep"], 0)).toEqual({ older: null, newer: null });
    expect(neighbours(["sep"], -1)).toEqual({ older: null, newer: null });
  });
});
