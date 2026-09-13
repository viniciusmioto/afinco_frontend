import { overviewSearch, readOverviewParams, resolveOverviewBank } from "@/lib/overview/params";
import type { Statement } from "@/lib/types/statement";
import { statements } from "@/test/fixtures";

describe("overview params", () => {
  it("reads defaults and valid values", () => {
    expect(readOverviewParams(new URLSearchParams(""))).toEqual({ group: "month", bank: null, range: 12, period: null });
    expect(readOverviewParams(new URLSearchParams("group=statement&bank=TD+Bank&range=all&period=12")))
      .toEqual({ group: "statement", bank: "TD Bank", range: "all", period: "12" });
    expect(readOverviewParams(new URLSearchParams("group=year&range=5")).range).toBe(12);
  });

  it("writes a canonical search string", () => {
    expect(overviewSearch({ group: "month", bank: null, range: 6, period: null })).toBe("group=month&range=6");
    expect(overviewSearch({ group: "statement", bank: "TD Bank", range: "all", period: "12" }))
      .toBe("group=statement&bank=TD+Bank&range=all&period=12");
  });

  it("lets months combine every bank but gives statements one bank", () => {
    const rbc: Statement = { ...statements[0], id: 30, account: { ...statements[0].account, id: 8, bankName: "RBC" } };
    const params = { group: "month" as const, bank: "Unknown", range: 12 as const, period: null };

    expect(resolveOverviewBank(params, ["RBC", "TD Bank"], statements)).toBeNull();
    expect(resolveOverviewBank({ ...params, bank: "RBC" }, ["RBC", "TD Bank"], statements)).toBe("RBC");
    expect(resolveOverviewBank({ ...params, group: "statement", bank: null }, [], statements)).toBe("TD Bank");
    expect(resolveOverviewBank({ ...params, group: "statement", bank: "RBC" }, [], [...statements, rbc])).toBe("RBC");
    expect(resolveOverviewBank({ ...params, group: "statement" }, [], [])).toBeNull();
  });
});
