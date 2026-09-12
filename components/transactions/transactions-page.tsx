"use client";

import { AlertCircle, ArrowDownLeft, ArrowUpRight, Plus, ReceiptText, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createTransaction,
  getAccounts,
  getCategories,
  getTransactions,
} from "@/lib/api/transactions";
import { formatCurrency } from "@/lib/formatters";
import type {
  Account,
  Category,
  Transaction,
  TransactionCreateInput,
  TransactionFilters,
} from "@/lib/types/transaction";
import { ManualEntryModal } from "./manual-entry-modal";
import { TransactionFiltersBar } from "./transaction-filters";
import { TransactionList } from "./transaction-list";

const initialFilters: TransactionFilters = { search: "", categoryId: "", startDate: "", endDate: "" };

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadPageData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const [response, loadedAccounts, loadedCategories] = await Promise.all([
        getTransactions(signal),
        getAccounts(signal),
        getCategories(signal),
      ]);
      setTransactions(response.content);
      setTotalElements(response.totalElements);
      setAccounts(loadedAccounts);
      setCategories(loadedCategories);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLoadError(error instanceof Error ? error.message : "Transactions could not be loaded");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadPageData(controller.signal);
    return () => controller.abort();
  }, [loadPageData]);

  const visibleTransactions = useMemo(() => {
    const query = filters.search.trim().toLocaleLowerCase();
    return transactions.filter((transaction) => {
      const matchesSearch = !query || [transaction.description, transaction.account.bankName, transaction.category.name]
        .some((value) => value.toLocaleLowerCase().includes(query));
      const matchesCategory = !filters.categoryId || transaction.category.id === Number(filters.categoryId);
      const matchesStart = !filters.startDate || transaction.date >= filters.startDate;
      const matchesEnd = !filters.endDate || transaction.date <= filters.endDate;
      return matchesSearch && matchesCategory && matchesStart && matchesEnd;
    });
  }, [transactions, filters]);

  const totalAmount = visibleTransactions.reduce(
    (sum, transaction) =>
      sum + (transaction.category.expenseType === "PAYMENT" ? -transaction.amount : transaction.amount),
    0,
  );
  const creditCount = visibleTransactions.filter((transaction) => transaction.type === "CREDIT").length;
  const debitCount = visibleTransactions.length - creditCount;

  const handleCreate = async (input: TransactionCreateInput) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createTransaction(input);
      setModalOpen(false);
      await loadPageData();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "The transaction could not be saved");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800">Activity ledger</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Transactions</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Search, filter, and review your latest account activity.
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

      <section aria-label="Transaction summary" className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard icon={ReceiptText} label="Visible net" value={formatCurrency(totalAmount)} />
        <SummaryCard icon={ArrowUpRight} label="Credits" value={creditCount.toString()} />
        <SummaryCard icon={ArrowDownLeft} label="Debits" value={debitCount.toString()} />
        <SummaryCard icon={ReceiptText} label="Total records" value={totalElements.toLocaleString("en-CA")} />
      </section>

      <div className="mt-5">
        <TransactionFiltersBar categories={categories} onChange={setFilters} value={filters} />
      </div>

      <div className="mt-5">
        {loading ? (
          <LoadingState />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={() => void loadPageData()} />
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between px-1 text-xs font-medium text-slate-500">
              <span>{visibleTransactions.length} visible transaction{visibleTransactions.length === 1 ? "" : "s"}</span>
              {totalElements > transactions.length && <span>Showing latest {transactions.length} of {totalElements}</span>}
            </div>
            <TransactionList transactions={visibleTransactions} />
          </>
        )}
      </div>

      <ManualEntryModal
        accounts={accounts}
        categories={categories}
        error={submitError}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        open={modalOpen}
        submitting={submitting}
      />
    </>
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
