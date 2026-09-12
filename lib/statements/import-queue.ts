import {
  backfillCategories,
  buildReviewRows,
  hasCompleteCategories,
  setAllDuplicatesIncluded,
  setRowCategory,
  setRowIncluded,
  summarize,
  type ReviewRow,
} from "@/lib/statements/review";
import type { StatementImportResult, StatementType, StatementUploadResult } from "@/lib/types/statement";
import type { Category } from "@/lib/types/transaction";

/** Parsing is CPU-bound on the backend; two at a time keeps a batch fast without starving other requests. */
export const MAX_PARALLEL_PARSES = 2;

export type ImportStatus = "queued" | "parsing" | "ready" | "failed" | "saving" | "saved";

export interface ImportItem {
  id: string;
  file: File;
  statementType: StatementType;
  status: ImportStatus;
  error: string | null;
  /** False for files rejected locally (wrong type, too large), where retrying cannot help. */
  retryable: boolean;
  result: StatementUploadResult | null;
  rows: ReviewRow[];
  accountId: string;
  saved: StatementImportResult | null;
  /** File name of another queued statement covering exactly the same period. */
  samePeriodAs: string | null;
}

export interface ImportQueueState {
  items: ImportItem[];
  selectedId: string | null;
  /** Until the reviewer picks a statement, the review follows the oldest parsed one. */
  selectionPinned: boolean;
}

export interface QueuedFile {
  id: string;
  file: File;
  statementType: StatementType;
  /** Local validation problem, if any. */
  error: string | null;
}

export type ImportQueueAction =
  | { type: "filesAdded"; files: QueuedFile[] }
  | { type: "parseStarted"; id: string }
  | { type: "parseSucceeded"; id: string; result: StatementUploadResult; categories: Category[]; accountId: string }
  | { type: "parseFailed"; id: string; error: string }
  | { type: "retried"; id: string }
  | { type: "removed"; id: string }
  | { type: "selected"; id: string }
  | { type: "rowIncluded"; id: string; rowId: string; included: boolean }
  | { type: "rowCategoryChanged"; id: string; rowId: string; categoryId: string }
  | { type: "duplicatesIncluded"; id: string; included: boolean }
  | { type: "accountChanged"; id: string; accountId: string }
  | { type: "defaultsResolved"; categories: Category[]; accountId: string }
  | { type: "saveStarted"; id: string }
  | { type: "saveSucceeded"; id: string; saved: StatementImportResult }
  | { type: "saveFailed"; id: string; error: string }
  | { type: "finishedCleared" };

export const initialImportQueue: ImportQueueState = { items: [], selectedId: null, selectionPinned: false };

const PARSED_STATUSES: ReadonlySet<ImportStatus> = new Set(["ready", "saving", "saved"]);

/** Same name, size, and modification time means the user picked the same file twice. */
function sameFile(left: File, right: File) {
  return left.name === right.name && left.size === right.size && left.lastModified === right.lastModified;
}

function isParsed(item: ImportItem): item is ImportItem & { result: StatementUploadResult } {
  return item.result !== null && PARSED_STATUSES.has(item.status);
}

function oldestParsedId(items: ImportItem[]): string | null {
  return orderedItems(items).find(isParsed)?.id ?? null;
}

function updateItem(state: ImportQueueState, id: string, update: (item: ImportItem) => ImportItem): ImportQueueState {
  return { ...state, items: state.items.map((item) => (item.id === id ? update(item) : item)) };
}

/** Editing is only possible while a parsed statement is waiting to be saved. */
function updateReviewRows(state: ImportQueueState, id: string, update: (rows: ReviewRow[]) => ReviewRow[]) {
  return updateItem(state, id, (item) => (item.status === "ready" ? { ...item, rows: update(item.rows) } : item));
}

function signaturesOfOtherFiles(items: ImportItem[], id: string): Map<string, string> {
  const signatures = new Map<string, string>();
  for (const item of items) {
    if (item.id === id || !isParsed(item)) continue;
    for (const transaction of item.result.transactions) {
      if (!signatures.has(transaction.hashSignature)) signatures.set(transaction.hashSignature, item.file.name);
    }
  }
  return signatures;
}

function samePeriodFile(items: ImportItem[], id: string, result: StatementUploadResult): string | null {
  const match = items.find((item) =>
    item.id !== id
    && isParsed(item)
    && item.result.statementType === result.statementType
    && item.result.periodStart === result.periodStart
    && item.result.periodEnd === result.periodEnd);
  return match?.file.name ?? null;
}

export function importQueueReducer(state: ImportQueueState, action: ImportQueueAction): ImportQueueState {
  switch (action.type) {
    case "filesAdded": {
      const added: ImportItem[] = [];
      for (const queued of action.files) {
        const alreadyQueued = [...state.items, ...added].some((item) => sameFile(item.file, queued.file));
        if (alreadyQueued) continue;
        added.push({
          id: queued.id,
          file: queued.file,
          statementType: queued.statementType,
          status: queued.error ? "failed" : "queued",
          error: queued.error,
          retryable: !queued.error,
          result: null,
          rows: [],
          accountId: "",
          saved: null,
          samePeriodAs: null,
        });
      }
      return added.length === 0 ? state : { ...state, items: [...state.items, ...added] };
    }
    case "parseStarted":
      return updateItem(state, action.id, (item) => ({ ...item, status: "parsing", error: null }));
    case "parseSucceeded": {
      const target = state.items.find((item) => item.id === action.id);
      if (!target || target.status !== "parsing") return state;
      const rows = buildReviewRows(
        action.result.transactions,
        action.categories,
        signaturesOfOtherFiles(state.items, action.id),
      );
      const next = updateItem(state, action.id, (item) => ({
        ...item,
        status: "ready",
        result: action.result,
        rows,
        accountId: item.accountId || action.accountId,
        samePeriodAs: samePeriodFile(state.items, action.id, action.result),
      }));
      return state.selectionPinned ? next : { ...next, selectedId: oldestParsedId(next.items) };
    }
    case "parseFailed":
      return updateItem(state, action.id, (item) =>
        item.status === "parsing" ? { ...item, status: "failed", error: action.error } : item);
    case "retried":
      return updateItem(state, action.id, (item) =>
        item.status === "failed" && item.retryable ? { ...item, status: "queued", error: null } : item);
    case "removed": {
      const items = state.items.filter((item) => item.id !== action.id || item.status === "saving");
      if (items.length === state.items.length) return state;
      if (state.selectedId !== action.id) return { ...state, items };
      return { items, selectedId: oldestParsedId(items), selectionPinned: false };
    }
    case "selected":
      return state.items.some((item) => item.id === action.id && isParsed(item))
        ? { ...state, selectedId: action.id, selectionPinned: true }
        : state;
    case "rowIncluded":
      return updateReviewRows(state, action.id, (rows) => setRowIncluded(rows, action.rowId, action.included));
    case "rowCategoryChanged":
      return updateReviewRows(state, action.id, (rows) => setRowCategory(rows, action.rowId, action.categoryId));
    case "duplicatesIncluded":
      return updateReviewRows(state, action.id, (rows) => setAllDuplicatesIncluded(rows, action.included));
    case "accountChanged":
      return updateItem(state, action.id, (item) =>
        item.status === "ready" ? { ...item, accountId: action.accountId } : item);
    case "defaultsResolved":
      return {
        ...state,
        items: state.items.map((item) => ({
          ...item,
          rows: backfillCategories(item.rows, action.categories),
          accountId: item.accountId || action.accountId,
        })),
      };
    case "saveStarted":
      return updateItem(state, action.id, (item) => ({ ...item, status: "saving", error: null }));
    case "saveSucceeded":
      return updateItem(state, action.id, (item) => ({ ...item, status: "saved", saved: action.saved }));
    case "saveFailed":
      return updateItem(state, action.id, (item) => ({ ...item, status: "ready", error: action.error }));
    case "finishedCleared": {
      const items = state.items.filter((item) => item.status !== "saved" && !(item.status === "failed" && !item.retryable));
      if (items.some((item) => item.id === state.selectedId)) return { ...state, items };
      return { items, selectedId: oldestParsedId(items), selectionPinned: false };
    }
  }
}

/**
 * Parsed statements in chronological order (ties keep the order they were added), followed by files
 * still waiting or failed, in the order added.
 */
export function orderedItems(items: ImportItem[]): ImportItem[] {
  const parsed = items.filter(isParsed).sort((left, right) =>
    left.result.periodStart.localeCompare(right.result.periodStart));
  return [...parsed, ...items.filter((item) => !isParsed(item))];
}

export function canSave(item: ImportItem): boolean {
  return item.status === "ready"
    && Boolean(item.accountId)
    && summarize(item.rows).includedCount > 0
    && hasCompleteCategories(item.rows);
}

export function selectedItem(state: ImportQueueState): ImportItem | null {
  return state.items.find((item) => item.id === state.selectedId) ?? null;
}

export interface QueueCounts {
  total: number;
  pending: number;
  ready: number;
  failed: number;
  saved: number;
  saveable: number;
}

export function countItems(items: ImportItem[]): QueueCounts {
  return {
    total: items.length,
    pending: items.filter((item) => item.status === "queued" || item.status === "parsing").length,
    ready: items.filter((item) => item.status === "ready" || item.status === "saving").length,
    failed: items.filter((item) => item.status === "failed").length,
    saved: items.filter((item) => item.status === "saved").length,
    saveable: items.filter(canSave).length,
  };
}
