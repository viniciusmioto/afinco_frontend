import { readBankParam } from "@/lib/banks";
import type { SpendingGrouping } from "@/lib/types/analytics";
import type { Statement } from "@/lib/types/statement";

export type OverviewGroup = "month" | "statement";

/** How many of the most recent periods the dashboard covers. */
export const RANGE_OPTIONS = [3, 6, 12, "all"] as const;
export type OverviewRange = (typeof RANGE_OPTIONS)[number];

export interface OverviewParams {
  group: OverviewGroup;
  /** Null combines every bank, which only the month grouping allows. */
  bank: string | null;
  range: OverviewRange;
  /** Key of the period selected on the trend chart, if any. */
  period: string | null;
}

export const DEFAULT_RANGE: OverviewRange = 12;

export function readOverviewParams(params: Pick<URLSearchParams, "get">): OverviewParams {
  const range = params.get("range");
  const period = params.get("period")?.trim();
  return {
    group: params.get("group") === "statement" ? "statement" : "month",
    bank: readBankParam(params.get("bank")),
    range: RANGE_OPTIONS.find((option) => String(option) === range) ?? DEFAULT_RANGE,
    period: period && period.length <= 20 ? period : null,
  };
}

export function overviewSearch({ group, bank, range, period }: OverviewParams): string {
  const params = new URLSearchParams({ group });
  if (bank) params.set("bank", bank);
  params.set("range", String(range));
  if (period) params.set("period", period);
  return params.toString();
}

export function toSpendingGrouping(group: OverviewGroup): SpendingGrouping {
  return group === "statement" ? "STATEMENT" : "MONTH";
}

/**
 * The bank the dashboard shows. Months accept any known bank or every bank; statements need one bank, so
 * they fall back to the bank of the newest statement (`statements` arrive newest first).
 */
export function resolveOverviewBank(params: OverviewParams, banks: string[], statements: Statement[]): string | null {
  if (params.group === "month") {
    return params.bank && banks.includes(params.bank) ? params.bank : null;
  }
  return statements.find((statement) => statement.account.bankName === params.bank)?.account.bankName
    ?? statements[0]?.account.bankName
    ?? null;
}
