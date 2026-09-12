import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionsPage } from "@/components/transactions/transactions-page";
import {
  createTransaction,
  getAccounts,
  getCategories,
  getTransactions,
} from "@/lib/api/transactions";
import { accounts, categories, transactions } from "@/test/fixtures";

jest.mock("@/lib/api/transactions", () => ({
  getTransactions: jest.fn(),
  getAccounts: jest.fn(),
  getCategories: jest.fn(),
  createTransaction: jest.fn(),
}));

const mockedGetTransactions = jest.mocked(getTransactions);
const mockedGetAccounts = jest.mocked(getAccounts);
const mockedGetCategories = jest.mocked(getCategories);
const mockedCreateTransaction = jest.mocked(createTransaction);

beforeEach(() => {
  mockedGetTransactions.mockResolvedValue({
    content: transactions,
    page: 0,
    size: 100,
    totalElements: 2,
    totalPages: 1,
    first: true,
    last: true,
  });
  mockedCreateTransaction.mockResolvedValue(transactions[0]);
  mockedGetAccounts.mockResolvedValue(accounts);
  mockedGetCategories.mockResolvedValue(categories);
});

afterEach(() => jest.clearAllMocks());

describe("TransactionsPage", () => {
  it("loads transactions and filters them by search", async () => {
    const user = userEvent.setup();
    render(<TransactionsPage />);

    const table = await screen.findByTestId("transaction-table");
    expect(within(table).getByText("Harbour Market")).toBeInTheDocument();
    expect(within(table).getByText("Monthly payroll")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "Search transactions" }), "harbour");

    expect(within(table).getByText("Harbour Market")).toBeInTheDocument();
    expect(within(table).queryByText("Monthly payroll")).not.toBeInTheDocument();
    expect(screen.getByText("1 visible transaction")).toBeInTheDocument();
  });

  it("opens the manual modal and creates an entry", async () => {
    const user = userEvent.setup();
    render(<TransactionsPage />);
    await screen.findByTestId("transaction-table");

    await user.click(screen.getByRole("button", { name: "Add transaction" }));
    await user.type(screen.getByLabelText("Description"), "Transit pass");
    await user.type(screen.getByLabelText("Amount (CAD)"), "52.00");
    await user.click(screen.getByRole("button", { name: "Save transaction" }));

    await waitFor(() => expect(mockedCreateTransaction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedGetTransactions).toHaveBeenCalledTimes(2));
  });

  it("uses reference endpoints when the ledger has no transactions yet", async () => {
    const user = userEvent.setup();
    mockedGetTransactions.mockResolvedValue({
      content: [],
      page: 0,
      size: 100,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    });
    render(<TransactionsPage />);
    await screen.findByText("No transactions found");

    await user.click(screen.getByRole("button", { name: "Add transaction" }));

    expect(screen.getByLabelText("Account")).toHaveValue("4");
    expect(screen.getByLabelText("Category")).toHaveValue("9");
    await user.type(screen.getByLabelText("Description"), "First transaction");
    await user.type(screen.getByLabelText("Amount (CAD)"), "10.00");
    expect(screen.getByRole("button", { name: "Save transaction" })).toBeEnabled();
  });

  it("subtracts payment categories from the visible net amount", async () => {
    mockedGetTransactions.mockResolvedValue({
      content: [{
        ...transactions[0],
        amount: 40,
        category: categories.find((category) => category.name === "Payment")!,
      }],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true,
    });

    render(<TransactionsPage />);

    expect(await screen.findByText("-$40.00")).toBeInTheDocument();
  });
});
