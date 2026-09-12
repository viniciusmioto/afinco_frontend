import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteTransactionDataDialog } from "@/components/workspace/delete-transaction-data-dialog";
import { deleteAllTransactionData, getTransactionDataSummary } from "@/lib/api/transaction-data";

jest.mock("@/lib/api/transaction-data", () => ({
  deleteAllTransactionData: jest.fn(),
  getTransactionDataSummary: jest.fn(),
}));

const mockedSummary = jest.mocked(getTransactionDataSummary);
const mockedDelete = jest.mocked(deleteAllTransactionData);

beforeEach(() => {
  mockedSummary.mockResolvedValue({ transactionCount: 250, statementCount: 7 });
  mockedDelete.mockResolvedValue({ deletedTransactions: 250, deletedStatements: 7 });
});

afterEach(() => jest.clearAllMocks());

function renderDialog() {
  const props = { open: true, onClose: jest.fn(), navigate: jest.fn() };
  render(<DeleteTransactionDataDialog {...props} />);
  return props;
}

describe("DeleteTransactionDataDialog", () => {
  it("asks for confirmation and states exactly what will be deleted", async () => {
    renderDialog();

    const dialog = screen.getByRole("alertdialog", { name: "Are you sure you want to delete all transaction data?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(await screen.findByText(/permanently deletes 250 transactions and 7 imported statements/)).toBeInTheDocument();
    expect(dialog).toHaveAccessibleDescription(/Accounts, categories, and your login are kept/);
  });

  it("makes Cancel the prominent, focused action and Delete data the secondary one", async () => {
    renderDialog();

    const cancel = screen.getByRole("button", { name: "Cancel" });
    const remove = screen.getByRole("button", { name: "Delete data" });
    expect(cancel).toHaveFocus();
    expect(cancel).toHaveAttribute("data-emphasis", "primary");
    expect(remove).toHaveAttribute("data-emphasis", "secondary");
    await waitFor(() => expect(remove).toBeEnabled());
  });

  it("closes without deleting on Cancel or Escape", async () => {
    const user = userEvent.setup();
    const props = renderDialog();
    await screen.findByText(/250 transactions/);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.keyboard("{Escape}");

    expect(props.onClose).toHaveBeenCalledTimes(2);
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it("deletes only after Delete data is pressed and offers to import again", async () => {
    const user = userEvent.setup();
    const props = renderDialog();
    await waitFor(() => expect(screen.getByRole("button", { name: "Delete data" })).toBeEnabled());

    await user.click(screen.getByRole("button", { name: "Delete data" }));

    expect(mockedDelete).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("heading", { name: "Transaction data deleted" })).toBeInTheDocument();
    expect(screen.getByText(/Deleted 250 transactions and 7 statements/)).toBeInTheDocument();
    const importAgain = screen.getByRole("button", { name: "Import statements" });
    expect(importAgain).toHaveFocus();
    await user.click(importAgain);
    expect(props.navigate).toHaveBeenCalledWith("/upload");
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("reloads the current page when closed after deleting", async () => {
    const user = userEvent.setup();
    const props = renderDialog();
    await waitFor(() => expect(screen.getByRole("button", { name: "Delete data" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Delete data" }));

    await user.click(await screen.findByRole("button", { name: "Close" }));

    expect(props.navigate).toHaveBeenCalledWith("/");
  });

  it("keeps the dialog open with the error when deletion fails", async () => {
    const user = userEvent.setup();
    mockedDelete.mockRejectedValue(new Error("The Afinco API is unavailable"));
    renderDialog();
    await waitFor(() => expect(screen.getByRole("button", { name: "Delete data" })).toBeEnabled());

    await user.click(screen.getByRole("button", { name: "Delete data" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The Afinco API is unavailable");
    expect(screen.getByRole("button", { name: "Delete data" })).toBeEnabled();
    expect(screen.getByRole("heading", { name: "Are you sure you want to delete all transaction data?" })).toBeInTheDocument();
  });

  it("disables deletion when there is nothing to delete", async () => {
    mockedSummary.mockResolvedValue({ transactionCount: 0, statementCount: 0 });
    renderDialog();

    expect(await screen.findByText("There is no transaction data to delete.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete data" })).toBeDisabled();
  });

  it("still allows deletion with a general warning when the counts cannot be loaded", async () => {
    mockedSummary.mockRejectedValue(new Error("offline"));
    renderDialog();

    expect(await screen.findByText(/permanently deletes every transaction and imported statement/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete data" })).toBeEnabled();
  });

  it("keeps keyboard focus inside the dialog", async () => {
    const user = userEvent.setup();
    renderDialog();
    await waitFor(() => expect(screen.getByRole("button", { name: "Delete data" })).toBeEnabled());

    await user.tab();
    expect(screen.getByRole("button", { name: "Delete data" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("renders nothing while closed", () => {
    render(<DeleteTransactionDataDialog onClose={jest.fn()} open={false} />);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mockedSummary).not.toHaveBeenCalled();
  });
});
