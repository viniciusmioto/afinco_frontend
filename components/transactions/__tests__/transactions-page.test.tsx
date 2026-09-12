import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionsPage } from "@/components/transactions/transactions-page";
import { createTransaction, getTransactions } from "@/lib/api/transactions";
import { transactions } from "@/test/fixtures";

jest.mock("@/lib/api/transactions", () => ({
  getTransactions: jest.fn(),
  createTransaction: jest.fn(),
}));

const mockedGetTransactions = jest.mocked(getTransactions);
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
});
