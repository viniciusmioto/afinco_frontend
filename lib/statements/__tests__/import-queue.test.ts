import {
  canSave,
  countItems,
  importQueueReducer,
  initialImportQueue,
  orderedItems,
  type ImportQueueAction,
  type ImportQueueState,
} from "@/lib/statements/import-queue";
import type { StatementImportResult } from "@/lib/types/statement";
import { categories, julyUploadResult, pdfFile, statements, uploadResult } from "@/test/fixtures";

const september = pdfFile("september.pdf", 2048);
const july = pdfFile("july.pdf", 4096);

function run(...actions: ImportQueueAction[]): ImportQueueState {
  return actions.reduce(importQueueReducer, initialImportQueue);
}

const added: ImportQueueAction = {
  type: "filesAdded",
  files: [
    { id: "a", file: september, statementType: "CREDIT_CARD", error: null },
    { id: "b", file: july, statementType: "CREDIT_CARD", error: null },
  ],
};

const savedResult: StatementImportResult = { statement: statements[0], created: true, savedCount: 1, duplicateCount: 0 };

describe("importQueueReducer", () => {
  it("queues valid files, fails invalid ones locally, and ignores a file picked twice", () => {
    const state = run(added, {
      type: "filesAdded",
      files: [
        { id: "c", file: september, statementType: "CREDIT_CARD", error: null },
        { id: "d", file: pdfFile("notes.txt"), statementType: "CREDIT_CARD", error: "Only PDF statements can be uploaded." },
      ],
    });

    expect(state.items.map((item) => [item.id, item.status])).toEqual([
      ["a", "queued"],
      ["b", "queued"],
      ["d", "failed"],
    ]);
    expect(state.items[2]).toMatchObject({ retryable: false, error: "Only PDF statements can be uploaded." });
  });

  it("builds review rows, applies the default account, and selects the first parsed statement", () => {
    const state = run(
      added,
      { type: "parseStarted", id: "a" },
      { type: "parseSucceeded", id: "a", result: uploadResult, categories, accountId: "4" },
    );

    expect(state.selectedId).toBe("a");
    expect(state.items[0]).toMatchObject({ status: "ready", accountId: "4", samePeriodAs: null });
    expect(state.items[0].rows.map((row) => row.included)).toEqual([true, false, false]);
  });

  it("follows the oldest parsed statement until the reviewer picks one", () => {
    const followed = run(
      added,
      { type: "parseStarted", id: "a" },
      { type: "parseStarted", id: "b" },
      { type: "parseSucceeded", id: "a", result: uploadResult, categories, accountId: "4" },
      { type: "parseSucceeded", id: "b", result: julyUploadResult, categories, accountId: "4" },
    );
    expect(followed.selectedId).toBe("b");

    const pinned = run(
      added,
      { type: "parseStarted", id: "a" },
      { type: "parseSucceeded", id: "a", result: uploadResult, categories, accountId: "4" },
      { type: "selected", id: "a" },
      { type: "parseStarted", id: "b" },
      { type: "parseSucceeded", id: "b", result: julyUploadResult, categories, accountId: "4" },
    );
    expect(pinned.selectedId).toBe("a");
  });

  it("flags rows that another parsed file already contains and warns about an identical period", () => {
    const copy = pdfFile("september-copy.pdf", 999);
    const state = run(
      added,
      { type: "parseStarted", id: "a" },
      { type: "parseSucceeded", id: "a", result: uploadResult, categories, accountId: "4" },
      { type: "filesAdded", files: [{ id: "c", file: copy, statementType: "CREDIT_CARD", error: null }] },
      { type: "parseStarted", id: "c" },
      {
        type: "parseSucceeded",
        id: "c",
        result: { ...uploadResult, transactions: uploadResult.transactions.map((row) => ({ ...row, duplicate: false })) },
        categories,
        accountId: "4",
      },
    );

    const secondCopy = state.items.find((item) => item.id === "c")!;
    expect(secondCopy.samePeriodAs).toBe("september.pdf");
    expect(secondCopy.rows.every((row) => row.duplicate && !row.included)).toBe(true);
    expect(secondCopy.rows[0].duplicateOf).toBe("september.pdf");
    expect(state.selectedId).toBe("a");
  });

  it("ignores a parse result for a file removed while it was parsing", () => {
    const state = run(
      added,
      { type: "parseStarted", id: "a" },
      { type: "removed", id: "a" },
      { type: "parseSucceeded", id: "a", result: uploadResult, categories, accountId: "4" },
    );

    expect(state.items.map((item) => item.id)).toEqual(["b"]);
    expect(state.selectedId).toBeNull();
  });

  it("requeues a failed upload on retry but never a locally rejected file", () => {
    const state = run(
      added,
      { type: "filesAdded", files: [{ id: "d", file: pdfFile("big.pdf", 1), statementType: "CREDIT_CARD", error: "Too big" }] },
      { type: "parseStarted", id: "a" },
      { type: "parseFailed", id: "a", error: "The PDF could not be parsed" },
      { type: "retried", id: "a" },
      { type: "retried", id: "d" },
    );

    expect(state.items.find((item) => item.id === "a")).toMatchObject({ status: "queued", error: null });
    expect(state.items.find((item) => item.id === "d")).toMatchObject({ status: "failed" });
  });

  it("edits rows only while a statement is ready and returns a failed save to review", () => {
    const parsed = run(
      added,
      { type: "parseStarted", id: "a" },
      { type: "parseSucceeded", id: "a", result: uploadResult, categories, accountId: "4" },
    );
    const rowId = parsed.items[0].rows[1].id;

    const saving = run(...[
      added,
      { type: "parseStarted", id: "a" } as const,
      { type: "parseSucceeded", id: "a", result: uploadResult, categories, accountId: "4" } as const,
      { type: "saveStarted", id: "a" } as const,
      { type: "rowIncluded", id: "a", rowId, included: true } as const,
    ]);
    expect(saving.items[0].rows[1].included).toBe(false);

    const failed = importQueueReducer(saving, { type: "saveFailed", id: "a", error: "Account not found: 4" });
    expect(failed.items[0]).toMatchObject({ status: "ready", error: "Account not found: 4" });
    expect(importQueueReducer(failed, { type: "rowIncluded", id: "a", rowId, included: true }).items[0].rows[1].included)
      .toBe(true);
  });

  it("backfills categories and the account once reference data arrives", () => {
    const state = run(
      added,
      { type: "parseStarted", id: "a" },
      { type: "parseSucceeded", id: "a", result: uploadResult, categories: [], accountId: "" },
      { type: "defaultsResolved", categories, accountId: "4" },
    );

    expect(state.items[0].accountId).toBe("4");
    expect(state.items[0].rows.map((row) => row.categoryId)).toEqual(["9", "5", "9"]);
  });

  it("clears saved statements and locally rejected files but keeps pending work", () => {
    const state = run(
      added,
      { type: "filesAdded", files: [{ id: "d", file: pdfFile("notes.txt"), statementType: "CREDIT_CARD", error: "Only PDF" }] },
      { type: "parseStarted", id: "a" },
      { type: "parseSucceeded", id: "a", result: uploadResult, categories, accountId: "4" },
      { type: "saveStarted", id: "a" },
      { type: "saveSucceeded", id: "a", saved: savedResult },
      { type: "finishedCleared" },
    );

    expect(state.items.map((item) => item.id)).toEqual(["b"]);
    expect(state.selectedId).toBeNull();
  });
});

describe("queue selectors", () => {
  it("orders parsed statements chronologically before files still pending", () => {
    const state = run(
      added,
      { type: "filesAdded", files: [{ id: "c", file: pdfFile("pending.pdf", 7), statementType: "CREDIT_CARD", error: null }] },
      { type: "parseStarted", id: "a" },
      { type: "parseStarted", id: "b" },
      { type: "parseSucceeded", id: "a", result: uploadResult, categories, accountId: "4" },
      { type: "parseSucceeded", id: "b", result: julyUploadResult, categories, accountId: "4" },
    );

    expect(orderedItems(state.items).map((item) => item.file.name)).toEqual(["july.pdf", "september.pdf", "pending.pdf"]);
  });

  it("counts statuses and what can be saved", () => {
    const state = run(
      added,
      { type: "parseStarted", id: "a" },
      { type: "parseSucceeded", id: "a", result: uploadResult, categories, accountId: "4" },
    );

    expect(canSave(state.items[0])).toBe(true);
    expect(canSave({ ...state.items[0], accountId: "" })).toBe(false);
    expect(countItems(state.items)).toEqual({ total: 2, pending: 1, ready: 1, failed: 0, saved: 0, saveable: 1 });
  });
});
