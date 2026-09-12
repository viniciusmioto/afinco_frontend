import {
  buildReviewRows,
  defaultCategoryId,
  hasCompleteCategories,
  setAllDuplicatesIncluded,
  setRowCategory,
  setRowIncluded,
  summarize,
  toBatchInput,
} from "@/lib/statements/review";
import { categories, parsedTransactions } from "@/test/fixtures";

describe("defaultCategoryId", () => {
  it("prefers the seeded Occasional fallback", () => {
    expect(defaultCategoryId(categories)).toBe("9");
  });

  it("falls back to the first category when Occasional is absent", () => {
    expect(defaultCategoryId(categories.slice(0, 2))).toBe("2");
  });

  it("returns an empty selection when no category exists", () => {
    expect(defaultCategoryId([])).toBe("");
  });
});

describe("buildReviewRows", () => {
  it("keeps clean rows and skips flagged duplicates by default", () => {
    const rows = buildReviewRows(parsedTransactions, categories);

    expect(rows.map((row) => row.included)).toEqual([true, false, false]);
    expect(rows.map((row) => row.categoryId)).toEqual(["9", "5", "9"]);
  });

  it("falls back to Occasional when a suggested category is unavailable", () => {
    const parsed = [{ ...parsedTransactions[0], categoryName: "Missing category" }];

    expect(buildReviewRows(parsed, categories)[0].categoryId).toBe("9");
  });

  it("gives repeated rows distinct keys even though they share a signature", () => {
    const rows = buildReviewRows(parsedTransactions, categories);

    expect(rows[0].parsed.hashSignature).toBe(rows[2].parsed.hashSignature);
    expect(new Set(rows.map((row) => row.id)).size).toBe(3);
  });
});

describe("duplicate toggle state", () => {
  it("imports a single flagged row without touching its siblings", () => {
    const rows = buildReviewRows(parsedTransactions, categories);
    const toggled = setRowIncluded(rows, rows[1].id, true);

    expect(toggled.map((row) => row.included)).toEqual([true, true, false]);
    expect(rows.map((row) => row.included)).toEqual([true, false, false]);
  });

  it("skips a row that was previously imported", () => {
    const rows = buildReviewRows(parsedTransactions, categories);
    const skipped = setRowIncluded(rows, rows[0].id, false);

    expect(skipped[0].included).toBe(false);
  });

  it("bulk toggles only the flagged duplicates", () => {
    const rows = buildReviewRows(parsedTransactions, categories);

    expect(setAllDuplicatesIncluded(rows, true).map((row) => row.included)).toEqual([true, true, true]);
    expect(setAllDuplicatesIncluded(rows, false).map((row) => row.included)).toEqual([true, false, false]);
  });

  it("leaves a clean row untouched when bulk skipping duplicates", () => {
    const rows = setAllDuplicatesIncluded(buildReviewRows(parsedTransactions, categories), false);

    expect(rows[0].included).toBe(true);
  });
});

describe("setRowCategory", () => {
  it("overrides one row's category", () => {
    const rows = buildReviewRows(parsedTransactions, categories);
    const updated = setRowCategory(rows, rows[0].id, "2");

    expect(updated[0].categoryId).toBe("2");
    expect(updated[1].categoryId).toBe("5");
  });
});

describe("summarize", () => {
  it("counts kept, skipped, and resolved duplicate rows", () => {
    const rows = buildReviewRows(parsedTransactions, categories);

    expect(summarize(rows)).toEqual({
      totalCount: 3,
      includedCount: 1,
      skippedCount: 2,
      duplicateCount: 2,
      resolvedDuplicateCount: 0,
      unresolvedDuplicateCount: 2,
      includedTotal: 42.35,
    });
  });

  it("tracks duplicates the reviewer chose to import", () => {
    const rows = setAllDuplicatesIncluded(buildReviewRows(parsedTransactions, categories), true);
    const summary = summarize(rows);

    expect(summary.includedCount).toBe(3);
    expect(summary.resolvedDuplicateCount).toBe(2);
    expect(summary.unresolvedDuplicateCount).toBe(0);
    expect(summary.includedTotal).toBeCloseTo(103.2);
  });

  it("subtracts payments from the net import total while keeping their stored amount positive", () => {
    const payment = {
      ...parsedTransactions[0],
      amount: 25,
      description: "PAYMENT - THANK YOU",
      expenseType: "PAYMENT" as const,
      categoryName: "Payment",
    };
    const rows = buildReviewRows([parsedTransactions[0], payment], categories);

    expect(summarize(rows).includedTotal).toBe(17.35);
    expect(toBatchInput(4, rows).transactions[1]).toMatchObject({ amount: 25, categoryId: 10 });
  });
});

describe("toBatchInput", () => {
  it("drops skipped rows from the payload", () => {
    const rows = buildReviewRows(parsedTransactions, categories);

    expect(toBatchInput(4, rows)).toEqual({
      accountId: 4,
      transactions: [
        {
          categoryId: 9,
          date: "2026-09-11",
          amount: 42.35,
          type: "CREDIT",
          description: "Harbour Market",
          hashSignature: "a".repeat(64),
          forceDuplicate: false,
        },
      ],
    });
  });

  it("marks an imported duplicate with forceDuplicate", () => {
    const rows = setRowIncluded(buildReviewRows(parsedTransactions, categories), `1-${"c".repeat(64)}`, true);
    const payload = toBatchInput(4, rows);

    expect(payload.transactions).toHaveLength(2);
    expect(payload.transactions[1]).toEqual({
      categoryId: 5,
      date: "2026-09-09",
      amount: 18.5,
      type: "CREDIT",
      description: "Transit Pass",
      hashSignature: "c".repeat(64),
      forceDuplicate: true,
    });
  });

  it("sends the per-row category override rather than the default", () => {
    const rows = setRowCategory(buildReviewRows(parsedTransactions, categories), `0-${"a".repeat(64)}`, "5");

    expect(toBatchInput(4, rows).transactions[0].categoryId).toBe(5);
  });

  it("produces an empty transaction list when everything is skipped", () => {
    const rows = buildReviewRows(parsedTransactions, categories).map((row) => ({ ...row, included: false }));

    expect(toBatchInput(4, rows).transactions).toEqual([]);
  });
});

describe("hasCompleteCategories", () => {
  it("ignores skipped rows that never received a category", () => {
    const rows = buildReviewRows(parsedTransactions, []).map((row, index) =>
      index === 0 ? { ...row, categoryId: "2" } : row,
    );

    expect(hasCompleteCategories(rows)).toBe(true);
  });

  it("fails when a kept row has no category", () => {
    expect(hasCompleteCategories(buildReviewRows(parsedTransactions, []))).toBe(false);
  });
});
