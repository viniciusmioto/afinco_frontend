import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatementUploadPage } from "@/components/statements/statement-upload-page";
import { importStatement, uploadStatement } from "@/lib/api/statements";
import { createAccount, getAccounts, getCategories } from "@/lib/api/transactions";
import type { StatementImportResult, StatementUploadResult } from "@/lib/types/statement";
import { accounts, categories, julyUploadResult, pdfFile, statements, uploadResult } from "@/test/fixtures";

jest.mock("@/lib/api/statements", () => ({ uploadStatement: jest.fn(), importStatement: jest.fn() }));
jest.mock("@/lib/api/transactions", () => ({
  createAccount: jest.fn(),
  getAccounts: jest.fn(),
  getCategories: jest.fn(),
}));

const mockedUpload = jest.mocked(uploadStatement);
const mockedImport = jest.mocked(importStatement);
const mockedAccounts = jest.mocked(getAccounts);
const mockedCategories = jest.mocked(getCategories);
const mockedCreateAccount = jest.mocked(createAccount);

const CLEAN_ROW = `0-${"a".repeat(64)}`;
const DUPLICATE_ROW = `1-${"c".repeat(64)}`;

function imported(statementId: number, savedCount: number, created = true): StatementImportResult {
  return { statement: { ...statements[0], id: statementId }, created, savedCount, duplicateCount: 0 };
}

/** Resolves each upload by file name so tests can control parse order and concurrency. */
function uploadsByName(results: Record<string, StatementUploadResult | Error>) {
  mockedUpload.mockImplementation(async (file) => {
    const result = results[file.name];
    if (result instanceof Error) throw result;
    return result;
  });
}

beforeEach(() => {
  mockedAccounts.mockResolvedValue(accounts);
  mockedCategories.mockResolvedValue(categories);
  uploadsByName({ "september.pdf": uploadResult, "july.pdf": julyUploadResult });
  mockedImport.mockResolvedValue(imported(12, 1));
});

afterEach(() => jest.clearAllMocks());

/** Drops files and lets the mocked uploads settle inside act, as a real browser event loop would. */
async function dropFiles(...files: File[]) {
  const zone = await screen.findByTestId("statement-dropzone");
  await act(async () => {
    fireEvent.drop(zone, { dataTransfer: { files } });
  });
}

function queueItem(name: string) {
  return screen.getByTestId(`queue-item-${name}`);
}

function reviewRow(id: string) {
  return within(screen.getByTestId("review-table")).getByTestId(`review-row-${id}`);
}

describe("StatementUploadPage", () => {
  it("parses every dropped statement without an extra click and reviews the oldest one", async () => {
    render(<StatementUploadPage />);

    await dropFiles(pdfFile("september.pdf", 10), pdfFile("july.pdf", 20));

    await waitFor(() => expect(queueItem("september.pdf")).toHaveAttribute("data-status", "ready"));
    await waitFor(() => expect(queueItem("july.pdf")).toHaveAttribute("data-status", "ready"));
    expect(mockedUpload).toHaveBeenCalledTimes(2);
    expect(mockedUpload.mock.calls.map((call) => call[1])).toEqual(["CREDIT_CARD", "CREDIT_CARD"]);
    expect(within(queueItem("july.pdf")).getByText("Jul 14 – Aug 13, 2026")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Jul 14 – Aug 13, 2026" })).toBeInTheDocument();
    expect(screen.queryByTestId("duplicate-banner")).not.toBeInTheDocument();
  });

  it("keeps the statement the reviewer chose while other files finish parsing", async () => {
    const user = userEvent.setup();
    let finishJuly: () => void = () => {};
    mockedUpload.mockImplementation((file) => file.name === "july.pdf"
      ? new Promise((resolve) => { finishJuly = () => resolve(julyUploadResult); })
      : Promise.resolve(uploadResult));
    render(<StatementUploadPage />);

    await dropFiles(pdfFile("september.pdf", 10), pdfFile("july.pdf", 20));
    await waitFor(() => expect(queueItem("september.pdf")).toHaveAttribute("data-status", "ready"));
    await user.click(screen.getByRole("button", { name: "Review september.pdf" }));
    await act(async () => finishJuly());

    await waitFor(() => expect(queueItem("july.pdf")).toHaveAttribute("data-status", "ready"));
    expect(screen.getByRole("heading", { name: "Aug 14 – Sep 13, 2026" })).toBeInTheDocument();
    expect(screen.getByTestId("duplicate-banner")).toHaveTextContent("2 possible duplicates found");
  });

  it("parses at most two statements at a time", async () => {
    const pending: Array<() => void> = [];
    mockedUpload.mockImplementation((file) => new Promise((resolve) => {
      pending.push(() => resolve({ ...julyUploadResult, periodStart: `2026-0${pending.length}-01`, transactions: [] }));
      void file;
    }));
    render(<StatementUploadPage />);

    await dropFiles(pdfFile("one.pdf", 1), pdfFile("two.pdf", 2), pdfFile("three.pdf", 3));

    await waitFor(() => expect(mockedUpload).toHaveBeenCalledTimes(2));
    expect(queueItem("three.pdf")).toHaveAttribute("data-status", "queued");

    await act(async () => pending[0]());
    await waitFor(() => expect(mockedUpload).toHaveBeenCalledTimes(3));
    expect(mockedUpload.mock.calls[2][0].name).toBe("three.pdf");
  });

  it("keeps a failed file isolated and parses it again on retry", async () => {
    const user = userEvent.setup();
    uploadsByName({ "september.pdf": new Error("The PDF could not be parsed"), "july.pdf": julyUploadResult });
    render(<StatementUploadPage />);

    await dropFiles(pdfFile("september.pdf", 10), pdfFile("july.pdf", 20));

    await waitFor(() => expect(queueItem("september.pdf")).toHaveAttribute("data-status", "failed"));
    expect(within(queueItem("september.pdf")).getByRole("alert")).toHaveTextContent("The PDF could not be parsed");
    await waitFor(() => expect(queueItem("july.pdf")).toHaveAttribute("data-status", "ready"));

    uploadsByName({ "september.pdf": uploadResult });
    await user.click(screen.getByRole("button", { name: "Retry september.pdf" }));

    await waitFor(() => expect(queueItem("september.pdf")).toHaveAttribute("data-status", "ready"));
  });

  it("rejects a non-PDF locally and ignores a file dropped twice", async () => {
    render(<StatementUploadPage />);
    const september = pdfFile("september.pdf", 10);

    await dropFiles(september, new File(["a,b"], "notes.csv", { type: "text/csv" }));
    await dropFiles(september);

    expect(within(queueItem("notes.csv")).getByRole("alert")).toHaveTextContent("Only PDF statements can be uploaded.");
    expect(screen.queryByRole("button", { name: "Retry notes.csv" })).not.toBeInTheDocument();
    await waitFor(() => expect(queueItem("september.pdf")).toHaveAttribute("data-status", "ready"));
    expect(mockedUpload).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId(/^queue-item-/)).toHaveLength(2);
  });

  it("flags rows that also appear in another file and warns about the repeated period", async () => {
    const user = userEvent.setup();
    uploadsByName({
      "september.pdf": uploadResult,
      "september-copy.pdf": {
        ...uploadResult,
        transactions: uploadResult.transactions.map((row) => ({ ...row, duplicate: false })),
      },
    });
    render(<StatementUploadPage />);

    await dropFiles(pdfFile("september.pdf", 10));
    await waitFor(() => expect(queueItem("september.pdf")).toHaveAttribute("data-status", "ready"));
    await dropFiles(pdfFile("september-copy.pdf", 11));
    await waitFor(() => expect(queueItem("september-copy.pdf")).toHaveAttribute("data-status", "ready"));

    expect(within(queueItem("september-copy.pdf")).getByText("Same period as september.pdf")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review september-copy.pdf" }));
    expect(within(reviewRow(CLEAN_ROW)).getByText("Also in september.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save 0 transactions" })).toBeDisabled();
  });

  it("saves the reviewed statement with its period, kept rows, and overrides", async () => {
    const user = userEvent.setup();
    render(<StatementUploadPage />);
    await dropFiles(pdfFile("september.pdf", 10));
    await screen.findByTestId("review-table");

    await user.selectOptions(within(reviewRow(CLEAN_ROW)).getByRole("combobox"), "5");
    await user.click(within(reviewRow(DUPLICATE_ROW)).getByRole("button", { name: /import anyway/i }));
    await user.click(screen.getByRole("button", { name: "Save 2 transactions" }));

    expect(mockedImport).toHaveBeenCalledWith({
      accountId: 4,
      statementType: "CREDIT_CARD",
      periodStart: "2026-08-14",
      periodEnd: "2026-09-13",
      transactions: [
        { categoryId: 5, date: "2026-09-11", amount: 42.35, description: "Harbour Market", forceDuplicate: false },
        { categoryId: 5, date: "2026-09-09", amount: 18.5, description: "Transit Pass", forceDuplicate: true },
      ],
    });
    const outcome = await screen.findByTestId("save-outcome");
    expect(outcome).toHaveTextContent("Saved 1 transaction as a new statement");
    expect(within(outcome).getByRole("link", { name: "View statement" }))
      .toHaveAttribute("href", "/transactions?view=statement&statement=12");
    expect(queueItem("september.pdf")).toHaveAttribute("data-status", "saved");
  });

  it("saves every ready statement one after another", async () => {
    const user = userEvent.setup();
    let active = 0;
    let maxActive = 0;
    mockedImport.mockImplementation(async (input) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return imported(input.periodStart === "2026-07-14" ? 11 : 12, input.transactions.length);
    });
    render(<StatementUploadPage />);

    await dropFiles(pdfFile("september.pdf", 10), pdfFile("july.pdf", 20));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save all ready (2)" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Save all ready (2)" }));

    await waitFor(() => expect(queueItem("july.pdf")).toHaveAttribute("data-status", "saved"));
    await waitFor(() => expect(queueItem("september.pdf")).toHaveAttribute("data-status", "saved"));
    expect(mockedImport.mock.calls.map((call) => call[0].periodStart)).toEqual(["2026-07-14", "2026-08-14"]);
    expect(maxActive).toBe(1);
    expect(within(queueItem("july.pdf")).getByRole("link", { name: "View" }))
      .toHaveAttribute("href", "/transactions?view=statement&statement=11");
  });

  it("creates the first account inline and saves to it", async () => {
    const user = userEvent.setup();
    mockedAccounts.mockResolvedValue([]);
    mockedCreateAccount.mockResolvedValue({ id: 12, bankName: "TD Bank", accountNumberLast4: "7788", currency: "CAD" });
    render(<StatementUploadPage />);
    await dropFiles(pdfFile("september.pdf", 10));
    await screen.findByTestId("review-table");

    expect(screen.getByRole("button", { name: "Save 1 transaction" })).toBeDisabled();
    const form = screen.getByRole("form", { name: "Create account" });
    await user.type(within(form).getByLabelText("Last 4 digits"), "7788");
    await user.click(within(form).getByRole("button", { name: "Create account" }));

    expect(await screen.findByLabelText("Destination account")).toHaveValue("12");
    await user.click(screen.getByRole("button", { name: "Save 1 transaction" }));
    expect(mockedImport.mock.calls[0][0].accountId).toBe(12);
  });

  it("keeps the review open with the error when saving fails", async () => {
    const user = userEvent.setup();
    mockedImport.mockRejectedValue(new Error("Account not found: 4"));
    render(<StatementUploadPage />);
    await dropFiles(pdfFile("september.pdf", 10));
    await screen.findByTestId("review-table");

    await user.click(screen.getByRole("button", { name: "Save 1 transaction" }));

    const saveBar = screen.getByRole("region", { name: "Save statement" });
    expect(await within(saveBar).findByRole("alert")).toHaveTextContent("Account not found: 4");
    expect(screen.getByTestId("review-table")).toBeInTheDocument();
    expect(queueItem("september.pdf")).toHaveAttribute("data-status", "ready");
  });

  it("bulk imports and skips flagged duplicates", async () => {
    const user = userEvent.setup();
    render(<StatementUploadPage />);
    await dropFiles(pdfFile("september.pdf", 10));
    await screen.findByTestId("review-table");

    await user.click(screen.getByRole("button", { name: "Import all duplicates" }));
    expect(screen.getByRole("button", { name: "Save 3 transactions" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Skip all duplicates" }));
    expect(screen.getByRole("button", { name: "Save 1 transaction" })).toBeEnabled();
  });

  it("removes a statement from the queue", async () => {
    const user = userEvent.setup();
    render(<StatementUploadPage />);
    await dropFiles(pdfFile("september.pdf", 10), pdfFile("july.pdf", 20));
    await waitFor(() => expect(queueItem("july.pdf")).toHaveAttribute("data-status", "ready"));

    await user.click(screen.getByRole("button", { name: "Remove july.pdf" }));

    expect(screen.queryByTestId("queue-item-july.pdf")).not.toBeInTheDocument();
  });

  it("reports a reference data failure", async () => {
    mockedAccounts.mockRejectedValue(new Error("The Afinco API is unavailable"));
    render(<StatementUploadPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("The Afinco API is unavailable");
  });
});
