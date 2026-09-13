"use client";

import { AlertCircle, ChartNoAxesCombined, RefreshCw, Upload } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSpending } from "@/lib/api/analytics";
import { getStatements } from "@/lib/api/statements";
import { getAccounts } from "@/lib/api/transactions";
import { distinctBanks } from "@/lib/banks";
import {
  overviewSearch,
  readOverviewParams,
  resolveOverviewBank,
  toSpendingGrouping,
  type OverviewParams,
} from "@/lib/overview/params";
import {
  categoryRows,
  lastPeriods,
  periodName,
  periodTotals,
  rangeName,
  spendingKpis,
} from "@/lib/overview/spending";
import type { SpendingOverview } from "@/lib/types/analytics";
import type { Statement } from "@/lib/types/statement";
import type { Account } from "@/lib/types/transaction";
import { CategoryComparison } from "./category-comparison";
import { OverviewFilters } from "./overview-filters";
import { OverviewKpis } from "./overview-kpis";
import { SpendingTrendChart } from "./spending-trend-chart";

interface Catalog {
  accounts: Account[];
  statements: Statement[];
}

interface LoadedSpending {
  key: string;
  overview: SpendingOverview;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function OverviewPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = useMemo(() => readOverviewParams(searchParams), [searchParams]);

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [spending, setSpending] = useState<LoadedSpending | null>(null);
  const [spendingError, setSpendingError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogError(null);
    Promise.all([getAccounts(controller.signal), getStatements(controller.signal)])
      .then(([accounts, statements]) => setCatalog({ accounts, statements }))
      .catch((error: unknown) => {
        if (!isAbort(error)) setCatalogError(errorMessage(error, "The overview could not be loaded"));
      });
    return () => controller.abort();
  }, [catalogVersion]);

  const banks = useMemo(() => (catalog ? distinctBanks(catalog.accounts) : []), [catalog]);
  const statementBanks = useMemo(() => (catalog ? distinctBanks(catalog.statements.map((statement) => statement.account)) : []), [catalog]);
  const bank = catalog ? resolveOverviewBank(requested, banks, catalog.statements) : null;
  const params: OverviewParams = { ...requested, bank };
  const canLoad = Boolean(catalog) && (params.group === "month" || bank !== null);
  // Identifies which grouping and bank the loaded figures belong to.
  const spendingKey = JSON.stringify([params.group, bank]);

  const navigate = useCallback(
    (next: OverviewParams) => router.replace(`${pathname}?${overviewSearch(next)}`, { scroll: false }),
    [pathname, router],
  );

  // Keep the URL canonical so a refresh or shared link reopens the same view.
  const canonical = catalog ? overviewSearch(params) : null;
  useEffect(() => {
    if (canonical !== null && searchParams.toString() !== canonical) {
      router.replace(`${pathname}?${canonical}`, { scroll: false });
    }
  }, [canonical, searchParams, router, pathname]);

  const group = params.group;
  useEffect(() => {
    if (!canLoad) return;
    const key = spendingKey;
    const controller = new AbortController();
    setSpendingError(null);
    getSpending(toSpendingGrouping(group), bank, controller.signal)
      .then((overview) => setSpending({ key, overview }))
      .catch((error: unknown) => {
        if (!isAbort(error)) setSpendingError(errorMessage(error, "Spending could not be loaded"));
      });
    return () => controller.abort();
  }, [canLoad, group, bank, spendingKey, reloadToken]);

  const overview = spending?.overview ?? null;
  const refreshing = spending !== null && spending.key !== spendingKey;
  const derived = useMemo(() => {
    if (!overview) return null;
    const totals = lastPeriods(periodTotals(overview), requested.range);
    const periods = totals.map((entry) => entry.period);
    const selected = periods.find((period) => period.key === requested.period) ?? null;
    return {
      totals,
      periods,
      selected,
      kpis: spendingKpis(totals, selected?.key ?? null),
      rows: categoryRows(overview.categories, periods, selected),
      rangeName: rangeName(periods, overview.groupBy),
    };
  }, [overview, requested.range, requested.period]);

  return (
    <>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800">Spending analytics</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Overview</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          How your spending evolves and where it goes. Card payments move money between accounts, so they are
          not counted as spending.
        </p>
      </div>

      {catalogError ? (
        <div className="mt-7"><ErrorState message={catalogError} onRetry={() => setCatalogVersion((version) => version + 1)} /></div>
      ) : !catalog ? (
        <div className="mt-7"><LoadingState /></div>
      ) : (
        <>
          <div className="mt-7">
            <OverviewFilters
              bank={bank}
              banks={banks}
              group={params.group}
              onBankChange={(nextBank) => navigate({ ...params, bank: nextBank, period: null })}
              onGroupChange={(group) => group !== params.group && navigate({ ...params, group, period: null })}
              onRangeChange={(range) => navigate({ ...params, range })}
              range={params.range}
              statementBanks={statementBanks}
            />
          </div>

          {params.group === "statement" && catalog.statements.length === 0 ? (
            <EmptyState
              action={<button className="focus-ring rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => navigate({ ...params, group: "month", period: null })} type="button">View by month</button>}
              message="Statements appear here once you import them. Months also include manual entries."
              title="No imported statements yet"
            />
          ) : spendingError ? (
            <div className="mt-5"><ErrorState message={spendingError} onRetry={() => setReloadToken((token) => token + 1)} /></div>
          ) : !overview || !derived ? (
            <div className="mt-5"><LoadingState /></div>
          ) : derived.totals.length === 0 && !refreshing ? (
            <EmptyState
              message="Import statements or add transactions to see how your spending evolves."
              title="No spending to analyze yet"
            />
          ) : (
            <div aria-busy={refreshing} className={`transition-opacity ${refreshing ? "opacity-60" : ""}`}>
              <div className="mt-5">
                <OverviewKpis groupBy={overview.groupBy} kpis={derived.kpis} rangeName={derived.rangeName} selected={derived.selected !== null} />
              </div>
              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
                <SpendingTrendChart
                  groupBy={overview.groupBy}
                  onSelect={(period) => navigate({ ...params, period })}
                  selectedKey={derived.selected?.key ?? null}
                  totals={derived.totals}
                />
                <CategoryComparison
                  groupBy={overview.groupBy}
                  rangeName={derived.rangeName}
                  rows={derived.rows}
                  selectedName={derived.selected ? periodName(derived.selected, overview.groupBy) : null}
                />
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="mt-5 grid min-h-72 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
          <ChartNoAxesCombined aria-hidden="true" className="size-5" />
        </span>
        <h2 className="mt-4 font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{message}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link className="focus-ring inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white" href="/upload">
            <Upload aria-hidden="true" className="size-4" />
            Import statements
          </Link>
          {action}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div aria-label="Loading overview" className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div className="h-28 animate-pulse rounded-2xl bg-slate-200/70" key={item} />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200/70" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200/70" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center" role="alert">
      <AlertCircle aria-hidden="true" className="size-7 text-red-700" />
      <p className="mt-3 font-semibold text-red-950">Could not load the overview</p>
      <p className="mt-1 text-sm text-red-800">{message}</p>
      <button className="focus-ring mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-800 shadow-sm" onClick={onRetry} type="button">
        <RefreshCw aria-hidden="true" className="size-4" /> Retry
      </button>
    </div>
  );
}
