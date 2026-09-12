import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionsPage } from "@/components/transactions/transactions-page";
import { getStatements } from "@/lib/api/statements";
import {
  createTransaction,
  getAccounts,
  getCategories,
  getTransactionMonths,
  getTransactions,
} from "@/lib/api/transactions";
import type { PageResponse, Transaction } from "@/lib/types/transaction";
import { accounts, categories, months, statements, transactions } from "@/test/fixtures";
import { currentMockSearch, mockRouter, setMockSearch } from "@/test/next-navigation";

jest.mock("next/navigation", () => jest.requireActual("@/test/next-navigation"));
jest.mock("@/lib/api/statements", () => ({ getStatements: jest.fn() }));
jest.mock("@/lib/api/transactions", () => ({
  getTransactions: jest.fn(),
  getTransactionMonths: jest.fn(),
  getAccounts: jest.fn(),
  getCategories: jest.fn(),
  createTransaction: jest.fn(),
}));

const mockedGetTransactions = jest.mocked(getTransactions);
const mockedGetMonths = jest.mocked(getTransactionMonths);
const mockedGetStatements = jest.mocked(getStatements);
const mockedGetAccounts = jest.mocked(getAccounts);
const mockedGetCategories = jest.mocked(getCategories);
const mockedCreateTransaction = jest.mocked(createTransaction);

function pageOf(content: Transaction[]): PageResponse<Transaction> {
  return { content, page: 0, size: 500, totalElements: content.length, totalPages: 1, first: true, last: true };
}

beforeEach(() => {
  setMockSearch("");
  mockedGetTransactions.mockResolvedValue(pageOf(transactions));
  mockedGetMonths.mockResolvedValue(months);
  mockedGetStatements.mockResolvedValue(statements);
  mockedGetAccounts.mockResolvedValue(accounts);
  mockedGetCategories.mockResolvedValue(categories);
  mockedCreateTransaction.mockResolvedValue(transactions[1]);
});

afterEach(() => jest.clearAllMocks());

async function renderPage() {
  render(<TransactionsPage />);
  return screen.findByTestId("transaction-table");
}

describe("TransactionsPage", () => {
  it("opens the newest statement by default and records it in the URL", async () => {
    await renderPage();

    expect(mockedGetTransactions).toHaveBeenLastCalledWith({ view: "statement", statementId: 12 }, expect.any(AbortSignal));
    expect(currentMockSearch()).toBe("view=statement&statement=12");
    expect(screen.getByRole("button", { name: "By statement" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("combobox", { name: "Statement" })).toHaveValue("12");
    expect(screen.getByText("In this statement")).toBeInTheDocument();
    expect(within(screen.getByTestId("transaction-table")).queryByRole("columnheader", { name: "Statement" }))
      .not.toBeInTheDocument();
  });

  it("never requests transactions without a statement or month scope", async () => {
    await renderPage();

    for (const [scope] of mockedGetTransactions.mock.calls) {
      expect(scope).toEqual(expect.objectContaining({ view: expect.stringMatching(/statement|month/) }));
    }
  });

  it("steps to the older statement", async () => {
    const user = userEvent.setup();
    await renderPage();

    expect(screen.getByRole("button", { name: "Newer statement" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Older statement" }));

    await waitFor(() =>
      expect(mockedGetTransactions).toHaveBeenLastCalledWith({ view: "statement", statementId: 11 }, expect.any(AbortSignal)));
    expect(currentMockSearch()).toBe("view=statement&statement=11");
    expect(screen.getByRole("button", { name: "Older statement" })).toBeDisabled();
  });

  it("switches to the month the selected statement ends in and shows each row's source", async () => {
    const user = userEvent.setup();
    setMockSearch("view=statement&statement=11");
    await renderPage();

    await user.click(screen.getByRole("button", { name: "By month" }));

    await waitFor(() =>
      expect(mockedGetTransactions).toHaveBeenLastCalledWith({ view: "month", month: "2026-08" }, expect.any(AbortSignal)));
    expect(currentMockSearch()).toBe("view=month&month=2026-08");
    expect(await screen.findByRole("columnheader", { name: "Statement" })).toBeInTheDocument();
    const table = screen.getByTestId("transaction-table");
    expect(within(table).getByText("Statement Aug 14 – Sep 13, 2026")).toBeInTheDocument();
    expect(within(table).getByText("Manual entry")).toBeInTheDocument();
    expect(screen.getByText("In this month")).toBeInTheDocument();
  });

  it("picks a month from the selector", async () => {
    const user = userEvent.setup();
    setMockSearch("view=month&month=2026-09");
    await renderPage();

    await user.selectOptions(screen.getByRole("combobox", { name: "Month" }), "2026-07");

    await waitFor(() =>
      expect(mockedGetTransactions).toHaveBeenLastCalledWith({ view: "month", month: "2026-07" }, expect.any(AbortSignal)));
    expect(screen.getByRole("option", { name: "July 2026 · 14 transactions" })).toBeInTheDocument();
  });

  it("falls back to the newest statement when the URL names an unknown one", async () => {
    setMockSearch("view=statement&statement=999");
    await renderPage();

    expect(mockedGetTransactions).toHaveBeenLastCalledWith({ view: "statement", statementId: 12 }, expect.any(AbortSignal));
    expect(mockRouter.replace).toHaveBeenCalledWith("/transactions?view=statement&statement=12", { scroll: false });
  });

  it("opens by month when only manual transactions exist", async () => {
    mockedGetStatements.mockResolvedValue([]);
    await renderPage();

    expect(mockedGetTransactions).toHaveBeenLastCalledWith({ view: "month", month: "2026-09" }, expect.any(AbortSignal));
  });

  it("explains an empty ledger instead of loading every transaction", async () => {
    mockedGetStatements.mockResolvedValue([]);
    mockedGetMonths.mockResolvedValue([]);
    render(<TransactionsPage />);

    expect(await screen.findByRole("heading", { name: "No transactions yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Import statements" })).toHaveAttribute("href", "/upload");
    expect(mockedGetTransactions).not.toHaveBeenCalled();
  });

  it("filters the selected statement by search", async () => {
    const user = userEvent.setup();
    const table = await renderPage();

    await user.type(screen.getByRole("searchbox", { name: "Search transactions" }), "harbour");

    expect(within(table).getByText("Harbour Market")).toBeInTheDocument();
    expect(within(table).queryByText("Monthly payroll")).not.toBeInTheDocument();
    expect(screen.getByText("1 visible transaction")).toBeInTheDocument();
  });

  it("shows a manual entry's month after creating it", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("button", { name: "Add transaction" }));
    expect(screen.getByLabelText("Account")).toHaveValue("4");
    await user.type(screen.getByLabelText("Description"), "Transit pass");
    await user.clear(screen.getByLabelText("Date"));
    await user.type(screen.getByLabelText("Date"), "2026-08-20");
    await user.type(screen.getByLabelText("Amount (CAD)"), "52.00");
    await user.click(screen.getByRole("button", { name: "Save transaction" }));

    await waitFor(() => expect(mockedCreateTransaction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(currentMockSearch()).toBe("view=month&month=2026-08"));
    await waitFor(() =>
      expect(mockedGetTransactions).toHaveBeenLastCalledWith({ view: "month", month: "2026-08" }, expect.any(AbortSignal)));
    await waitFor(() => expect(mockedGetMonths).toHaveBeenCalledTimes(2));
  });

  it("subtracts payment categories from the visible net amount", async () => {
    mockedGetTransactions.mockResolvedValue(pageOf([{
      ...transactions[0],
      amount: 40,
      category: categories.find((category) => category.name === "Payment")!,
    }]));

    render(<TransactionsPage />);

    expect(await screen.findByText("-$40.00")).toBeInTheDocument();
  });
});
