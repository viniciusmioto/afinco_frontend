"use client";

import { AlertCircle, ArrowLeftRight, ChartColumnStacked, RefreshCw, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TransactionScopeBar } from "@/components/transactions/transaction-scope-bar";
import { usePeriodScope } from "@/components/transactions/use-period-scope";
import { getSpending } from "@/lib/api/analytics";
import { getTransactions } from "@/lib/api/transactions";
import { coveredRange, dayCount, timeBuckets, typeBreakdowns, type BucketSize } from "@/lib/breakdown/breakdown";
import { formatMonth, formatPeriod } from "@/lib/formatters";
import { averageOfOtherPeriods, periodTotals } from "@/lib/overview/spending";
import { monthBounds, type TransactionScope } from "@/lib/transactions/scope";
import type { SpendingOverview } from "@/lib/types/analytics";
import type { PageResponse, Transaction } from "@/lib/types/transaction";
import { PeriodSummary } from "./period-summary";
import { SpendingTimeline } from "./spending-timeline";
import { TopExpenses } from "./top-expenses";

interface LoadedSpending {
  key: string;
  overview: SpendingOverview;
}

interface LoadedPeriod {
  key: string;
  scope: TransactionScope;
  page: PageResponse<Transaction>;
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

/** One statement or one month in detail: how spending splits by type, when it happened, and the largest expenses. */
export function BreakdownPage() {
  const {
    catalog,
    catalogError,
    reloadCatalog,
    banks,
    months,
    resolved,
    scopeKey,
    stableScope,
    goToScope,
    changeView,
    changeBank,
  } = usePeriodScope("The breakdown could not be loaded");

  // The last loaded period stays on screen, dimmed, while the next one loads.
  const [loaded, setLoaded] = useState<LoadedPeriod | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [spending, setSpending] = useState<LoadedSpending | null>(null);
  const [bucketSize, setBucketSize] = useState<BucketSize>("day");

  // Pending duplicates are not counted, matching the Overview.
  useEffect(() => {
    if (!stableScope) {
      setLoaded(null);
      return;
    }
    const key = scopeKey;
    const scope = stableScope;
    const controller = new AbortController();
    setLoadError(null);
    getTransactions(scope, controller.signal, "CONFIRMED")
      .then((page) => setLoaded({ key, scope, page }))
      .catch((error: unknown) => {
        if (!isAbort(error)) setLoadError(error instanceof Error ? error.message : "Transactions could not be loaded");
      });
    return () => controller.abort();
  }, [stableScope, scopeKey, reloadToken]);

  // Other periods of the same kind and bank give the usual level to compare with. Without it the page still works.
  const view = resolved?.view ?? null;
  const bank = resolved?.bank ?? null;
  const spendingKey = JSON.stringify([view, bank]);
  useEffect(() => {
    if (!view || (view === "statement" && !bank)) return;
    const key = spendingKey;
    const controller = new AbortController();
    getSpending(view === "statement" ? "STATEMENT" : "MONTH", bank, controller.signal)
      .then((overview) => setSpending({ key, overview }))
      .catch(() => undefined);
    return () => controller.abort();
  }, [view, bank, spendingKey]);

  const analysis = useMemo(() => {
    if (!catalog || !loaded) return null;
    const { scope, page } = loaded;
    const statement = scope.view === "statement"
      ? catalog.statements.find((candidate) => candidate.id === scope.statementId)
      : undefined;
    const bounds = scope.view === "month"
      ? (({ startDate, endDate }) => ({ start: startDate, end: endDate }))(monthBounds(scope.month))
      : statement ? { start: statement.periodStart, end: statement.periodEnd } : null;
    if (!bounds) return null;
    const range = coveredRange(bounds.start, bounds.end, page.content);
    const buckets = timeBuckets(range.start, range.end, bucketSize);
    const periodKey = scope.view === "month" ? scope.month : String(scope.statementId);
    // Averages must come from the same grouping and bank as the period on screen.
    const sameKind = spending?.key === spendingKey && spending.overview.groupBy === (scope.view === "month" ? "MONTH" : "STATEMENT");
    const totals = spending && sameKind ? periodTotals(spending.overview) : [];
    return {
      page,
      buckets,
      breakdowns: typeBreakdowns(page.content, catalog.categories, buckets),
      days: dayCount(bounds.start, bounds.end),
      noun: scope.view === "statement" ? "statement" : "month",
      periodName: scope.view === "month" ? formatMonth(scope.month) : formatPeriod(bounds.start, bounds.end),
      average: averageOfOtherPeriods(totals, periodKey),
      partial: totals.find((entry) => entry.period.key === periodKey)?.period.complete === false,
    };
  }, [catalog, loaded, bucketSize, spending, spendingKey]);

  const refreshing = loaded !== null && loaded.key !== scopeKey;

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800">Spending analytics</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Period breakdown</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            One statement or one month in detail: how spending splits by type, when it happened, and the largest expenses.
          </p>
        </div>
        {stableScope && (
          <Link
            className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            href={`/transactions?${scopeKey}`}
          >
            <ArrowLeftRight aria-hidden="true" className="size-4" />
            View transactions
          </Link>
        )}
      </div>

      {catalogError ? (
        <div className="mt-7"><ErrorState message={catalogError} onRetry={reloadCatalog} /></div>
      ) : !catalog || !resolved || !months ? (
        <div className="mt-7"><LoadingState /></div>
      ) : (
        <>
          <div className="mt-7">
            <TransactionScopeBar
              banks={banks}
              months={months}
              onBankChange={changeBank}
              onScopeChange={goToScope}
              onViewChange={changeView}
              resolved={resolved}
              statements={catalog.statements}
            />
          </div>

          {!stableScope ? (
            <EmptyState />
          ) : loadError ? (
            <div className="mt-5"><ErrorState message={loadError} onRetry={() => setReloadToken((token) => token + 1)} /></div>
          ) : !analysis ? (
            <div className="mt-5"><LoadingState /></div>
          ) : (
            <div aria-busy={refreshing} className={`mt-5 space-y-5 transition-opacity ${refreshing ? "opacity-60" : ""}`}>
              {analysis.page.totalElements > analysis.page.content.length && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
                  These figures cover the newest {analysis.page.content.length} of {analysis.page.totalElements} transactions in
                  this {analysis.noun}.
                </p>
              )}
              <PeriodSummary
                average={analysis.average}
                breakdowns={analysis.breakdowns}
                days={analysis.days}
                noun={analysis.noun}
                partial={analysis.partial}
                periodName={analysis.periodName}
              />
              <SpendingTimeline
                breakdowns={analysis.breakdowns}
                bucketSize={bucketSize}
                buckets={analysis.buckets}
                noun={analysis.noun}
                onBucketSizeChange={setBucketSize}
              />
              <TopExpenses breakdowns={analysis.breakdowns} noun={analysis.noun} />
            </div>
          )}
        </>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="mt-5 grid min-h-72 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
          <ChartColumnStacked aria-hidden="true" className="size-5" />
        </span>
        <h2 className="mt-4 font-semibold text-slate-900">Nothing to break down yet</h2>
        <p className="mt-1 text-sm text-slate-500">Import statements or add transactions to analyze a period.</p>
        <Link className="focus-ring mt-4 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white" href="/upload">
          <Upload aria-hidden="true" className="size-4" />
          Import statements
        </Link>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div aria-label="Loading the breakdown" className="space-y-5">
      <div className="h-48 animate-pulse rounded-2xl bg-slate-200/70" />
      <div className="h-[32rem] animate-pulse rounded-2xl bg-slate-200/70" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center" role="alert">
      <AlertCircle aria-hidden="true" className="size-7 text-red-700" />
      <p className="mt-3 font-semibold text-red-950">Could not load the breakdown</p>
      <p className="mt-1 text-sm text-red-800">{message}</p>
      <button className="focus-ring mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-800 shadow-sm" onClick={onRetry} type="button">
        <RefreshCw aria-hidden="true" className="size-4" /> Retry
      </button>
    </div>
  );
}
