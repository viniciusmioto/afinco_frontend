import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatementUploadPage } from "@/components/statements/statement-upload-page";
import { uploadStatement } from "@/lib/api/statements";
import { createTransactionBatch, getAccounts, getCategories } from "@/lib/api/transactions";
import { accounts, categories, parsedTransactions, pdfFile, uploadResult } from "@/test/fixtures";

jest.mock("@/lib/api/statements", () => ({ uploadStatement: jest.fn() }));
jest.mock("@/lib/api/transactions", () => ({
  createTransactionBatch: jest.fn(),
  getAccounts: jest.fn(),
  getCategories: jest.fn(),
}));

const mockedUpload = jest.mocked(uploadStatement);
const mockedBatch = jest.mocked(createTransactionBatch);
const mockedAccounts = jest.mocked(getAccounts);
const mockedCategories = jest.mocked(getCategories);

const CLEAN_ROW = `0-${"a".repeat(64)}`;
const DUPLICATE_ROW = `1-${"c".repeat(64)}`;

beforeEach(() => {
  mockedAccounts.mockResolvedValue(accounts);
  mockedCategories.mockResolvedValue(categories);
  mockedUpload.mockResolvedValue(uploadResult);
  mockedBatch.mockResolvedValue({ savedCount: 1, duplicateCount: 0, transactions: [] });
});

afterEach(() => jest.clearAllMocks());

/** Attaches a PDF, runs the mocked upload, and waits for the review table. */
async function uploadFixtureStatement(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByTestId("statement-dropzone");
  fireEvent.drop(screen.getByTestId("statement-dropzone"), { dataTransfer: { files: [pdfFile()] } });
  await user.click(screen.getByRole("button", { name: "Review transactions" }));
  return screen.findByTestId("review-table");
}

function desktopRow(id: string) {
  return within(screen.getByTestId("review-table")).getByTestId(`review-row-${id}`);
}

describe("StatementUploadPage", () => {
  it("loads the destination account and category options on mount", async () => {
    render(<StatementUploadPage />);

    await waitFor(() => expect(mockedAccounts).toHaveBeenCalledTimes(1));
    expect(mockedCategories).toHaveBeenCalledTimes(1);
  });

  it("offers the loaded account as the batch destination once rows are under review", async () => {
    const user = userEvent.setup();
    render(<StatementUploadPage />);
    await uploadFixtureStatement(user);

    const destination = screen.getByLabelText("Destination account");
    expect(destination).toHaveValue("4");
    expect(within(destination).getByRole("option")).toHaveTextContent("TD Bank •••• 2048");
  });

  it("uploads the dropped statement with the selected statement type", async () => {
    const user = userEvent.setup();
    render(<StatementUploadPage />);
    await uploadFixtureStatement(user);

    expect(mockedUpload).toHaveBeenCalledTimes(1);
    expect(mockedUpload.mock.calls[0][1]).toBe("CREDIT_CARD");
  });

  it("renders the parsed rows and the duplicate summary", async () => {
    const user = userEvent.setup();
    render(<StatementUploadPage />);
    await uploadFixtureStatement(user);

    expect(screen.getByTestId("duplicate-banner")).toHaveTextContent("2 possible duplicates found");
    expect(screen.getByRole("button", { name: "Save 1 transaction" })).toBeEnabled();
    expect(within(desktopRow(CLEAN_ROW)).getByRole("combobox")).toHaveValue("9");
    expect(within(desktopRow(DUPLICATE_ROW)).getByRole("combobox")).toHaveValue("5");
  });

  it("surfaces a parsing failure and keeps the dropzone visible", async () => {
    const user = userEvent.setup();
    mockedUpload.mockRejectedValue(new Error("The statement format is not supported"));
    render(<StatementUploadPage />);

    await screen.findByTestId("statement-dropzone");
    fireEvent.drop(screen.getByTestId("statement-dropzone"), { dataTransfer: { files: [pdfFile()] } });
    await user.click(screen.getByRole("button", { name: "Review transactions" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The statement format is not supported");
    expect(screen.queryByTestId("review-table")).not.toBeInTheDocument();
  });

  it("sends only the kept rows to the batch endpoint", async () => {
    const user = userEvent.setup();
    render(<StatementUploadPage />);
    await uploadFixtureStatement(user);

    await user.click(screen.getByRole("button", { name: "Save 1 transaction" }));

    await waitFor(() => expect(mockedBatch).toHaveBeenCalledTimes(1));
    expect(mockedBatch).toHaveBeenCalledWith({
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

  it("adds a force-imported duplicate to the payload", async () => {
    const user = userEvent.setup();
    render(<StatementUploadPage />);
    await uploadFixtureStatement(user);

    await user.click(within(desktopRow(DUPLICATE_ROW)).getByRole("button", { name: /import anyway/i }));
    await user.click(screen.getByRole("button", { name: "Save 2 transactions" }));

    await waitFor(() => expect(mockedBatch).toHaveBeenCalledTimes(1));
    const payload = mockedBatch.mock.calls[0][0];
    expect(payload.transactions).toHaveLength(2);
    expect(payload.transactions[1]).toMatchObject({
      description: "Transit Pass",
      forceDuplicate: true,
    });
  });

  it("keeps a duplicate out of the payload after it is skipped again", async () => {
    const user = userEvent.setup();
    render(<StatementUploadPage />);
    await uploadFixtureStatement(user);

    await user.click(within(desktopRow(DUPLICATE_ROW)).getByRole("button", { name: /import anyway/i }));
    await user.click(within(desktopRow(DUPLICATE_ROW)).getByRole("button", { name: /^skip/i }));
    await user.click(screen.getByRole("button", { name: "Save 1 transaction" }));

    await waitFor(() => expect(mockedBatch).toHaveBeenCalledTimes(1));
    expect(mockedBatch.mock.calls[0][0].transactions).toHaveLength(1);
  });

  it("bulk imports every flagged duplicate", async () => {
    const user = userEvent.setup();
    render(<StatementUploadPage />);
    await uploadFixtureStatement(user);

    await user.click(screen.getByRole("button", { name: "Import all duplicates" }));
    await user.click(screen.getByRole("button", { name: "Save 3 transactions" }));

    await waitFor(() => expect(mockedBatch).toHaveBeenCalledTimes(1));
    const payload = mockedBatch.mock.calls[0][0];
    expect(payload.transactions).toHaveLength(3);
    expect(payload.transactions.filter((item) => item.forceDuplicate)).toHaveLength(2);
  });

  it("bulk skips duplicates again", async () => {
    const user = userEvent.setup();
    render(<StatementUploadPage />);
    await uploadFixtureStatement(user);

    await user.click(screen.getByRole("button", { name: "Import all duplicates" }));
    await user.click(screen.getByRole("button", { name: "Skip all duplicates" }));

    expect(screen.getByRole("button", { name: "Save 1 transaction" })).toBeInTheDocument();
  });

  it("sends the category override chosen before saving", async () => {
    const user = userEvent.setup();
    render(<StatementUploadPage />);
    await uploadFixtureStatement(user);

    await user.selectOptions(within(desktopRow(CLEAN_ROW)).getByRole("combobox"), "5");
    await user.click(screen.getByRole("button", { name: "Save 1 transaction" }));

    await waitFor(() => expect(mockedBatch).toHaveBeenCalledTimes(1));
    expect(mockedBatch.mock.calls[0][0].transactions[0].categoryId).toBe(5);
  });

  it("reports the save outcome and returns to the dropzone", async () => {
    const user = userEvent.setup();
    mockedBatch.mockResolvedValue({ savedCount: 2, duplicateCount: 1, transactions: [] });
    render(<StatementUploadPage />);
    await uploadFixtureStatement(user);

    await user.click(screen.getByRole("button", { name: "Save 1 transaction" }));

    const outcome = await screen.findByTestId("save-outcome");
    expect(outcome).toHaveTextContent("Saved 2 transactions");
    expect(outcome).toHaveTextContent("1 still await duplicate resolution");
    expect(screen.getByTestId("statement-dropzone")).toBeInTheDocument();
  });

  it("keeps the review table when the batch save fails", async () => {
    const user = userEvent.setup();
    mockedBatch.mockRejectedValue(new Error("The Afinco API is unavailable"));
    render(<StatementUploadPage />);
    await uploadFixtureStatement(user);

    await user.click(screen.getByRole("button", { name: "Save 1 transaction" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The Afinco API is unavailable");
    expect(screen.getByTestId("review-table")).toBeInTheDocument();
  });

  it("blocks saving when every row is skipped", async () => {
    const user = userEvent.setup();
    render(<StatementUploadPage />);
    await uploadFixtureStatement(user);

    await user.click(within(desktopRow(CLEAN_ROW)).getByRole("checkbox"));

    expect(screen.getByRole("button", { name: "Save 0 transactions" })).toBeDisabled();
  });

  it("blocks saving and explains why when no account exists", async () => {
    const user = userEvent.setup();
    mockedAccounts.mockResolvedValue([]);
    render(<StatementUploadPage />);
    await uploadFixtureStatement(user);

    expect(screen.getByText(/no account exists yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save 1 transaction" })).toBeDisabled();
  });

  it("discards the review when the reviewer starts over", async () => {
    const user = userEvent.setup();
    render(<StatementUploadPage />);
    await uploadFixtureStatement(user);

    await user.click(screen.getByRole("button", { name: "Start over" }));

    expect(screen.queryByTestId("review-table")).not.toBeInTheDocument();
    expect(screen.getByTestId("statement-dropzone")).toBeInTheDocument();
  });

  it("reports a reference data failure", async () => {
    mockedAccounts.mockRejectedValue(new Error("The Afinco API is unavailable"));
    render(<StatementUploadPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("The Afinco API is unavailable");
  });

  it("backfills categories that resolve after the upload finishes", async () => {
    const user = userEvent.setup();
    let releaseCategories: (value: typeof categories) => void = () => {};
    mockedCategories.mockReturnValue(new Promise((resolve) => { releaseCategories = resolve; }));
    render(<StatementUploadPage />);

    await screen.findByTestId("statement-dropzone");
    fireEvent.drop(screen.getByTestId("statement-dropzone"), { dataTransfer: { files: [pdfFile()] } });
    await user.click(screen.getByRole("button", { name: "Review transactions" }));
    await screen.findByTestId("review-table");

    releaseCategories(categories);

    await waitFor(() =>
      expect(within(desktopRow(CLEAN_ROW)).getByRole("combobox")).toHaveValue("9"),
    );
    expect(parsedTransactions[0].description).toBe("Harbour Market");
  });
});
