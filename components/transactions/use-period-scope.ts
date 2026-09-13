"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getStatements } from "@/lib/api/statements";
import { getAccounts, getCategories, getTransactionMonths } from "@/lib/api/transactions";
import { distinctBanks } from "@/lib/banks";
import {
  readRequestedScope,
  resolveBank,
  resolveScope,
  scopeFromKey,
  scopeKey,
  scopeToSearch,
  switchBank,
  switchView,
  type RequestedScope,
  type ResolvedScope,
  type TransactionScope,
  type TransactionView,
} from "@/lib/transactions/scope";
import type { Statement } from "@/lib/types/statement";
import type { Account, Category, TransactionMonth } from "@/lib/types/transaction";

export interface PeriodCatalog {
  accounts: Account[];
  categories: Category[];
  /** Newest period first. */
  statements: Statement[];
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * The one statement or month a page shows, its bank, and the reference data needed to choose them, all
 * kept in the URL (`view`, `statement`, `month`, `bank`) so refreshes and links reopen the same period.
 * Shared by the ledger and the period breakdown, so both select periods the same way.
 */
export function usePeriodScope(loadErrorMessage: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = useMemo(() => readRequestedScope(searchParams), [searchParams]);

  const [catalog, setCatalog] = useState<PeriodCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogVersion, setCatalogVersion] = useState(0);
  // Months of the bank in view. While another bank's months load, the previous list keeps the page in place.
  const [months, setMonths] = useState<TransactionMonth[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogError(null);
    Promise.all([getAccounts(controller.signal), getCategories(controller.signal), getStatements(controller.signal)])
      .then(([accounts, categories, statements]) => setCatalog({ accounts, categories, statements }))
      .catch((error: unknown) => {
        if (!isAbort(error)) setCatalogError(error instanceof Error ? error.message : loadErrorMessage);
      });
    return () => controller.abort();
  }, [catalogVersion, loadErrorMessage]);

  const banks = useMemo(() => (catalog ? distinctBanks(catalog.accounts) : []), [catalog]);
  const bank = catalog ? resolveBank(requested, catalog.statements, banks) : null;

  // The month list depends on the bank, which is known from the URL and the statements alone.
  useEffect(() => {
    if (!catalog) return;
    const controller = new AbortController();
    getTransactionMonths(bank, controller.signal)
      .then(setMonths)
      .catch((error: unknown) => {
        if (!isAbort(error)) setCatalogError(error instanceof Error ? error.message : loadErrorMessage);
      });
    return () => controller.abort();
  }, [catalog, bank, loadErrorMessage]);

  const resolved: ResolvedScope | null = useMemo(
    () => (catalog && months ? resolveScope(requested, catalog.statements, months, banks) : null),
    [catalog, months, requested, banks],
  );
  const currentKey = scopeKey(resolved?.scope ?? null);

  const navigate = useCallback(
    (search: string) => router.replace(`${pathname}?${search}`, { scroll: false }),
    [pathname, router],
  );

  const navigateTo = (next: RequestedScope) => {
    if (!catalog) return;
    const target = resolveScope(next, catalog.statements, months ?? [], banks);
    const search = target.scope
      ? scopeToSearch(target.scope)
      : new URLSearchParams({ view: next.view ?? "statement", ...(next.bank ? { bank: next.bank } : {}) }).toString();
    navigate(search);
  };

  // Keep the URL canonical so a refresh or shared link reopens the same statement or month.
  useEffect(() => {
    if (resolved?.scope && searchParams.toString() !== currentKey) navigate(currentKey);
  }, [resolved, currentKey, searchParams, navigate]);

  return {
    catalog,
    catalogError,
    reloadCatalog: () => setCatalogVersion((version) => version + 1),
    banks,
    months,
    resolved,
    /** Stable string identity of the resolved scope, for effect dependencies. */
    scopeKey: currentKey,
    /** The resolved scope rebuilt from `scopeKey`, so it only changes when the period changes. */
    stableScope: useMemo(() => scopeFromKey(currentKey), [currentKey]),
    goToScope: (scope: TransactionScope) => navigate(scopeToSearch(scope)),
    changeView: (view: TransactionView) => {
      if (catalog && months && resolved && view !== resolved.view) {
        navigateTo(switchView(resolved, view, catalog.statements, months));
      }
    },
    changeBank: (nextBank: string | null) => {
      if (resolved) navigateTo(switchBank(resolved, nextBank));
    },
  };
}
