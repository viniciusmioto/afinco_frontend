"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { importStatement, uploadStatement } from "@/lib/api/statements";
import {
  MAX_PARALLEL_PARSES,
  canSave,
  importQueueReducer,
  initialImportQueue,
  orderedItems,
  type ImportQueueAction,
} from "@/lib/statements/import-queue";
import { validateStatementFile } from "@/lib/statements/file-validation";
import { toImportInput } from "@/lib/statements/review";
import type { StatementType } from "@/lib/types/statement";
import type { Category } from "@/lib/types/transaction";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Drives a multi-file statement import: files parse as soon as they are added, at most
 * `MAX_PARALLEL_PARSES` at a time, and reviewed statements save one after another so each save
 * sees the rows the previous one stored.
 */
export function useStatementImport(categories: Category[], defaultAccountId: string) {
  const [state, dispatch] = useReducer(importQueueReducer, initialImportQueue);
  const stateRef = useRef(state);
  stateRef.current = state;
  const referenceRef = useRef({ categories, defaultAccountId });
  referenceRef.current = { categories, defaultAccountId };

  const nextId = useRef(0);
  const started = useRef(new Set<string>());
  const controllers = useRef(new Map<string, AbortController>());

  const addFiles = useCallback((files: File[], statementType: StatementType) => {
    dispatch({
      type: "filesAdded",
      files: files.map((file) => ({
        id: `statement-file-${++nextId.current}`,
        file,
        statementType,
        error: validateStatementFile(file),
      })),
    });
  }, []);

  // Scheduler: start queued files whenever a parsing slot is free.
  useEffect(() => {
    const parsing = state.items.filter((item) => item.status === "parsing").length;
    const waiting = state.items.filter((item) => item.status === "queued" && !started.current.has(item.id));
    for (const item of waiting.slice(0, Math.max(0, MAX_PARALLEL_PARSES - parsing))) {
      started.current.add(item.id);
      const controller = new AbortController();
      controllers.current.set(item.id, controller);
      dispatch({ type: "parseStarted", id: item.id });
      uploadStatement(item.file, item.statementType, controller.signal)
        .then((result) => {
          const { categories: loaded, defaultAccountId: accountId } = referenceRef.current;
          dispatch({ type: "parseSucceeded", id: item.id, result, categories: loaded, accountId });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          dispatch({ type: "parseFailed", id: item.id, error: errorMessage(error, "The statement could not be parsed") });
        })
        .finally(() => controllers.current.delete(item.id));
    }
  }, [state.items]);

  // Reference data can arrive after the first statements finish parsing.
  useEffect(() => {
    dispatch({ type: "defaultsResolved", categories, accountId: defaultAccountId });
  }, [categories, defaultAccountId]);

  useEffect(() => {
    const active = controllers.current;
    return () => active.forEach((controller) => controller.abort());
  }, []);

  const retry = useCallback((id: string) => {
    started.current.delete(id);
    dispatch({ type: "retried", id });
  }, []);

  const remove = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    dispatch({ type: "removed", id });
  }, []);

  const save = useCallback(async (id: string) => {
    const item = stateRef.current.items.find((candidate) => candidate.id === id);
    if (!item?.result || !canSave(item)) return;
    dispatch({ type: "saveStarted", id });
    try {
      const saved = await importStatement(toImportInput(Number(item.accountId), item.result, item.rows));
      dispatch({ type: "saveSucceeded", id, saved });
    } catch (error) {
      dispatch({ type: "saveFailed", id, error: errorMessage(error, "The statement could not be saved") });
    }
  }, []);

  /** Saves oldest statements first, one at a time. */
  const saveAll = useCallback(async () => {
    const ids = orderedItems(stateRef.current.items).filter(canSave).map((item) => item.id);
    for (const id of ids) {
      await save(id);
    }
  }, [save]);

  const update = useCallback((action: ImportQueueAction) => dispatch(action), []);

  return { state, addFiles, retry, remove, save, saveAll, update };
}
