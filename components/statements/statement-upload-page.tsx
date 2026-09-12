"use client";

import { useEffect, useMemo, useState } from "react";
import { getAccounts, getCategories } from "@/lib/api/transactions";
import { orderedItems, selectedItem } from "@/lib/statements/import-queue";
import type { StatementType } from "@/lib/types/statement";
import type { Account, Category } from "@/lib/types/transaction";
import { ImportQueueList } from "./import-queue-list";
import { StatementDropzone } from "./statement-dropzone";
import { StatementReview } from "./statement-review";
import { useStatementImport } from "./use-statement-import";

export function StatementUploadPage() {
  const [statementType, setStatementType] = useState<StatementType>("CREDIT_CARD");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [referenceLoaded, setReferenceLoaded] = useState(false);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getAccounts(controller.signal), getCategories(controller.signal)])
      .then(([loadedAccounts, loadedCategories]) => {
        setAccounts(loadedAccounts);
        setCategories(loadedCategories);
        setReferenceLoaded(true);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setReferenceError(error instanceof Error ? error.message : "Accounts and categories could not be loaded");
      });
    return () => controller.abort();
  }, []);

  const defaultAccountId = accounts[0] ? String(accounts[0].id) : "";
  const { state, addFiles, retry, remove, save, saveAll, update } = useStatementImport(categories, defaultAccountId);
  const items = useMemo(() => orderedItems(state.items), [state.items]);
  const selected = selectedItem(state);
  const anySaving = savingAll || state.items.some((item) => item.status === "saving");

  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      await saveAll();
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800">Statement import</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Upload PDF statements</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Add several statements at once. Each one is parsed in parallel, checked for duplicates against saved
          data and the other files, and saved as its own statement.
        </p>
      </div>

      {referenceError && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {referenceError}
        </p>
      )}

      <div className="mt-6">
        <StatementDropzone
          compact={items.length > 0}
          onFilesSelected={(files) => addFiles(files, statementType)}
          onStatementTypeChange={setStatementType}
          statementType={statementType}
        />
      </div>

      {items.length > 0 && (
        <div className="mt-5">
          <ImportQueueList
            items={items}
            onClearFinished={() => update({ type: "finishedCleared" })}
            onRemove={remove}
            onRetry={retry}
            onSaveAll={() => void handleSaveAll()}
            onSelect={(id) => update({ type: "selected", id })}
            saving={anySaving}
            selectedId={state.selectedId}
          />
        </div>
      )}

      {selected?.result && (
        <StatementReview
          accounts={accounts}
          canCreateAccount={referenceLoaded && accounts.length === 0}
          categories={categories}
          item={{ ...selected, result: selected.result }}
          onAccountCreated={(account) => setAccounts([account])}
          onSave={(id) => void save(id)}
          onUpdate={update}
        />
      )}
    </>
  );
}
