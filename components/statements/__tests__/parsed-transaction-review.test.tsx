import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParsedTransactionReview } from "@/components/statements/parsed-transaction-review";
import { buildReviewRows } from "@/lib/statements/review";
import { categories, parsedTransactions } from "@/test/fixtures";

const rows = buildReviewRows(parsedTransactions, categories);

function renderReview(overrides: Partial<Parameters<typeof ParsedTransactionReview>[0]> = {}) {
  const props = {
    rows,
    categories,
    onIncludedChange: jest.fn(),
    onCategoryChange: jest.fn(),
    ...overrides,
  };
  render(<ParsedTransactionReview {...props} />);
  return props;
}

describe("ParsedTransactionReview", () => {
  it("renders every parsed row in the desktop table", () => {
    renderReview();
    const table = screen.getByTestId("review-table");

    expect(within(table).getAllByText("Harbour Market")).toHaveLength(2);
    expect(within(table).getByText("Transit Pass")).toBeInTheDocument();
  });

  it("flags duplicate rows and leaves clean rows unflagged", () => {
    renderReview();
    const table = screen.getByTestId("review-table");

    expect(within(table).getByTestId(`review-row-${rows[0].id}`)).toHaveAttribute("data-duplicate", "false");
    expect(within(table).getByTestId(`review-row-${rows[1].id}`)).toHaveAttribute("data-duplicate", "true");
    expect(within(table).getByTestId(`review-row-${rows[2].id}`)).toHaveAttribute("data-duplicate", "true");
  });

  it("uses amber accents on flagged rows", () => {
    renderReview();
    const duplicateRow = within(screen.getByTestId("review-table")).getByTestId(`review-row-${rows[1].id}`);

    expect(duplicateRow.className).toContain("amber");
    expect(within(duplicateRow).getByText("Possible duplicate")).toBeInTheDocument();
  });

  it("starts flagged duplicates as skipped and clean rows as importing", () => {
    renderReview();
    const table = screen.getByTestId("review-table");

    expect(within(table).getByTestId(`review-row-${rows[0].id}`)).toHaveAttribute("data-included", "true");
    expect(within(table).getByTestId(`review-row-${rows[1].id}`)).toHaveAttribute("data-included", "false");
  });

  it("offers Import anyway on a skipped duplicate", async () => {
    const user = userEvent.setup();
    const props = renderReview();
    const duplicateRow = within(screen.getByTestId("review-table")).getByTestId(`review-row-${rows[1].id}`);

    await user.click(within(duplicateRow).getByRole("button", { name: /import anyway/i }));

    expect(props.onIncludedChange).toHaveBeenCalledWith(rows[1].id, true);
  });

  it("offers Skip once a duplicate is being imported", async () => {
    const user = userEvent.setup();
    const importedDuplicate = rows.map((row, index) => (index === 1 ? { ...row, included: true } : row));
    const props = renderReview({ rows: importedDuplicate });
    const duplicateRow = within(screen.getByTestId("review-table")).getByTestId(`review-row-${rows[1].id}`);

    expect(within(duplicateRow).getByText("Importing")).toBeInTheDocument();
    await user.click(within(duplicateRow).getByRole("button", { name: /^skip/i }));

    expect(props.onIncludedChange).toHaveBeenCalledWith(rows[1].id, false);
  });

  it("toggles a clean row with its import checkbox", async () => {
    const user = userEvent.setup();
    const props = renderReview();
    const cleanRow = within(screen.getByTestId("review-table")).getByTestId(`review-row-${rows[0].id}`);

    await user.click(within(cleanRow).getByRole("checkbox"));

    expect(props.onIncludedChange).toHaveBeenCalledWith(rows[0].id, false);
  });

  it("overrides a row category from its dropdown", async () => {
    const user = userEvent.setup();
    const props = renderReview();
    const cleanRow = within(screen.getByTestId("review-table")).getByTestId(`review-row-${rows[0].id}`);

    await user.selectOptions(within(cleanRow).getByRole("combobox"), "5");

    expect(props.onCategoryChange).toHaveBeenCalledWith(rows[0].id, "5");
  });

  it("lists every category as an override option", () => {
    renderReview();
    const cleanRow = within(screen.getByTestId("review-table")).getByTestId(`review-row-${rows[0].id}`);

    expect(within(cleanRow).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Groceries",
      "Transportation",
      "Uncategorized",
    ]);
  });

  it("disables the category dropdown on a skipped row", () => {
    renderReview();
    const skippedRow = within(screen.getByTestId("review-table")).getByTestId(`review-row-${rows[1].id}`);

    expect(within(skippedRow).getByRole("combobox")).toBeDisabled();
  });

  it("disables every category dropdown while the batch is saving", () => {
    renderReview({ disabled: true });
    const cleanRow = within(screen.getByTestId("review-table")).getByTestId(`review-row-${rows[0].id}`);

    expect(within(cleanRow).getByRole("combobox")).toBeDisabled();
  });

  it("also renders a touch-friendly card stack for small viewports", () => {
    renderReview();
    const cards = screen.getByTestId("review-cards");

    expect(within(cards).getByTestId(`review-card-${rows[1].id}`)).toHaveAttribute("data-duplicate", "true");
  });
});
