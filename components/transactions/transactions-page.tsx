"use client";

import { AlertCircle, ArrowDownLeft, ChartColumnStacked, CreditCard, Inbox, Landmark, Plus, RefreshCw, Upload, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useState, type ComponentProps } from "react";
import { createTransaction, getTransactions } from "@/lib/api/transactions";
import { formatCurrency, formatMonth, formatPeriod } from "@/lib/formatters";
import { monthOf, type TransactionScope, type TransactionView } from "@/lib/transactions/scope";
import { ofType, paymentTotal, spentTotal } from "@/lib/transactions/summary";
import type { Statement } from "@/lib/types/statement";
import type {
  PageResponse,
  Transaction,
  TransactionCreateInput,
  TransactionFilters,
  TransactionType,
} from "@/lib/types/transaction";
import { ManualEntryModal } from "./manual-entry-modal";
import { TransactionFiltersBar } from "./transaction-filters";
import { TransactionList } from "./transaction-list";
import { TransactionScopeBar } from "./transaction-scope-bar";
import { usePeriodScope } from "./use-period-scope";

const initialFilters: TransactionFilters = { search: "", categoryId: "" };

const sections: Record<TransactionType, { title: string; description: string; icon: LucideIcon }> = {
  CREDIT: { title: "Credit", description: "Credit card transactions", icon: CreditCard },
  DEBIT: { title: "Debit", description: "Debit card and checking account transactions", icon: Landmark },
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function transactionCount(count: number) {
  return `${count.toLocaleString("en-CA")} transaction${count === 1 ? "" : "s"}`;
}

export function TransactionsPage() {
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
  } = usePeriodScope("Transactions could not be loaded");

  const [page, setPage] = useState<PageResponse<Transaction> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [filters, setFilters] = useState(initialFilters);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!stableScope) {
      setPage(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    getTransactions(stableScope, controller.signal)
      .then(setPage)
      .catch((error: unknown) => {
        if (!isAbort(error)) setLoadError(errorMessage(error, "Transactions could not be loaded"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [stableScope, reloadToken]);

  const transactions = useMemo(() => page?.content ?? [], [page]);
  const visibleTransactions = useMemo(() => {
    const query = filters.search.trim().toLocaleLowerCase();
    return transactions.filter((transaction) => {
      const matchesSearch = !query || [transaction.description, transaction.account.bankName, transaction.category.name]
        .some((value) => value.toLocaleLowerCase().includes(query));
      const matchesCategory = !filters.categoryId || transaction.category.id === Number(filters.categoryId);
      return matchesSearch && matchesCategory;
    });
  }, [transactions, filters]);

  const visibleCredit = ofType(visibleTransactions, "CREDIT");
  const visibleDebit = ofType(visibleTransactions, "DEBIT");
  const payments = paymentTotal(visibleTransactions);

  const handleCreate = async (input: TransactionCreateInput) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createTransaction(input);
      setModalOpen(false);
      // Manual entries have no statement, so show the month they belong to, keeping the bank when it matches.
      const accountBank = catalog?.accounts.find((account) => account.id === input.accountId)?.bankName ?? null;
      goToScope({ view: "month", month: monthOf(input.date), bank: resolved?.bank === accountBank ? accountBank : null });
      reloadCatalog();
      setReloadToken((token) => token + 1);
    } catch (error) {
      setSubmitError(errorMessage(error, "The transaction could not be saved"));
    } finally {
      setSubmitting(false);
    }
  };

  const view = resolved?.view ?? "statement";
  const scope = resolved?.scope ?? null;
  const statement = scope?.view === "statement"
    ? catalog?.statements.find((candidate) => candidate.id === scope.statementId) ?? null
    : null;
  const scopeName = scopeLabel(scope, statement);
  // A statement holds a single account type; a month can hold both.
  const sectionTypes: TransactionType[] = statement
    ? [statement.statementType === "CHECKING_ACCOUNT" ? "DEBIT" : "CREDIT"]
    : ["CREDIT", "DEBIT"];

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800">Activity ledger</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Transactions</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Review one statement or one calendar month at a time.
          </p>
        </div>
        <div className="flex flex-col gap-2 min-[420px]:flex-row">
          {stableScope && (
            <Link
              className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              href={`/breakdown?${scopeKey}`}
            >
              <ChartColumnStacked aria-hidden="true" className="size-4" />
              Break down this period
            </Link>
          )}
          <button
            className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            onClick={() => { setSubmitError(null); setModalOpen(true); }}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add transaction
          </button>
        </div>
      </div>

      {catalogError ? (
        <div className="mt-7">
          <ErrorState message={catalogError} onRetry={reloadCatalog} />
        </div>
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

          {scope ? (
            <>
              <section aria-label="Transaction summary" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SummaryCard
                  detail={payments > 0 ? `${formatCurrency(payments)} in payments not counted` : `In ${scopeName}`}
                  icon={Wallet}
                  label="Total spent"
                  value={formatCurrency(spentTotal(visibleTransactions))}
                />
                <SummaryCard
                  detail={`${formatCurrency(spentTotal(visibleCredit))} spent`}
                  icon={CreditCard}
                  label="Credit"
                  value={transactionCount(visibleCredit.length)}
                />
                <SummaryCard
                  detail={`${formatCurrency(spentTotal(visibleDebit))} spent`}
                  icon={ArrowDownLeft}
                  label="Debit"
                  value={transactionCount(visibleDebit.length)}
                />
              </section>

              <div className="mt-5">
                <TransactionFiltersBar categories={catalog.categories} onChange={setFilters} value={filters} />
              </div>

              <div className="mt-5">
                {loadError ? (
                  <ErrorState message={loadError} onRetry={() => setReloadToken((token) => token + 1)} />
                ) : loading || !page ? (
                  <LoadingState />
                ) : (
                  <>
                    <div className="mb-4 flex items-center justify-between px-1 text-xs font-medium text-slate-500">
                      <span>{visibleTransactions.length} visible transaction{visibleTransactions.length === 1 ? "" : "s"}</span>
                      {page.totalElements > transactions.length && (
                        <span>Showing the latest {transactions.length} of {page.totalElements}</span>
                      )}
                    </div>
                    <div className="space-y-8">
                      {sectionTypes.map((type) => (
                        <TransactionSection
                          emptyMessage={ofType(transactions, type).length === 0
                            ? `No ${sections[type].title.toLowerCase()} transactions in ${scopeName}.`
                            : `No ${sections[type].title.toLowerCase()} transactions match your filters.`}
                          key={type}
                          label={`${sections[type].title} transactions`}
                          showBank={view === "month" && !resolved.bank}
                          showSource={view === "month"}
                          transactions={type === "CREDIT" ? visibleCredit : visibleDebit}
                          type={type}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <EmptyScope
              hasMonths={months.length > 0}
              onViewByMonth={() => changeView("month")}
              view={view}
            />
          )}
        </>
      )}

      <ManualEntryModal
        accounts={catalog?.accounts ?? []}
        categories={catalog?.categories ?? []}
        error={submitError}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        open={modalOpen}
        submitting={submitting}
      />
    </>
  );
}

/** `this statement (Jul 14 – Aug 13, 2026)` or `July 2026`, for sentences. */
function scopeLabel(scope: TransactionScope | null, statement: Statement | null) {
  if (scope?.view === "month") return formatMonth(scope.month);
  return statement ? `the ${formatPeriod(statement.periodStart, statement.periodEnd)} statement` : "this statement";
}

function TransactionSection({
  type,
  transactions,
  ...listProps
}: { type: TransactionType } & ComponentProps<typeof TransactionList>) {
  const headingId = useId();
  const { title, description, icon: Icon } = sections[type];
  return (
    <section aria-labelledby={headingId} data-testid={`${type.toLowerCase()}-transactions`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 px-1">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-600">
            <Icon aria-hidden="true" className="size-4" />
          </span>
          <div>
            <h2 className="font-semibold tracking-tight text-slate-950" id={headingId}>{title}</h2>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(spentTotal(transactions))}</span> spent
          {" · "}{transactionCount(transactions.length)}
        </p>
      </div>
      <TransactionList {...listProps} transactions={transactions} />
    </section>
  );
}

function EmptyScope({
  view,
  hasMonths,
  onViewByMonth,
}: {
  view: TransactionView;
  hasMonths: boolean;
  onViewByMonth: () => void;
}) {
  const statementsOnly = view === "statement" && hasMonths;
  return (
    <div className="mt-5 grid min-h-72 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
          <Inbox aria-hidden="true" className="size-5" />
        </span>
        <h2 className="mt-4 font-semibold text-slate-900">
          {statementsOnly ? "No imported statements yet" : "No transactions yet"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {statementsOnly
            ? "Your manual entries are available by month."
            : "Import your first statements or add a manual entry."}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white"
            href="/upload"
          >
            <Upload aria-hidden="true" className="size-4" />
            Import statements
          </Link>
          {statementsOnly && (
            <button
              className="focus-ring rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              onClick={onViewByMonth}
              type="button"
            >
              View by month
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
          <p className="mt-2 truncate text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{value}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div aria-label="Loading transactions" className="space-y-3">
      {[0, 1, 2, 3].map((item) => <div className="h-20 animate-pulse rounded-2xl bg-slate-200/70" key={item} />)}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center" role="alert">
      <AlertCircle aria-hidden="true" className="size-7 text-red-700" />
      <p className="mt-3 font-semibold text-red-950">Could not load transactions</p>
      <p className="mt-1 text-sm text-red-800">{message}</p>
      <button className="focus-ring mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-800 shadow-sm" onClick={onRetry} type="button">
        <RefreshCw aria-hidden="true" className="size-4" /> Retry
      </button>
    </div>
  );
}
