"use client";

import { AlertCircle, ArrowDownLeft, ArrowUpRight, Inbox, Plus, ReceiptText, RefreshCw, Upload } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getStatements } from "@/lib/api/statements";
import {
  createTransaction,
  getAccounts,
  getCategories,
  getTransactionMonths,
  getTransactions,
} from "@/lib/api/transactions";
import { formatCurrency } from "@/lib/formatters";
import {
  monthOf,
  readRequestedScope,
  resolveScope,
  scopeFromKey,
  scopeKey,
  scopeToSearch,
  switchView,
  type TransactionScope,
  type TransactionView,
} from "@/lib/transactions/scope";
import type { Statement } from "@/lib/types/statement";
import type {
  Account,
  Category,
  PageResponse,
  Transaction,
  TransactionCreateInput,
  TransactionFilters,
  TransactionMonth,
} from "@/lib/types/transaction";
import { ManualEntryModal } from "./manual-entry-modal";
import { TransactionFiltersBar } from "./transaction-filters";
import { TransactionList } from "./transaction-list";
import { TransactionScopeBar } from "./transaction-scope-bar";

interface Catalog {
  accounts: Account[];
  categories: Category[];
  statements: Statement[];
  months: TransactionMonth[];
}

const initialFilters: TransactionFilters = { search: "", categoryId: "" };

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function TransactionsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = useMemo(() => readRequestedScope(searchParams), [searchParams]);

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogVersion, setCatalogVersion] = useState(0);

  const [page, setPage] = useState<PageResponse<Transaction> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [filters, setFilters] = useState(initialFilters);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogError(null);
    Promise.all([
      getAccounts(controller.signal),
      getCategories(controller.signal),
      getStatements(controller.signal),
      getTransactionMonths(controller.signal),
    ])
      .then(([accounts, categories, statements, months]) => setCatalog({ accounts, categories, statements, months }))
      .catch((error: unknown) => {
        if (!isAbort(error)) setCatalogError(errorMessage(error, "Transactions could not be loaded"));
      });
    return () => controller.abort();
  }, [catalogVersion]);

  const resolved = useMemo(
    () => (catalog ? resolveScope(requested, catalog.statements, catalog.months) : null),
    [catalog, requested],
  );
  const currentKey = scopeKey(resolved?.scope ?? null);

  const navigate = useCallback(
    (search: string) => router.replace(`${pathname}?${search}`, { scroll: false }),
    [pathname, router],
  );

  // Keep the URL canonical so a refresh or shared link reopens the same statement or month.
  useEffect(() => {
    if (resolved?.scope && searchParams.toString() !== currentKey) navigate(currentKey);
  }, [resolved, currentKey, searchParams, navigate]);

  useEffect(() => {
    const scope = scopeFromKey(currentKey);
    if (!scope) {
      setPage(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    getTransactions(scope, controller.signal)
      .then(setPage)
      .catch((error: unknown) => {
        if (!isAbort(error)) setLoadError(errorMessage(error, "Transactions could not be loaded"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [currentKey, reloadToken]);

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

  const totalAmount = visibleTransactions.reduce(
    (sum, transaction) =>
      sum + (transaction.category.expenseType === "PAYMENT" ? -transaction.amount : transaction.amount),
    0,
  );
  const creditCount = visibleTransactions.filter((transaction) => transaction.type === "CREDIT").length;
  const debitCount = visibleTransactions.length - creditCount;

  const changeView = (view: TransactionView) => {
    if (!catalog || !resolved || view === resolved.view) return;
    const next = resolveScope(
      switchView(resolved.scope, view, catalog.statements, catalog.months),
      catalog.statements,
      catalog.months,
    );
    navigate(next.scope ? scopeToSearch(next.scope) : `view=${view}`);
  };

  const changeScope = (scope: TransactionScope) => navigate(scopeToSearch(scope));

  const handleCreate = async (input: TransactionCreateInput) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createTransaction(input);
      setModalOpen(false);
      // Manual entries have no statement, so show the month they belong to.
      navigate(scopeToSearch({ view: "month", month: monthOf(input.date) }));
      setCatalogVersion((version) => version + 1);
      setReloadToken((token) => token + 1);
    } catch (error) {
      setSubmitError(errorMessage(error, "The transaction could not be saved"));
    } finally {
      setSubmitting(false);
    }
  };

  const view = resolved?.view ?? "statement";
  const scopeNoun = view === "statement" ? "statement" : "month";

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
        <button
          className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800"
          onClick={() => { setSubmitError(null); setModalOpen(true); }}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add transaction
        </button>
      </div>

      {catalogError ? (
        <div className="mt-7">
          <ErrorState message={catalogError} onRetry={() => setCatalogVersion((version) => version + 1)} />
        </div>
      ) : !catalog || !resolved ? (
        <div className="mt-7"><LoadingState /></div>
      ) : (
        <>
          <div className="mt-7">
            <TransactionScopeBar
              months={catalog.months}
              onScopeChange={changeScope}
              onViewChange={changeView}
              scope={resolved.scope}
              statements={catalog.statements}
              view={view}
            />
          </div>

          {resolved.scope ? (
            <>
              <section aria-label="Transaction summary" className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <SummaryCard icon={ReceiptText} label="Visible net" value={formatCurrency(totalAmount)} />
                <SummaryCard icon={ArrowUpRight} label="Credits" value={creditCount.toString()} />
                <SummaryCard icon={ArrowDownLeft} label="Debits" value={debitCount.toString()} />
                <SummaryCard
                  icon={ReceiptText}
                  label={`In this ${scopeNoun}`}
                  value={(page?.totalElements ?? 0).toLocaleString("en-CA")}
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
                    <div className="mb-3 flex items-center justify-between px-1 text-xs font-medium text-slate-500">
                      <span>{visibleTransactions.length} visible transaction{visibleTransactions.length === 1 ? "" : "s"}</span>
                      {page.totalElements > transactions.length && (
                        <span>Showing the latest {transactions.length} of {page.totalElements}</span>
                      )}
                    </div>
                    <TransactionList
                      emptyMessage={`No transactions match your filters in this ${scopeNoun}.`}
                      showSource={view === "month"}
                      transactions={visibleTransactions}
                    />
                  </>
                )}
              </div>
            </>
          ) : (
            <EmptyScope
              hasMonths={catalog.months.length > 0}
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
}: {
  icon: typeof ReceiptText;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
          <p className="mt-2 truncate text-xl font-bold tabular-nums tracking-tight text-slate-950 sm:text-2xl">{value}</p>
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
